const sql = require('mssql');
const { BlobServiceClient } = require('@azure/storage-blob');
const multipart = require('parse-multipart');

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
        let patakaId, userId, items, comment, photoFile, isTest = false;

        if (req.headers['content-type']?.includes('multipart/form-data')) {
            // Parse multipart form data (with photo)
            const boundary = multipart.getBoundary(req.headers['content-type']);
            const parts = multipart.Parse(req.body, boundary);

            for (const part of parts) {
                if (part.name === 'patakaId') {
                    patakaId = parseInt(part.data.toString());
                } else if (part.name === 'userId') {
                    userId = part.data.toString();
                } else if (part.name === 'items') {
                    items = JSON.parse(part.data.toString());
                } else if (part.name === 'comment') {
                    comment = part.data.toString();
                } else if (part.name === 'isTest') {
                    isTest = part.data.toString() === 'true';
                } else if (part.name === 'photo') {
                    photoFile = {
                        data: part.data,
                        filename: part.filename,
                        type: part.type
                    };
                }
            }
        } else {
            // Parse JSON (no photo)
            patakaId = req.body.patakaId;
            userId = req.body.userId;
            items = req.body.items;
            comment = req.body.comment;
            isTest = req.body.isTest === true || req.body.isTest === 'true';
        }

        // Validation
        if (!patakaId || !items || !Array.isArray(items) || items.length === 0) {
            context.res.status = 400;
            context.res.body = { 
                ok: false, 
                error: 'Missing required fields: patakaId and items array required' 
            };
            return;
        }

        // Connect to database
        const pool = await sql.connect(process.env.SQL_CONN_STRING);

        // Verify pātaka exists and get its IsTest status
        const patakaCheck = await pool.request()
            .input('patakaId', sql.Int, patakaId)
            .query('SELECT PatakaId, IsTest FROM Pataka WHERE PatakaId = @patakaId');
        
        if (patakaCheck.recordset.length === 0) {
            context.res.status = 404;
            context.res.body = { ok: false, error: 'Pātaka not found' };
            await pool.close();
            return;
        }

        // Use pātaka's IsTest status (override user input for safety)
        const patakaIsTest = patakaCheck.recordset[0].IsTest;
        isTest = patakaIsTest || isTest; // Use pātaka's setting, or user's if pātaka is null

        context.log(`Processing donation for pātaka ${patakaId}, IsTest: ${isTest}`);

        // Handle user ID (create if new)
        let finalUserId;
        if (userId) {
            // Check if user exists
            const userCheck = await pool.request()
                .input('userId', sql.NVarChar, userId)
                .query('SELECT UserId FROM PatakaUser WHERE UserId = @userId');
            
            if (userCheck.recordset.length > 0) {
                finalUserId = userId;
            } else {
                // Create new user
                const userInsert = await pool.request()
                    .input('userId', sql.NVarChar, userId)
                    .input('createdAt', sql.DateTime, new Date())
                    .query(`
                        INSERT INTO PatakaUser (UserId, CreatedAt, IsAnonymous)
                        VALUES (@userId, @createdAt, 1);
                        SELECT UserId FROM PatakaUser WHERE UserId = @userId;
                    `);
                finalUserId = userInsert.recordset[0].UserId;
            }
        } else {
            // Generate new anonymous user
            const newUserId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await pool.request()
                .input('userId', sql.NVarChar, newUserId)
                .input('createdAt', sql.DateTime, new Date())
                .query(`
                    INSERT INTO PatakaUser (UserId, CreatedAt, IsAnonymous)
                    VALUES (@userId, @createdAt, 1)
                `);
            finalUserId = newUserId;
        }

        // Upload photo if provided (use test container for test transactions)
        let photoUrl = null;
        if (photoFile) {
            const blobServiceClient = BlobServiceClient.fromConnectionString(
                process.env.BLOB_CONN_STRING
            );
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
        }

        // Process each item
        const transactionIds = [];
        const timestamp = new Date();

        for (const item of items) {
            if (!item.name || !item.quantity || item.quantity <= 0) {
                continue; // Skip invalid items
            }

            // Get or create FoodCategory
            let categoryId = 1; // Default to "Other"
            
            // Try to match category based on item name (parameterized to prevent SQL injection)
            const categoryResult = await pool.request()
                .input('searchTerm', sql.NVarChar, `%${item.name.split(' ')[0]}%`)
                .query(`
                    SELECT TOP 1 FoodCategoryId 
                    FROM FoodCategory 
                    WHERE Name LIKE @searchTerm
                `);
            
            if (categoryResult.recordset.length > 0) {
                categoryId = categoryResult.recordset[0].FoodCategoryId;
            }

            // Check if FoodItem exists for this pataka
            const existingItem = await pool.request()
                .input('patakaId', sql.Int, patakaId)
                .input('itemName', sql.NVarChar, item.name)
                .query(`
                    SELECT FoodItemId, Quantity 
                    FROM FoodItem 
                    WHERE PatakaId = @patakaId AND Name = @itemName
                `);

            let foodItemId;
            
            if (existingItem.recordset.length > 0) {
                // Update existing item quantity
                foodItemId = existingItem.recordset[0].FoodItemId;
                const newQuantity = existingItem.recordset[0].Quantity + item.quantity;
                
                await pool.request()
                    .input('foodItemId', sql.Int, foodItemId)
                    .input('quantity', sql.Int, newQuantity)
                    .query(`
                        UPDATE FoodItem 
                        SET Quantity = @quantity, LastUpdated = GETDATE()
                        WHERE FoodItemId = @foodItemId
                    `);
            } else {
                // Create new FoodItem
                const insertResult = await pool.request()
                    .input('patakaId', sql.Int, patakaId)
                    .input('name', sql.NVarChar, item.name)
                    .input('categoryId', sql.Int, categoryId)
                    .input('quantity', sql.Int, item.quantity)
                    .query(`
                        INSERT INTO FoodItem (PatakaId, Name, FoodCategoryId, Quantity, LastUpdated)
                        OUTPUT INSERTED.FoodItemId
                        VALUES (@patakaId, @name, @categoryId, @quantity, GETDATE())
                    `);
                
                foodItemId = insertResult.recordset[0].FoodItemId;
            }

            // Create FoodTransaction record (WITH IsTest flag)
            const transactionResult = await pool.request()
                .input('patakaId', sql.Int, patakaId)
                .input('userId', sql.NVarChar, finalUserId)
                .input('foodItemId', sql.Int, foodItemId)
                .input('categoryId', sql.Int, categoryId)
                .input('transactionTypeId', sql.Int, 1) // 1 = Donation
                .input('quantity', sql.Int, item.quantity)
                .input('comment', sql.NVarChar, comment || null)
                .input('photoUrl', sql.NVarChar, photoUrl || null)
                .input('timestamp', sql.DateTime, timestamp)
                .input('isTest', sql.Bit, isTest)
                .query(`
                    INSERT INTO FoodTransaction 
                    (PatakaId, UserId, FoodItemId, FoodCategoryId, TransactionTypeId, 
                     Quantity, Comment, PhotoUrl, TransactionDate, IsTest)
                    OUTPUT INSERTED.FoodTransactionId
                    VALUES (@patakaId, @userId, @foodItemId, @categoryId, @transactionTypeId,
                            @quantity, @comment, @photoUrl, @timestamp, @isTest)
                `);
            
            transactionIds.push(transactionResult.recordset[0].FoodTransactionId);
        }

        // Update Pataka LastUpdated timestamp
        await pool.request()
            .input('patakaId', sql.Int, patakaId)
            .query(`
                UPDATE Pataka 
                SET LastUpdated = GETDATE()
                WHERE PatakaId = @patakaId
            `);

        await pool.close();

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