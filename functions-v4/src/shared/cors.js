// CORS is handled IN CODE (not via the Function App's platform CORS setting).
//
// Why in code: on Flex Consumption the platform CORS setting does not work for
// preflight, the host intercepts the browser's preflight OPTIONS request and
// returns a bare 204 with no Access-Control-Allow-Origin, and never runs our
// handler. Setting allowed-origins with `az functionapp cors` does not change
// this (confirmed 2 Jul, and a documented Flex Consumption limitation).
//
// How we cope: for a *simple* cross-origin request (a GET, or a POST whose
// Content-Type is text/plain or multipart/form-data) the browser sends NO
// preflight, the request reaches our function, and the browser is satisfied by
// the Access-Control-Allow-Origin header we set on the RESPONSE below. So the
// frontend must avoid content types that trigger a preflight (e.g. send the
// analyzeFood image as text/plain, not application/octet-stream). getCupboards
// (GET) and the submit/report calls (multipart/form-data) are already simple.

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