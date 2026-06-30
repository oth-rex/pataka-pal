// ReportIssue - logs a pātaka issue in SQL, optionally uploads a photo to blob
// storage, and emails a notification via Azure Communication Services.
//
// Ported to v4: native request.formData() (via shared parseBody) replaces the
// formidable + temp-file handling, so the photo lives in memory and is used for
// both the blob upload and the email attachment. Cached SQL pool, shared blob
// helper, shared CORS.
//
// App settings used: SQL_CONN_STRING, BLOB_CONN_STRING, BLOB_CONTAINER_ISSUES
// (optional, defaults to issue-photos), ACS_CONNECTION_STRING,
// ACS_SENDER_ADDRESS, NOTIFY_FALLBACK_EMAIL.

const { app } = require('@azure/functions');
const { EmailClient } = require('@azure/communication-email');
const { sql, getPool } = require('../shared/db');
const { corsHeaders, preflight } = require('../shared/cors');
const { parseBody } = require('../shared/multipart');
const { uploadPhoto } = require('../shared/blob');

app.http('ReportIssue', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('ReportIssue function triggered');

        if (request.method === 'OPTIONS') {
            return preflight('POST');
        }

        const reply = (status, body) => ({ status, headers: corsHeaders('POST'), jsonBody: body });

        // Parse body (multipart with optional photo, or JSON)
        let fields = {};
        let file = null;
        try {
            const parsed = await parseBody(request);
            fields = parsed.fields || {};
            file = parsed.file;
        } catch (err) {
            context.error('Parse error', err);
            return reply(400, { ok: false, error: 'Invalid request payload' });
        }

        const patakaId = Number(fields.patakaId);
        const description = (fields.description || '').toString().trim();
        const reporterName = (fields.reporterName || '').toString().trim();
        const reporterEmail = (fields.reporterEmail || '').toString().trim();

        if (!patakaId || (!description && !file)) {
            return reply(400, { ok: false, error: 'patakaId and (description or photo) are required' });
        }

        try {
            const pool = await getPool();

            // Confirm the pātaka exists
            const pataka = await pool.request()
                .input('PatakaId', sql.Int, patakaId)
                .query('SELECT TOP 1 PatakaId, PatakaName FROM dbo.Pataka WHERE PatakaId = @PatakaId')
                .then(r => r.recordset[0]);

            if (!pataka) {
                return reply(404, { ok: false, error: 'Pataka not found' });
            }

            // Lookups the schema requires
            const userId = await getDefaultUserId(pool);
            const statusId = await getStatusId(pool, 'Open');
            const issueTypeId = await getIssueTypeId(pool);

            if (!userId || !statusId || !issueTypeId) {
                return reply(500, { ok: false, error: 'Missing lookup data (User/IssueStatus/IssueType)' });
            }

            // Optional photo upload
            let photoUrl = null;
            if (file && file.data && file.data.length > 0) {
                try {
                    const containerName = process.env.BLOB_CONTAINER_ISSUES || 'issue-photos';
                    const ext = (file.filename && file.filename.includes('.')) ? file.filename.split('.').pop() : 'jpg';
                    const blobName = `issues/${patakaId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                    photoUrl = await uploadPhoto({
                        containerName,
                        blobName,
                        data: file.data,
                        contentType: file.type || 'image/jpeg'
                    });
                } catch (e) {
                    context.error('Blob upload failed', e);
                    return reply(500, { ok: false, error: 'Photo upload failed' });
                }
            }

            // Insert the Issue
            const insert = await pool.request()
                .input('PatakaId', sql.Int, patakaId)
                .input('UserId', sql.Int, userId)
                .input('IssueTypeId', sql.Int, issueTypeId)
                .input('IssueDescription', sql.NVarChar(500), description || null)
                .input('IssueStatusId', sql.Int, statusId)
                .input('ImagePath', sql.NVarChar(500), photoUrl)
                .query(`
                    DECLARE @now DATETIME2 = SYSUTCDATETIME();
                    INSERT INTO dbo.Issue
                      (PatakaId, UserId, IssueTypeId, IssueDescription, CreatedUTCDateTime, IssueStatusId, LastUpdateUTCDateTime, ImagePath)
                    OUTPUT INSERTED.IssueId
                    VALUES (@PatakaId, @UserId, @IssueTypeId, @IssueDescription, @now, @IssueStatusId, @now, @ImagePath);
                `);

            const issueId = insert.recordset[0].IssueId;

            // Build email attachment from the in-memory photo
            let attachment = null;
            if (file && file.data && file.data.length > 0) {
                attachment = {
                    name: file.filename || 'photo.jpg',
                    contentType: file.type || 'image/jpeg',
                    contentInBase64: file.data.toString('base64')
                };
            }

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

            return reply(200, { ok: true, issueId, notified, photoUrl });

        } catch (err) {
            context.error('ReportIssue error', err);
            return reply(500, { ok: false, error: 'Server error' });
        }
    }
});

// ---------- Helpers ----------

async function getDefaultUserId(pool) {
    const r1 = await pool.request()
        .query('SELECT TOP 1 UserId FROM dbo.PatakaUser WHERE Email IS NOT NULL ORDER BY UserId ASC');
    if (r1.recordset.length) return r1.recordset[0].UserId;
    const r2 = await pool.request().query('SELECT TOP 1 UserId FROM dbo.PatakaUser ORDER BY UserId ASC');
    return r2.recordset.length ? r2.recordset[0].UserId : null;
}

async function getStatusId(pool, name) {
    const r1 = await pool.request()
        .input('name', sql.NVarChar(100), name)
        .query('SELECT TOP 1 IssueStatusId FROM dbo.IssueStatus WHERE IssueStatusDescription = @name');
    if (r1.recordset.length) return r1.recordset[0].IssueStatusId;
    const r2 = await pool.request().query('SELECT TOP 1 IssueStatusId FROM dbo.IssueStatus ORDER BY IssueStatusId ASC');
    return r2.recordset.length ? r2.recordset[0].IssueStatusId : null;
}

async function getIssueTypeId(pool) {
    const r = await pool.request().query('SELECT TOP 1 IssueTypeId FROM dbo.IssueType ORDER BY IssueTypeId ASC');
    return r.recordset.length ? r.recordset[0].IssueTypeId : null;
}

async function sendEmail({ to, patakaName, issueId, description, photoUrl, reporterName, reporterEmail, attachment }) {
    try {
        const client = new EmailClient(process.env.ACS_CONNECTION_STRING);
        const subject = `Issue reported - ${patakaName} (ID ${issueId})`;
        const html = `
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5">
                <h2 style="margin:0 0 8px 0">Issue reported - ${escapeHtml(patakaName)}</h2>
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
