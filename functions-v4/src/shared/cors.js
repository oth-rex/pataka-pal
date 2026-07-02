// CORS is handled at the PLATFORM level on the Function App (Settings > CORS,
// or `az functionapp cors`), NOT in code.
//
// Why: the Azure Functions host intercepts the preflight OPTIONS request and
// answers it itself before our handler runs, using the app's configured CORS
// allowed-origins. In-code OPTIONS handling therefore never executes for a
// preflight. And once platform CORS is configured, if we ALSO set
// Access-Control-Allow-Origin in code, responses carry the header twice and the
// browser rejects them. So we deliberately set NO CORS headers here.
//
// These stubs stay exported so the function files don't need editing.

function corsHeaders() {
    return {};
}

function preflight() {
    return { status: 204 };
}

module.exports = { corsHeaders, preflight };