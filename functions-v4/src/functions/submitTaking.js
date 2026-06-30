// SubmitTaking - records a taking (one or more food items removed) from a
// pātaka, with an optional photo. Thin wrapper over the shared pipeline.

const { app } = require('@azure/functions');
const { corsHeaders, preflight } = require('../shared/cors');
const { parseBody } = require('../shared/multipart');
const { submitFoodTransaction } = require('../shared/transaction');

app.http('SubmitTaking', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('SubmitTaking function triggered');

        if (request.method === 'OPTIONS') {
            return preflight('POST');
        }

        try {
            const parsed = await parseBody(request);
            const result = await submitFoodTransaction(
                { transactionTypeId: 2, containerBase: 'taking-photos', blobPrefix: 'takings', label: 'Taking' },
                parsed,
                context
            );
            return { status: result.status, headers: corsHeaders('POST'), jsonBody: result.body };
        } catch (error) {
            context.error('Error in SubmitTaking:', error);
            return {
                status: 500,
                headers: corsHeaders('POST'),
                jsonBody: { ok: false, error: error.message || 'Internal server error' }
            };
        }
    }
});
