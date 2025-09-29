// Utility functions
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                resolve(userLocation);
            },
            (error) => {
                console.warn('Geolocation failed, using default location:', error);
                userLocation = { lat: -39.0579, lng: 174.0806 };
                resolve(userLocation);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    });
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance < 1 ? Math.round(distance * 1000) + 'm' : distance.toFixed(1) + 'km';
}

function formatLastUpdated(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}

// Custom modal functions
function showCustomModal(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('customModal').classList.remove('hidden');
}

function hideCustomModal() {
    document.getElementById('customModal').classList.add('hidden');
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    setupNavigation();
    setupEventListeners();
    await switchToMap();
}

function setupNavigation() {
    const findTab = document.getElementById('findTab');
    const donateTab = document.getElementById('donateTab');
    const takeTab = document.getElementById('takeTab');
    const reportTab = document.getElementById('reportTab');

    findTab.addEventListener('click', () => {
        setActiveTab('find');
        switchToMap();
    });

    donateTab.addEventListener('click', () => {
        setActiveTab('donate');
        switchToDonate();
    });

    takeTab.addEventListener('click', () => {
        setActiveTab('take');
        switchToTake();
    });

    reportTab.addEventListener('click', () => {
        setActiveTab('report');
        switchToReport();
    });
}

function setActiveTab(tabName) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// View switching functions
async function switchToMap() {
    hideAllViews();
    document.getElementById('mapView').classList.remove('hidden');
    document.getElementById('searchContainer').classList.remove('hidden');
    document.getElementById('viewToggle').classList.remove('hidden');
    
    document.getElementById('mapBtn').classList.add('active');
    document.getElementById('listBtn').classList.remove('active');
    
    // Clear search when switching to map
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    
    if (!map) {
        await initializeMap();
    } else {
        await loadPatakasOnMap();
    }
}

async function switchToList() {
    hideAllViews();
    document.getElementById('listView').classList.remove('hidden');
    document.getElementById('searchContainer').classList.remove('hidden');
    document.getElementById('viewToggle').classList.remove('hidden');
    
    document.getElementById('listBtn').classList.add('active');
    document.getElementById('mapBtn').classList.remove('active');
    
    // Clear search when switching to list
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    
    await fetchCupboards();
    renderCupboards();
}

function switchToDonate() {
    currentAction = 'donate';
    hideAllViews();
    document.getElementById('donateView').classList.remove('hidden');
    resetDonateFlow();
    startQRScanner('donate-qr-scanner', 'donate');
}

function switchToTake() {
    currentAction = 'take';
    hideAllViews();
    document.getElementById('takeView').classList.remove('hidden');
    resetTakeFlow();
    startQRScanner('take-qr-scanner', 'take');
}

function switchToReport() {
    currentAction = 'report';
    hideAllViews();
    document.getElementById('reportView').classList.remove('hidden');
    resetReportFlow();
    startQRScanner('qr-scanner', 'report');
}

function hideAllViews() {
    document.getElementById('mapView').classList.add('hidden');
    document.getElementById('listView').classList.add('hidden');
    document.getElementById('donateView').classList.add('hidden');
    document.getElementById('takeView').classList.add('hidden');
    document.getElementById('reportView').classList.add('hidden');
    document.getElementById('searchContainer').classList.add('hidden');
    document.getElementById('viewToggle').classList.add('hidden');
}

// Setup event listeners
function setupEventListeners() {
        try { if (window.setupDonateEventListeners) window.setupDonateEventListeners(); } catch(e) { console.warn('Donate listeners not set:', e); }
        try { if (window.setupTakeEventListeners) window.setupTakeEventListeners(); } catch(e) { console.warn('Take listeners not set:', e); }

    // Modal
    document.getElementById('modalCloseBtn').addEventListener('click', hideCustomModal);
    document.getElementById('customModal').addEventListener('click', (e) => {
        if (e.target.id === 'customModal') hideCustomModal();
    });

    // Map/List toggle
    document.getElementById('mapBtn').addEventListener('click', switchToMap);
    document.getElementById('listBtn').addEventListener('click', switchToList);

    // Search functionality
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Photo handlers - will be defined in workflow files

    // Flow event listeners - will be defined in workflow files
    setupDonateEventListeners();
    setupTakeEventListeners();
    setupReportEventListeners();
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        renderCupboards(cupboards);
        // Reset map if in map view
        if (!document.getElementById('mapView').classList.contains('hidden')) {
            loadPatakasOnMap();
        }
    } else {
        const filteredCupboards = cupboards.filter(pataka => {
            const nameMatch = pataka.name.toLowerCase().includes(searchTerm);
            const addressMatch = pataka.address.toLowerCase().includes(searchTerm);
            const inventoryMatch = pataka.inventory && pataka.inventory.some(item => 
                item.Name && item.Name.toLowerCase().includes(searchTerm)
            );
            return nameMatch || addressMatch || inventoryMatch;
        });
        
        // If we're in Map View and user searches, switch to List View with results
        if (!document.getElementById('mapView').classList.contains('hidden')) {
            document.getElementById('mapView').classList.add('hidden');
            document.getElementById('listView').classList.remove('hidden');
            document.getElementById('mapBtn').classList.remove('active');
            document.getElementById('listBtn').classList.add('active');
        }
        
        // Update list view with filtered results
        renderCupboards(filteredCupboards);
    }
}

// Keep database awake with better error handling
setInterval(async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/getCupboards`, {
            method: 'HEAD', // Use HEAD to reduce bandwidth
            timeout: 5000
        });
        if (response.ok) {
            console.log('✅ Database kept awake');
        } else {
            console.log('⚠️ Database ping failed: HTTP', response.status);
        }
    } catch (error) {
        console.log('⚠️ Database ping failed:', error.message);
    }
}, 10 * 60 * 1000); // 10 minutes