// Shared request-body parser for the v4 model.
//
// Replaces the v3 hand-rolled multipart string-splitting (SubmitDonation /
// SubmitTaking) and the formidable + temp-file approach (ReportIssue) with the
// runtime's native request.formData(). Files come back as in-memory buffers, so
// there are no temp files and no fragile binary-from-string conversions.
//
// Returns { fields, file } where:
//   fields = plain object of string form fields (or the parsed JSON body)
//   file   = { data: Buffer, type, filename } for the uploaded photo, or null

async function parseBody(request) {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
        const form = await request.formData();
        const fields = {};
        let file = null;

        for (const [key, value] of form.entries()) {
            // Uploaded files are Blob/File objects (they expose arrayBuffer()).
            if (value && typeof value === 'object' && typeof value.arrayBuffer === 'function') {
                const buffer = Buffer.from(await value.arrayBuffer());
                file = {
                    data: buffer,
                    type: value.type || 'image/jpeg',
                    filename: value.name || 'photo.jpg'
                };
            } else {
                fields[key] = value;
            }
        }
        return { fields, file };
    }

    // Not multipart: treat the body as JSON (no photo).
    let fields = {};
    try {
        fields = await request.json();
    } catch {
        fields = {};
    }
    return { fields, file: null };
}

module.exports = { parseBody };
