// analyzeFood - Azure OpenAI gpt-5.4 vision, replacing the legacy Computer
// Vision call. Returns food items WITH model-estimated quantities so the
// frontend no longer defaults every item to a quantity of 1.
//
// Response shape is drop-in compatible with the old function:
//   { ok: true, tags: [ { name, confidence, quantity } ] }
// On failure it returns mock tags with usingMockData:true, matching prior
// behaviour so the frontend keeps working even if the AI call fails.
//
// The frontend posts the resized JPEG as the raw request body with
// Content-Type: application/octet-stream (see analyzeImageWithAI()).
//
// App settings consumed:
//   AZURE_OPENAI_ENDPOINT    e.g. https://oth-pataka-openai.openai.azure.com/
//   AZURE_OPENAI_DEPLOYMENT  e.g. gpt-5.4
//   AZURE_OPENAI_KEY         resource key
//
// Uses the Azure OpenAI v1 GA surface (.../openai/v1/chat/completions), where
// an api-version query parameter is not required.

const { app } = require('@azure/functions');
const { corsHeaders, preflight } = require('../shared/cors');

// Mock fallback, mirrors the old function so the frontend degrades gracefully.
const MOCK_TAGS = [
    { name: 'banana', confidence: 0.84, quantity: 1 },
    { name: 'apple', confidence: 0.78, quantity: 1 },
    { name: 'vegetable', confidence: 0.65, quantity: 1 }
];

// Strict JSON schema so the model returns exactly the shape we parse.
const FOOD_SCHEMA = {
    name: 'food_items',
    strict: true,
    schema: {
        type: 'object',
        properties: {
            items: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        quantity: { type: 'integer' },
                        confidence: { type: 'number' }
                    },
                    required: ['name', 'quantity', 'confidence'],
                    additionalProperties: false
                }
            }
        },
        required: ['items'],
        additionalProperties: false
    }
};

const SYSTEM_PROMPT =
    'You identify food items in a photo for a community food pantry app. ' +
    'Return ONLY food and drink items a person could donate or take. ' +
    'Ignore packaging text, backgrounds, hands, shelves and non-food objects. ' +
    'For each distinct food item give: a short lowercase name (e.g. "banana", ' +
    '"canned beans", "milk"), the quantity you can actually count in the image as ' +
    'an integer, and a confidence between 0 and 1. Count carefully: six bananas is ' +
    'quantity 6, not 1. If you cannot tell an item apart from another, merge them. ' +
    'If there is no food at all, return an empty items array.';

app.http('analyzeFood', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('analyzeFood (v4 / gpt-5.4) triggered');

        if (request.method === 'OPTIONS') {
            return preflight('POST');
        }

        try {
            // Raw binary image arrives as the request body (octet-stream).
            const imageBuffer = Buffer.from(await request.arrayBuffer());

            if (!imageBuffer || imageBuffer.length === 0) {
                return {
                    status: 400,
                    headers: corsHeaders('POST'),
                    jsonBody: { ok: false, error: 'No image data provided' }
                };
            }
            context.log('Image size:', imageBuffer.length, 'bytes');

            const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
            const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
            const key = process.env.AZURE_OPENAI_KEY;

            if (!endpoint || !deployment || !key) {
                throw new Error('Azure OpenAI settings not configured');
            }

            // Frontend resizes to a small JPEG before sending (~100KB), so we
            // label it image/jpeg. Well under the vision input size limit.
            const dataUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

            const url = `${endpoint.replace(/\/+$/, '')}/openai/v1/chat/completions`;

            const payload = {
                model: deployment,
                reasoning_effort: 'low', // light reasoning aids counting; tune later
                max_completion_tokens: 2000,
                response_format: { type: 'json_schema', json_schema: FOOD_SCHEMA },
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Identify and count the food items in this photo.' },
                            { type: 'image_url', image_url: { url: dataUrl } }
                        ]
                    }
                ]
            };

            const aiResponse = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'api-key': key },
                body: JSON.stringify(payload)
            });

            if (!aiResponse.ok) {
                const errText = await aiResponse.text();
                context.error('Azure OpenAI error:', aiResponse.status, errText);
                throw new Error(`Azure OpenAI returned ${aiResponse.status}`);
            }

            const data = await aiResponse.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                context.error('Empty content. finish_reason:', data.choices?.[0]?.finish_reason);
                throw new Error('Model returned no content');
            }

            const parsed = JSON.parse(content);
            const tags = (parsed.items || [])
                .filter(it => it && it.name && Number(it.quantity) > 0)
                .map(it => ({
                    name: String(it.name).toLowerCase(),
                    confidence: Math.max(0, Math.min(1, Number(it.confidence) || 0.8)),
                    quantity: Math.round(Number(it.quantity))
                }))
                .slice(0, 20);

            context.log(`gpt-5.4 returned ${tags.length} food item(s)`);

            return {
                status: 200,
                headers: corsHeaders('POST'),
                jsonBody: { ok: true, tags }
            };

        } catch (error) {
            context.error('Error in analyzeFood:', error);
            return {
                status: 500,
                headers: corsHeaders('POST'),
                jsonBody: {
                    ok: false,
                    error: error.message || 'Internal server error',
                    tags: MOCK_TAGS,
                    usingMockData: true
                }
            };
        }
    }
});
