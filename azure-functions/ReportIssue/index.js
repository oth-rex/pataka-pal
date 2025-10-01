
// ReportIssue - Azure Function (HTTP POST) - Complete file
// - Accepts JSON or multipart/form-data (with optional photo)
// - Stores Issue in SQL (schema-aligned to PatakaPalDB dump)
// - Uploads photo to Blob Storage and includes both a link and an attachment in email
// - Notifies kaitiaki via Azure Communication Services (Email)

const { IncomingForm } = require('formidable');
const { BlobServiceClient } = require('@azure/storage-blob');
const { EmailClient } = require('@azure/communication-email');
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const okJson = (ctx, status, body) => { ctx.res = { status, headers: { 'Content-Type': 'application/json' }, body }; };
const fail   = (ctx, status, message) => okJson(ctx, status, { ok: false, error: message });

module.exports = async function (context, req) {
  // Parse request (JSON or multipart)
  let fields = {};
  let fileInfo = null;

  try {
    if ((req.headers['content-type'] || '').includes('multipart/form-data')) {
      const { parsedFields, parsedFile } = await parseMultipart(req);
      fields  = parsedFields;
      fileInfo = parsedFile;
    } else {
      fields = req.body || {};
    }
  } catch (err) {
    context.log.error('Parse error', err);
    return fail(context, 400, 'Invalid request payload');
  }

  // Inputs
  const patakaId      = Number(fields.patakaId);
  const description   = (fields.description   || '').toString().trim();
  const reporterName  = (fields.reporterName  || '').toString().trim();
  const reporterEmail = (fields.reporterEmail || '').toString().trim();
  const okToContact   = toBool(fields.okToContact);

  if (!patakaId || (!description && !fileInfo)) {
    return fail(context, 400, 'patakaId and (description or photo) are required');
  }

  let pool;
  try {
    // Connect SQL
    pool = await sql.connect(process.env.SQL_CONN_STRING);

    // Confirm Pataka exists (schema uses PatakaId / PatakaName)
    const pataka = await pool.request()
      .input('PatakaId', sql.Int, patakaId)
      .query(`SELECT TOP 1 PatakaId, PatakaName FROM dbo.Pataka WHERE PatakaId = @PatakaId`)
      .then(r => r.recordset[0]);

    if (!pataka) return fail(context, 404, 'Pataka not found');

    // Lookups the schema requires
    const userId      = await getDefaultUserId(pool);          // dbo.PatakaUser (any valid user)
    const statusId    = await getStatusId(pool, 'Open');       // dbo.IssueStatus (prefer 'Open')
    const issueTypeId = await getIssueTypeId(pool);            // dbo.IssueType  (first available)

    if (!userId || !statusId || !issueTypeId) {
      return fail(context, 500, 'Missing lookup data (User/IssueStatus/IssueType)');
    }

    // Optional photo upload
    let photoUrl = null;
    if (fileInfo) {
      try {
        photoUrl = await uploadToBlob(fileInfo, patakaId);
      } catch (e) {
        context.log.error('Blob upload failed', e);
        return fail(context, 500, 'Photo upload failed');
      }
    }

    // Insert Issue (per your schema)
    const insert = await pool.request()
      .input('PatakaId',          sql.Int,            patakaId)
      .input('UserId',            sql.Int,            userId)
      .input('IssueTypeId',       sql.Int,            issueTypeId)
      .input('IssueDescription',  sql.NVarChar(500),  description || null)
      .input('IssueStatusId',     sql.Int,            statusId)
      .input('ImagePath',         sql.NVarChar(500),  photoUrl)
      .query(`
        DECLARE @now DATETIME2 = SYSUTCDATETIME();
        INSERT INTO dbo.Issue
          (PatakaId, UserId, IssueTypeId, IssueDescription, CreatedUTCDateTime, IssueStatusId, LastUpdateUTCDateTime, ImagePath)
        OUTPUT INSERTED.IssueId
        VALUES (@PatakaId, @UserId, @IssueTypeId, @IssueDescription, @now, @IssueStatusId, @now, @ImagePath);
      `);

    const issueId = insert.recordset[0].IssueId;

    // Build attachment from temp file to improve deliverability
    let attachment = null;
    if (fileInfo && fileInfo.filepath) {
      try {
        const bytes = fs.readFileSync(fileInfo.filepath);
        attachment = {
          name: fileInfo.originalFilename || 'photo.jpg',
          contentType: fileInfo.mimetype || 'image/jpeg',
          contentInBase64: bytes.toString('base64')
        };
      } catch {}
    }

    // Email — use NOTIFY_FALLBACK_EMAIL (we don’t have KaitiakiEmail in schema)
    const to = process.env.NOTIFY_FALLBACK_EMAIL || 'info@t1nz.com';
    const notified = await sendEmail({
      to,
      patakaName: pataka.PatakaName,
      issueId,
      description,
      photoUrl,
      reporterName,
      reporterEmail,
      attachment
    });

    return okJson(context, 200, {
      ok: true,
      issueId,
      notified,
      photoUrl
    });

  } catch (err) {
    context.log.error('ReportIssue error', err);
    return fail(context, 500, 'Server error');
  } finally {
    if (pool) { try { pool.close(); } catch {} }
    if (fileInfo && fileInfo.filepath) {
      try { fs.unlinkSync(fileInfo.filepath); } catch {}
    }
  }
};

// ---------- Helpers ----------

function toBool(v) {
  if (v === true || v === 1 || v === '1') return true;
  const s = (v || '').toString().toLowerCase();
  return ['true','yes','on','y'].includes(s);
}

// Azure Functions gives us body/rawBody, not a Node IncomingMessage stream.
// Create a faux stream and attach the bits formidable needs.
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024
    });

    const raw = req.body || req.rawBody || '';
    const stream = new Readable({ read() {} });
    stream.push(Buffer.isBuffer(raw) ? raw : Buffer.from(raw));
    stream.push(null);

    stream.headers = req.headers || {};
    stream.method  = req.method  || 'POST';
    stream.url     = req.url     || '/';

    form.parse(stream, (err, fields, files) => {
      if (err) return reject(err);

      // Normalize fields
      const norm = {};
      Object.entries(fields || {}).forEach(([k, v]) => {
        norm[k] = Array.isArray(v) ? v[0] : v;
      });

      // First file (expect 'photo', but be tolerant)
      let file = files?.photo || files?.file || null;
      if (!file && files && typeof files === 'object') {
        const first = Object.values(files)[0];
        file = Array.isArray(first) ? first[0] : first;
      }
      resolve({ parsedFields: norm, parsedFile: Array.isArray(file) ? file[0] : file });
    });
  });
}

async function uploadToBlob(file, patakaId) {
  const blobConn = process.env.BLOB_CONN_STRING || process.env.AzureWebJobsStorage;
  const containerName = process.env.BLOB_CONTAINER_ISSUES || 'issue-photos';
  const blobServiceClient = BlobServiceClient.fromConnectionString(blobConn);
  const container = blobServiceClient.getContainerClient(containerName);
  await container.createIfNotExists({ access: 'blob' });

  const ext = path.extname(file.originalFilename || file.newFilename || '.jpg') || '.jpg';
  const blobName = `issues/${patakaId}/${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
  const blockBlob = container.getBlockBlobClient(blobName);
  const data = fs.readFileSync(file.filepath);
  await blockBlob.uploadData(data, { blobHTTPHeaders: { blobContentType: file.mimetype || 'image/jpeg' } });
  return blockBlob.url;
}

async function getDefaultUserId(pool) {
  // Prefer a user row with an email; else first user
  const r1 = await pool.request()
    .query(`SELECT TOP 1 UserId FROM dbo.PatakaUser WHERE Email IS NOT NULL ORDER BY UserId ASC`);
  if (r1.recordset.length) return r1.recordset[0].UserId;
  const r2 = await pool.request().query(`SELECT TOP 1 UserId FROM dbo.PatakaUser ORDER BY UserId ASC`);
  return r2.recordset.length ? r2.recordset[0].UserId : null;
}

async function getStatusId(pool, name) {
  const r1 = await pool.request()
    .input('name', sql.NVarChar(100), name)
    .query(`SELECT TOP 1 IssueStatusId FROM dbo.IssueStatus WHERE IssueStatusDescription = @name`);
  if (r1.recordset.length) return r1.recordset[0].IssueStatusId;
  const r2 = await pool.request().query(`SELECT TOP 1 IssueStatusId FROM dbo.IssueStatus ORDER BY IssueStatusId ASC`);
  return r2.recordset.length ? r2.recordset[0].IssueStatusId : null;
}

async function getIssueTypeId(pool) {
  const r = await pool.request().query(`SELECT TOP 1 IssueTypeId FROM dbo.IssueType ORDER BY IssueTypeId ASC`);
  return r.recordset.length ? r.recordset[0].IssueTypeId : null;
}

async function sendEmail({ to, patakaName, issueId, description, photoUrl, reporterName, reporterEmail, attachment }) {
  try {
    const client = new EmailClient(process.env.ACS_CONNECTION_STRING);
    const subject = `Issue reported — ${patakaName} (ID ${issueId})`;
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5">
        <h2 style="margin:0 0 8px 0">Issue reported — ${escapeHtml(patakaName)}</h2>
        ${description ? `<p><strong>Details:</strong><br>${escapeHtml(description)}</p>` : ''}
        ${photoUrl ? `<p><strong>Photo:</strong> <a href="${photoUrl}">View</a></p>` : ''}
        ${reporterName || reporterEmail ? `<p><strong>Reporter:</strong> ${escapeHtml(reporterName || '')} ${reporterEmail ? '&lt;' + escapeHtml(reporterEmail) + '&gt;' : ''}</p>` : ''}
        <p style="margin-top:16px;color:#666">Issue ID: ${issueId}</p>
      </div>
    `;

    const message = {
      senderAddress: process.env.ACS_SENDER_ADDRESS,
      content: {
        subject,
        html,
        attachments: attachment ? [{
          name: attachment.name,
          contentType: attachment.contentType,
          contentInBase64: attachment.contentInBase64
        }] : undefined
      },
      recipients: {
        to: [{ address: to || 'info@t1nz.com' }],
        cc: [{ address: 'info@onthehouse.org.nz' }]
      },
      replyTo: [{ address: 'info@onthehouse.org.nz' }]
    };

    const poller = await client.beginSend(message);
    const res = await poller.pollUntilDone();
    return !!(res && res.status && res.status.toLowerCase() === 'succeeded');
  } catch (e) {
    console.error('Email send failed', e);
    return false;
  }
}

function escapeHtml(s) {
  return (s || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
