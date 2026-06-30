// Shared CORS handling. The frontend is a static site served from a different
// origin than the Function App, so every function returns permissive CORS
// headers and answers the preflight OPTIONS request.
//
// Note: keep CORS in code OR configure it on the Function App in Azure, not
// both, or browsers see duplicate Access-Control-Allow-Origin headers. This
// project handles it in code, so leave the Function App's platform CORS empty.

function corsHeaders(allowMethods) {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': `${allowMethods || 'GET, POST'}, OPTIONS`,
        'Access-Control-Allow-Headers': 'Content-Type'
    };
}

function preflight(allowMethods) {
    return { status: 204, headers: corsHeaders(allowMethods) };
}

module.exports = { corsHeaders, preflight };
