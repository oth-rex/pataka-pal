const sql = require('mssql');
const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function (context, req) {
    context.log('SubmitDonation function triggered');

    // CORS headers
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    };

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }

    try {
        // Parse request data
        let patakaId, userId, items, comment, photoFile = null, isTest = false;

        const contentType = req.headers['content-type'] || '';
        
        if (contentType.includes('multipart/form-data')) {
            // FIXED: Azure Functions multipart parsing
            // Extract boundary from content-type header
            const boundaryMatch = contentType.match(/boundary=([^;]+)/);
            if (!boundaryMatch) {
                throw new Error('No boundary found in Content-Type header');
            }
            const boundary = boundaryMatch[1].replace(/^["']|["']$/g, ''); // Remove quotes if present
            
            context.log('Boundary extracted:', boundary);
            
            // Get raw body as string (Azure Functions provides this)
            const bodyString = req.body ? req.body.toString() : '';
            
            // Manual multipart parsing (more reliable for Azure Functions)
            const parts = bodyString.split('--' + boundary);
            
            for (const part of parts) {
                if (!part || part.trim() === '' || part.trim() === '--') continue;
                
                // Parse headers
                const headerEndIndex = part.indexOf('\r\n\r\n');
                if (headerEndIndex === -1) continue;
                
                const headerSection = part.substring(0, headerEndIndex);
                const bodySection = part.substring(headerEndIndex + 4).replace(/\r\n$/, '');
                
                // Extract field name
                const nameMatch = headerSection.match(/name="([^"]+)"/);
                if (!nameMatch) continue;
                const fieldName = nameMatch[1];
                
                if (fieldName === 'patakaId') {
                    patakaId = parseInt(bodySection);
                } else if (fieldName === 'userId') {
                    userId = bodySection;
                } else if (fieldName === 'items') {
                    items = JSON.parse(bodySection);
                } else if (fieldName === 'comment') {
                    comment = bodySection;
                } else if (fieldName === 'isTest') {
                    isTest = bodySection === 'true';
                } else if (fieldName === 'photo') {
                    // Extract filename and content type from headers
                    const filenameMatch = headerSection.match(/filename="([^"]+)"/);
                    const contentTypeMatch = headerSection.match(/Content-Type: ([^\r\n]+)/);
                    
                    // Convert body to Buffer (binary data)
                    const binaryStart = part.indexOf('\r\n\r\n') + 4;
                    const binaryEnd = part.lastIndexOf('\r\n');
                    const binaryData = part.substring(binaryStart, binaryEnd);
                    
                    photoFile = {
                        data: Buffer.from(binaryData, 'binary'),
                        type: contentTypeMatch ? contentTypeMatch[1] : 'image/jpeg',
                        filename: filenameMatch ? filenameMatch[1] : 'photo.jpg'
                    };
                    
                    context.log('Photo extracted:', photoFile.filename, photoFile.type, photoFile.data.length, 'bytes');
                }
            }
        } else {
            // Parse JSON data (no photo)
            const body = req.body;
            patakaId = body.patakaId;
            userId = body.userId;
            items = body.items;
            comment = body.comment;
            isTest = body.isTest || false;
        }

        context.log('Parsed data:', { patakaId, itemCount: items?.length, hasPhoto: !!photoFile });

        // Validate required fields
        if (!patakaId || !items || !Array.isArray(items) || items.length === 0) {
            context.res.status = 400;
            context.res.body = { ok: false, error: 'Missing required fields: patakaId and items' };
            return;
        }

        // Connect to database
        const pool = await sql.connect(process.env.SQL_CONN_STRING);

        // Verify pātaka exists and get its IsTest status
        const patakaCheck = await pool.request()
            .input('patakaId', sql.Int, patakaId)
            .query('SELECT PatakaId, IsTest FROM Pataka WHERE PatakaId = @patakaId');

        if (patakaCheck.recordset.length === 0) {
            await pool.close();
            context.res.status = 404;
            context.res.body = { ok: false, error: 'Pātaka not found' };
            return;
        }

        // Use pātaka's IsTest status (more reliable than user input)
        isTest = patakaCheck.recordset[0].IsTest;
        context.log('Pātaka found, isTest:', isTest);

        // Create anonymous user ID if not provided
        const finalUserId = userId || `anon_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        // Upload photo to blob storage if provided
        let photoUrl = null;
        if (photoFile && photoFile.data && photoFile.data.length > 0) {
            try {
                // Use available storage connection string variable
const storageConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING 
    || process.env.BLOB_CONN_STRING 
    || process.env.AzureWebJobsStorage;

if (!storageConnectionString) {
    throw new Error('No storage connection string found in environment variables');
}

const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
                const containerName = isTest ? 'donation-photos-test' : 'donation-photos';
                const containerClient = blobServiceClient.getContainerClient(containerName);
                
                // Create container if it doesn't exist
                await containerClient.createIfNotExists({ access: 'blob' });
                
                const timestamp = Date.now();
                const randomStr = Math.random().toString(36).substring(2, 8);
                const ext = photoFile.filename?.split('.').pop() || 'jpg';
                const blobName = `donations/${patakaId}/${timestamp}_${randomStr}.${ext}`;
                
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                await blockBlobClient.uploadData(photoFile.data, {
                    blobHTTPHeaders: { blobContentType: photoFile.type || 'image/jpeg' }
                });
                
                photoUrl = blockBlobClient.url;
                context.log('Photo uploaded:', photoUrl);
            } catch (photoError) {
                context.log.error('Photo upload failed:', photoError);
                // Continue without photo rather than failing entire donation
            }
        }

        // Process each item
        const transactionIds = [];
        const timestamp = new Date();

        for (const item of items) {
            if (!item.name || !item.quantity || item.quantity <= 0) {
                context.log('Skipping invalid item:', item);
                continue; // Skip invalid items
            }

            // Get or create FoodCategory
            let categoryId = 8; // Default to "Other" (FoodCategoryId = 8)
            
            // Try to match category based on item name (parameterized to prevent SQL injection)
            const categoryResult = await pool.request()
                .input('searchTerm', sql.NVarChar, `%${item.name.split(' ')[0]}%`)
                .query(`
                    SELECT TOP 1 FoodCategoryId 
                    FROM FoodCategory 
                    WHERE FoodCategoryName LIKE @searchTerm
                `);
            
            if (categoryResult.recordset.length > 0) {
                categoryId = categoryResult.recordset[0].FoodCategoryId;
            }

            // Check if FoodItem exists in catalog by name only
            const existingItem = await pool.request()
                .input('itemName', sql.NVarChar, item.name)
                .query(`
                    SELECT FoodItemId
                    FROM FoodItem 
                    WHERE FoodItemName = @itemName AND IsDeleted = 0
                `);
            
            let foodItemId;
            
            if (existingItem.recordset.length > 0) {
                // Use existing catalog item
                foodItemId = existingItem.recordset[0].FoodItemId;
                context.log('Using existing FoodItem:', foodItemId, item.name);
            } else {
                // Create new catalog item
                const insertResult = await pool.request()
                    .input('name', sql.NVarChar, item.name)
                    .input('categoryId', sql.Int, categoryId)
                    .query(`
                        INSERT INTO FoodItem (FoodItemName, FoodCategoryId, CreatedUTCDateTime, IsDeleted, LastUpdateUTCDateTime)
                        OUTPUT INSERTED.FoodItemId
                        VALUES (@name, @categoryId, GETUTCDATE(), 0, GETUTCDATE())
                    `);
                
                foodItemId = insertResult.recordset[0].FoodItemId;
                context.log('Created new FoodItem:', foodItemId, item.name);
            }

            // Create FoodTransaction record
            const transactionResult = await pool.request()
                .input('patakaId', sql.Int, patakaId)
                .input('userId', sql.Int, 1) // Placeholder UserId
                .input('foodItemId', sql.Int, foodItemId)
                .input('categoryId', sql.Int, categoryId)
                .input('transactionTypeId', sql.Int, 1) // 1 = Donation
                .input('quantity', sql.Int, item.quantity)
                .input('foodDescription', sql.NVarChar, comment || null)
                .input('patakaEmpty', sql.Bit, false)
                .input('isTest', sql.Bit, isTest)
                .query(`
                    INSERT INTO FoodTransaction 
                    (PatakaId, UserId, TransactionTypeId, FoodCategoryId, FoodItemId, FoodDescription, Quantity, PatakaEmpty, IsTest)
                    OUTPUT INSERTED.TransactionId
                    VALUES (@patakaId, @userId, @transactionTypeId, @categoryId, @foodItemId, @foodDescription, @quantity, @patakaEmpty, @isTest)
                `);
            
            transactionIds.push(transactionResult.recordset[0].TransactionId);
        }

        // Update Pataka LastUpdated timestamp
        await pool.request()
            .input('patakaId', sql.Int, patakaId)
            .query(`
                UPDATE Pataka 
                SET LastUpdatedUTCDateTime = GETUTCDATE()
                WHERE PatakaId = @patakaId
            `);

        await pool.close();

        context.log('Donation successful:', transactionIds.length, 'items processed');

        // Success response
        context.res.status = 200;
        context.res.body = {
            ok: true,
            message: 'Donation submitted successfully',
            userId: finalUserId,
            transactionIds: transactionIds,
            photoUrl: photoUrl,
            itemsProcessed: transactionIds.length,
            isTest: isTest
        };

    } catch (error) {
        context.log.error('Error in SubmitDonation:', error);
        context.res.status = 500;
        context.res.body = {
            ok: false,
            error: error.message || 'Internal server error'
        };
    }
};