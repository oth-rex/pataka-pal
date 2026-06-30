// Shared blob-upload helper for photos.
//
// Connection-string precedence matches the v3 functions: the old app defined
// BLOB_CONN_STRING (not AZURE_STORAGE_CONNECTION_STRING), so that is what gets
// used in practice. AzureWebJobsStorage is a last-resort fallback.

const { BlobServiceClient } = require('@azure/storage-blob');

function getStorageConnectionString() {
    return process.env.AZURE_STORAGE_CONNECTION_STRING
        || process.env.BLOB_CONN_STRING
        || process.env.AzureWebJobsStorage;
}

// Uploads a buffer to containerName/blobName and returns the public blob URL.
// Creates the container (blob-level public access) if it does not exist.
async function uploadPhoto({ containerName, blobName, data, contentType }) {
    const connectionString = getStorageConnectionString();
    if (!connectionString) {
        throw new Error('No storage connection string configured');
    }

    const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = serviceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists({ access: 'blob' });

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(data, {
        blobHTTPHeaders: { blobContentType: contentType || 'image/jpeg' }
    });

    return blockBlobClient.url;
}

module.exports = { uploadPhoto, getStorageConnectionString };
