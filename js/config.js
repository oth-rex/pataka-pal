// Configuration
const API_BASE_URL = 'https://oth-pataka-api-facpcna9c9hjc5dh.australiaeast-01.azurewebsites.net/api';
const COMPUTER_VISION_ENDPOINT = 'https://communitypantry-vision.cognitiveservices.azure.com/';

// Global state
let cupboards = [];
let isLoading = false;
let map = null;
let markersLayer = null;
let userLocation = null;
let qrScanner = null;
let selectedPataka = null;
let currentAction = null;
let actionData = {};
let dataLoadAttempts = 0;
let maxRetries = 3;

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
