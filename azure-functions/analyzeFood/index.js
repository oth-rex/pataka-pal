module.exports = async function (context, req) {
    context.log('analyzeFood function triggered');

    // CORS headers
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    };

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }

    try {
        // Get image data from request body
        // Azure Functions provides binary data directly in req.body
        const imageData = req.body;

        if (!imageData || imageData.length === 0) {
            context.res.status = 400;
            context.res.body = { 
                ok: false, 
                error: 'No image data provided' 
            };
            return;
        }

        context.log('Image size:', imageData.length, 'bytes');

        // Get Computer Vision credentials from environment variables
        const cvEndpoint = process.env.COMPUTER_VISION_ENDPOINT;
        const cvKey = process.env.COMPUTER_VISION_KEY;

        if (!cvEndpoint || !cvKey) {
            throw new Error('Computer Vision credentials not configured');
        }

        // Call Azure Computer Vision API
        const visionUrl = `${cvEndpoint}/vision/v3.2/analyze?visualFeatures=Tags`;
        
        const response = await fetch(visionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Ocp-Apim-Subscription-Key': cvKey
            },
            body: imageData
        });

        if (!response.ok) {
            const errorText = await response.text();
            context.log.error('Computer Vision API error:', response.status, errorText);
            throw new Error(`Computer Vision API returned ${response.status}`);
        }

        const cvResult = await response.json();
        context.log('Computer Vision raw result:', JSON.stringify(cvResult.tags?.slice(0, 10)));

        // Food-related keywords to filter by
        const foodKeywords = [
            'apple', 'banana', 'orange', 'lemon', 'lime', 'pear', 'grape', 'berry', 'fruit',
            'broccoli', 'carrot', 'potato', 'onion', 'tomato', 'lettuce', 'cabbage', 'vegetable',
            'bread', 'rice', 'pasta', 'cereal', 'noodle', 'flour', 'grain',
            'milk', 'cheese', 'egg', 'yogurt', 'butter', 'dairy',
            'chicken', 'beef', 'fish', 'tuna', 'salmon', 'meat',
            'bean', 'corn', 'pea', 'soup', 'sauce', 'can', 'canned',
            'food', 'produce', 'fresh', 'packaged', 'grocery'
        ];

        // Filter and format results
        const foodTags = (cvResult.tags || [])
            .filter(tag => {
                const name = tag.name.toLowerCase();
                // Check if tag matches any food keyword
                return foodKeywords.some(keyword => name.includes(keyword)) && tag.confidence > 0.5;
            })
            .map(tag => ({
                name: tag.name,
                confidence: Math.round(tag.confidence * 100) / 100
            }))
            .slice(0, 10); // Limit to top 10 results

        context.log(`Filtered to ${foodTags.length} food-related tags`);

        // Success response
        context.res.status = 200;
        context.res.body = {
            ok: true,
            tags: foodTags,
            originalTagCount: cvResult.tags?.length || 0
        };

    } catch (error) {
        context.log.error('Error in analyzeFood:', error);
        context.res.status = 500;
        context.res.body = {
            ok: false,
            error: error.message || 'Internal server error',
            // Include mock data as fallback so frontend can continue working
            tags: [
                { name: 'banana', confidence: 0.84 },
                { name: 'apple', confidence: 0.78 },
                { name: 'vegetable', confidence: 0.65 }
            ],
            usingMockData: true
        };
    }
};