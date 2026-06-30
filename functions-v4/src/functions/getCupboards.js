// getCupboards - returns every pātaka with its current calculated inventory.
// Ported from the v3 function. Logic and SQL are unchanged; the differences are
// the v4 wrapper (app.http, request/response shapes) and the shared cached pool
// (no more connect-and-close per request).

const { app } = require('@azure/functions');
const { sql, getPool } = require('../shared/db');
const { corsHeaders, preflight } = require('../shared/cors');

app.http('getCupboards', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('getCupboards function triggered');

        if (request.method === 'OPTIONS') {
            return preflight('GET');
        }

        try {
            const includeTest = request.query.get('includeTest') === 'true';
            const pool = await getPool();

            const whereClause = includeTest ? '' : 'WHERE p.IsTest = 0';

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

            const cupboardsWithInventory = await Promise.all(
                patakas.map(async (pataka) => {
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
                            LEFT JOIN FoodTransaction ft ON fi.FoodItemId = ft.FoodItemId AND ft.PatakaId = @patakaId
                            WHERE fi.IsDeleted = 0
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

            context.log(`Returned ${cupboardsWithInventory.length} pātaka (includeTest: ${includeTest})`);

            return {
                status: 200,
                headers: corsHeaders('GET'),
                jsonBody: cupboardsWithInventory
            };

        } catch (error) {
            context.error('Error in getCupboards:', error);
            return {
                status: 500,
                headers: corsHeaders('GET'),
                jsonBody: { error: 'Internal server error', message: error.message }
            };
        }
    }
});
