const sql = require('mssql');

module.exports = async function (context, req) {
    context.log('getCupboards function triggered');

    // CORS headers
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    };

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }

    try {
        // Optional parameter to include test pātaka
        const includeTest = req.query.includeTest === 'true';
        
        // Connect to database
        const pool = await sql.connect(process.env.SQL_CONN_STRING);

        // Build WHERE clause based on includeTest parameter
        const whereClause = includeTest ? '' : 'WHERE p.IsTest = 0';

        // Query all pātaka with their inventory
        const result = await pool.request().query(`
            SELECT 
                p.PatakaId,
                p.PatakaName,
                p.AddressLine1,
                p.AddressLine2,
                p.Suburb,
                p.City,
                p.Latitude,
                p.Longitude,
                p.LastUpdatedUTCDateTime,
                p.IsTest
            FROM Pataka p
            ${whereClause}
            ORDER BY p.PatakaName
        `);

        const patakas = result.recordset;

        // For each pātaka, get current inventory
        const cupboardsWithInventory = await Promise.all(
            patakas.map(async (pataka) => {
                // Get inventory for this pātaka (calculate from transactions)
                const inventoryResult = await pool.request()
                    .input('patakaId', sql.Int, pataka.PatakaId)
                    .query(`
                        SELECT 
                            fi.FoodItemId,
                            fi.FoodItemName,
                            fc.FoodCategoryName as Category,
                            ISNULL(SUM(
                                CASE 
                                    WHEN ft.TransactionTypeId = 1 THEN ft.Quantity  -- Donations add
                                    WHEN ft.TransactionTypeId = 2 THEN -ft.Quantity -- Collections subtract
                                    ELSE 0
                                END
                            ), 0) AS CurrentQuantity,
                            fi.LastUpdateUTCDateTime
                        FROM FoodItem fi
                        LEFT JOIN FoodCategory fc ON fi.FoodCategoryId = fc.FoodCategoryId
                        LEFT JOIN FoodTransaction ft ON fi.FoodItemId = ft.FoodItemId
                        WHERE fi.PatakaId = @patakaId 
                        AND fi.IsDeleted = 0
                        GROUP BY fi.FoodItemId, fi.FoodItemName, fc.FoodCategoryName, fi.LastUpdateUTCDateTime
                        HAVING ISNULL(SUM(
                            CASE 
                                WHEN ft.TransactionTypeId = 1 THEN ft.Quantity
                                WHEN ft.TransactionTypeId = 2 THEN -ft.Quantity
                                ELSE 0
                            END
                        ), 0) > 0
                        ORDER BY fi.FoodItemName
                    `);

                // Format address (combine address lines)
                let address = pataka.AddressLine1;
                if (pataka.AddressLine2) address += ', ' + pataka.AddressLine2;
                if (pataka.Suburb) address += ', ' + pataka.Suburb;
                if (pataka.City) address += ', ' + pataka.City;

                // Determine status based on inventory
                let status = 'well_stocked';
                const itemCount = inventoryResult.recordset.length;
                const totalQuantity = inventoryResult.recordset.reduce((sum, item) => sum + item.CurrentQuantity, 0);
                
                if (itemCount === 0 || totalQuantity === 0) {
                    status = 'empty';
                } else if (itemCount <= 2 || totalQuantity <= 5) {
                    status = 'low';
                }

                // Format last updated (calculate time ago)
                const lastUpdated = new Date(pataka.LastUpdatedUTCDateTime);
                const now = new Date();
                const diffMs = now - lastUpdated;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor(diffMs / (1000 * 60));
                
                let lastUpdatedText;
                if (diffHours > 24) {
                    const diffDays = Math.floor(diffHours / 24);
                    lastUpdatedText = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                } else if (diffHours > 0) {
                    lastUpdatedText = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                } else if (diffMins > 0) {
                    lastUpdatedText = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
                } else {
                    lastUpdatedText = 'Just now';
                }

                // Return formatted pātaka object
                return {
                    id: pataka.PatakaId,
                    name: pataka.PatakaName,
                    address: address,
                    latitude: parseFloat(pataka.Latitude),
                    longitude: parseFloat(pataka.Longitude),
                    status: status,
                    lastUpdated: lastUpdatedText,
                    inventory: inventoryResult.recordset.map(item => ({
                        Name: item.FoodItemName,
                        Category: item.Category || 'Other',
                        Quantity: item.CurrentQuantity
                    }))
                };
            })
        );

        await pool.close();

        // Return success response
        context.res.status = 200;
        context.res.body = cupboardsWithInventory;

        context.log(`Returned ${cupboardsWithInventory.length} pātaka (includeTest: ${includeTest})`);

    } catch (error) {
        context.log.error('Error in getCupboards:', error);
        context.res.status = 500;
        context.res.body = {
            error: 'Internal server error',
            message: error.message
        };
    }
};