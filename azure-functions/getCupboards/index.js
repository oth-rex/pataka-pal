module.exports = async function (context, req) {
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            }
        };
        return;
    }

    try {
        const mockData = [
            {
                id: 1,
                name: "Bell Block Community Pataka",
                address: "14 Nugent Street, Bell Block, New Plymouth",
                latitude: -39.03409073,
                longitude: 174.14252746,
                status: "well_stocked",
                lastUpdated: "Recently updated",
                distance: "N/A",
                inventory: []
            },
            {
                id: 2,
                name: "Marfell Neighbourhood Pataka", 
                address: "53 Endeavour Street, Marfell, New Plymouth",
                latitude: -39.07224672,
                longitude: 174.04404338,
                status: "well_stocked",
                lastUpdated: "Recently updated",
                distance: "N/A",
                inventory: []
            },
            {
                id: 3,
                name: "Waitara Foodbank - Pataka Kai",
                address: "5 West Quay, Waitara, Waitara", 
                latitude: -39.00134220,
                longitude: 174.23991920,
                status: "well_stocked",
                lastUpdated: "Recently updated",
                distance: "N/A",
                inventory: []
            }
        ];

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: mockData
        };

    } catch (error) {
        context.log.error('Function error:', error);
        context.res = {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: { error: 'Internal server error' }
        };
    }
};