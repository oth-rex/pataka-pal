// Mutable application state (single object for ES6 module compatibility)
// Mutable application state (single object for ES6 module compatibility)
const state = {
    cupboards: [],
    isLoading: false,
    map: null,
    markersLayer: null,
    userLocation: null,
    qrScanner: null,
    selectedPataka: null,
    currentAction: null,
    actionData: {},
    dataLoadAttempts: 0,
    maxRetries: 3
};

// Configuration constants
const API_BASE_URL = 'https://oth-pataka-api-v4-cegydyaacugrcygz.australiaeast-01.azurewebsites.net/api';
const COMPUTER_VISION_ENDPOINT = 'https://communitypantry-vision.cognitiveservices.azure.com/';

// Food emoji mapping
const emojiMap = {
    'Canned Goods': '🥫', 'Fresh Produce': '🍎', 'Packaged Foods': '📦',
    'Dairy': '🥛', 'Bakery': '🍞', 'Other': '🍯',
    'apple': '🍎', 'banana': '🍌', 'orange': '🍊', 'lemon': '🍋',
    'broccoli': '🥦', 'carrot': '🥕', 'potato': '🥔', 'onion': '🧅',
    'bread': '🍞', 'rice': '🍚', 'pasta': '🍝', 'cereal': '🥣',
    'milk': '🥛', 'egg': '🥚', 'cheese': '🧀', 'yogurt': '🍨',
    'vegetable': '🥬', 'fruit': '🍎', 'food': '🍽️'
};

// Food whitelist for filtering AI results
const foodWhitelist = [
    'apple', 'banana', 'orange', 'lemon', 'lime', 'pear', 'grape', 'berry',
    'broccoli', 'carrot', 'potato', 'onion', 'tomato', 'lettuce', 'cabbage',
    'bread', 'rice', 'pasta', 'cereal', 'noodle', 'flour',
    'milk', 'cheese', 'egg', 'yogurt', 'butter',
    'chicken', 'beef', 'fish', 'tuna', 'salmon',
    'bean', 'corn', 'pea', 'soup', 'sauce', 'vegetable', 'fruit'
];

// Utility functions for configuration data
function getItemEmoji(itemName, category) {
    const name = itemName.toLowerCase();
    return emojiMap[name] || emojiMap[category] || '🍽️';
}

function getStatusColor(status) {
    switch(status.toLowerCase()) {
        case 'empty': return '#f44336';
        case 'low': return '#ff9800';
        default: return '#289DA7';
    }
}
// Export for ES6 modules
export { 
    state,  // ← The state object!
    API_BASE_URL,
    COMPUTER_VISION_ENDPOINT,
    emojiMap,
    foodWhitelist,
    getItemEmoji,
    getStatusColor
};