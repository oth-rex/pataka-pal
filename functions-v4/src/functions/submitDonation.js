// SubmitDonation - records a donation (one or more food items) against a pātaka,
// with an optional photo. Thin wrapper over the shared transaction pipeline.

const { app } = require('@azure/functions');
const { corsHeaders, preflight } = require('../shared/cors');
const { parseBody } = require('../shared/multipart');
const { submitFoodTransaction } = require('../shared/transaction');

app.http('SubmitDonation', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('SubmitDonation function triggered');

        if (request.method === 'OPTIONS') {
            return preflight('POST');
        }

        try {
            const parsed = await parseBody(request);
            const result = await submitFoodTransaction(
                { transactionTypeId: 1, containerBase: 'donation-photos', blobPrefix: 'donations', label: 'Donation' },
                parsed,
                context
            );
            return { status: result.status, headers: corsHeaders('POST'), jsonBody: result.body };
        } catch (error) {
            context.error('Error in SubmitDonation:', error);
            return {
                status: 500,
                headers: corsHeaders('POST'),
                jsonBody: { ok: false, error: error.message || 'Internal server error' }
            };
        }
    }
});
