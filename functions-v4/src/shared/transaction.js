// Shared pipeline for donations and takings. The two are identical apart from
// the transaction type, the photo container/path, and the success label, so
// they share this one implementation and cannot drift apart.
//
// config:
//   transactionTypeId : 1 (donation) | 2 (taking)
//   containerBase     : 'donation-photos' | 'taking-photos'
//   blobPrefix        : 'donations' | 'takings'
//   label             : 'Donation' | 'Taking'  (used in the success message)
//
// Returns { status, body } for the caller to wrap with CORS headers.

const { sql, getPool } = require('./db');
const { uploadPhoto } = require('./blob');

async function submitFoodTransaction(config, parsed, context) {
    const { transactionTypeId, containerBase, blobPrefix, label } = config;
    const { fields, file } = parsed;

    const patakaId = parseInt(fields.patakaId, 10);
    const userId = fields.userId;
    const comment = fields.comment;

    let items = fields.items;
    if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { items = null; }
    }

    if (!patakaId || !items || !Array.isArray(items) || items.length === 0) {
        return { status: 400, body: { ok: false, error: 'Missing required fields: patakaId and items' } };
    }

    const pool = await getPool();

    // Verify pātaka exists and take its IsTest status (more reliable than client input)
    const patakaCheck = await pool.request()
        .input('patakaId', sql.Int, patakaId)
        .query('SELECT PatakaId, IsTest FROM Pataka WHERE PatakaId = @patakaId');

    if (patakaCheck.recordset.length === 0) {
        return { status: 404, body: { ok: false, error: 'Pātaka not found' } };
    }

    const isTest = patakaCheck.recordset[0].IsTest;
    const finalUserId = userId || `anon_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Optional photo upload. Best-effort: a failure here never fails the transaction.
    let photoUrl = null;
    if (file && file.data && file.data.length > 0) {
        try {
            const containerName = isTest ? `${containerBase}-test` : containerBase;
            const ext = (file.filename && file.filename.split('.').pop()) || 'jpg';
            const blobName = `${blobPrefix}/${patakaId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
            photoUrl = await uploadPhoto({
                containerName,
                blobName,
                data: file.data,
                contentType: file.type || 'image/jpeg'
            });
            context.log('Photo uploaded:', photoUrl);
        } catch (photoError) {
            context.error('Photo upload failed:', photoError);
            // continue without photo
        }
    }

    // Process each item
    const transactionIds = [];
    for (const item of items) {
        if (!item.name || !item.quantity || item.quantity <= 0) {
            context.log('Skipping invalid item:', item);
            continue;
        }

        // Match a category by the first word of the item name; default to "Other" (8)
        let categoryId = 8;
        const categoryResult = await pool.request()
            .input('searchTerm', sql.NVarChar, `%${item.name.split(' ')[0]}%`)
            .query('SELECT TOP 1 FoodCategoryId FROM FoodCategory WHERE FoodCategoryName LIKE @searchTerm');
        if (categoryResult.recordset.length > 0) {
            categoryId = categoryResult.recordset[0].FoodCategoryId;
        }

        // Find or create the catalog FoodItem by name
        const existingItem = await pool.request()
            .input('itemName', sql.NVarChar, item.name)
            .query('SELECT FoodItemId FROM FoodItem WHERE FoodItemName = @itemName AND IsDeleted = 0');

        let foodItemId;
        if (existingItem.recordset.length > 0) {
            foodItemId = existingItem.recordset[0].FoodItemId;
        } else {
            const insertResult = await pool.request()
                .input('name', sql.NVarChar, item.name)
                .input('categoryId', sql.Int, categoryId)
                .query(`
                    INSERT INTO FoodItem (FoodItemName, FoodCategoryId, CreatedUTCDateTime, IsDeleted, LastUpdateUTCDateTime)
                    OUTPUT INSERTED.FoodItemId
                    VALUES (@name, @categoryId, GETUTCDATE(), 0, GETUTCDATE())
                `);
            foodItemId = insertResult.recordset[0].FoodItemId;
        }

        // Record the transaction
        const transactionResult = await pool.request()
            .input('patakaId', sql.Int, patakaId)
            .input('userId', sql.Int, 1) // Placeholder UserId
            .input('foodItemId', sql.Int, foodItemId)
            .input('categoryId', sql.Int, categoryId)
            .input('transactionTypeId', sql.Int, transactionTypeId)
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

    // Touch the pātaka's last-updated timestamp
    await pool.request()
        .input('patakaId', sql.Int, patakaId)
        .query('UPDATE Pataka SET LastUpdatedUTCDateTime = GETUTCDATE() WHERE PatakaId = @patakaId');

    context.log(`${label} successful: ${transactionIds.length} items processed`);

    return {
        status: 200,
        body: {
            ok: true,
            message: `${label} submitted successfully`,
            userId: finalUserId,
            transactionIds,
            photoUrl,
            itemsProcessed: transactionIds.length,
            isTest
        }
    };
}

module.exports = { submitFoodTransaction };
