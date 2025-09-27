/* ========================================
   CORE APPLICATION - GLOBAL VARIABLES & INITIALIZATION
   ======================================== */

// Global variables
let cupboards = [];
let selectedPataka = null;
let actionData = {};
let map = null;
let userLocation = null;
let isLoading = false;

// API Configuration
const API_BASE_URL = 'https://oth-pataka-api-facpcna9c9hjc5dh.australiaeast-01.azurewebsites.net/api';

/* ========================================
   INITIALIZATION
   ======================================== */

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🥫 Pātaka Pal App Loading...');
    
    try {
        // Setup PWA manifest
        setupPWAManifest();
        
        // Load pātaka data
        await fetchCupboards();
        
        // Setup all event listeners
        setupEventListeners();
        
        // Initialize map and list views
        initializeViews();
        
        console.log('✅ App initialized successfully');
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        showCustomModal('Initialization Error', 'Failed to load app. Please refresh the page.');
    }
});

/* ========================================
   PWA MANIFEST SETUP
   ======================================== */

function setupPWAManifest() {
    const manifest = {
        name: "Pātaka Pal",
        short_name: "PātakaPal",
        description: "Find and share food in your neighbourhood",
        start_url: "./",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#289DA7",
        orientation: "portrait",
        icons: [
            {
                src: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iOTYiIGN5PSI5NiIgcj0iOTYiIGZpbGw9IiMyODlEQTciLz48dGV4dCB4PSI5NiIgeT0iMTEwIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+lqzwvdGV4dD48L3N2Zz4=",
                sizes: "192x192",
                type: "image/svg+xml"
            }
        ]
    };
    
    const manifestBlob = new Blob([JSON.stringify(manifest)], {type: 'application/json'});
    const manifestURL = URL.createObjectURL(manifestBlob);
    
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestURL;
    document.head.appendChild(link);
}

/* ========================================
   DATA LOADING FUNCTIONS
   ======================================== */

async function fetchCupboards() {
    if (isLoading) return cupboards;
    
    try {
        isLoading = true;
        console.log('📡 Loading pātaka data...');
        
        const response = await fetch(`${API_BASE_URL}/getCupboards`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        cupboards = data.map(pataka => ({
            id: pataka.id,
            name: pataka.name,
            address: pataka.address,
            distance: userLocation ? 
                calculateDistance(userLocation.lat, userLocation.lng, pataka.latitude, pataka.longitude) : 
                'N/A',
            status: pataka.status,
            lastUpdated: formatLastUpdated(pataka.lastUpdated),
            latitude: pataka.latitude,
            longitude: pataka.longitude,
            inventory: (pataka.inventory || []).map(item => {
                const itemName = item.Name || item.name || '';
                const itemCategory = item.Category || item.category || '';
                return { Name: itemName, Category: itemCategory };
            })
        }));
        
        console.log(`✅ Loaded ${cupboards.length} pātaka locations`);
        
        // Update UI
        renderCupboards(cupboards);
        
        return cupboards;
        
    } catch (error) {
        console.error('❌ Error loading cupboards:', error);
        
        // Fallback to test data if API fails
        cupboards = getTestData();
        renderCupboards(cupboards);
        
        showCustomModal('Connection Error', 'Unable to load latest data. Showing cached information.');
    } finally {
        isLoading = false;
    }
}

function getTestData() {
    return [
        {
            id: 1,
            name: "Bell Block Community Pātaka",
            address: "14 Nugent St, Bell Block",
            latitude: -39.0631,
            longitude: 174.1062,
            status: "Available",
            inventory: []
        },
        {
            id: 2,
            name: "Marfell Neighbourhood Pātaka",
            address: "53 Endeavour St, Marfell",
            latitude: -39.0421,
            longitude: 174.0523,
            status: "Available",
            inventory: []
        },
        {
            id: 3,
            name: "Waitara Foodbank Pātaka",
            address: "5 West Quay, Waitara",
            latitude: -38.9985,
            longitude: 174.2341,
            status: "Available",
            inventory: []
        }
    ];
}

/* ========================================
   TAB NAVIGATION
   ======================================== */

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            setActiveTab(tabName);
        });
    });
    
    // Modal events
    document.getElementById('modalCloseBtn').addEventListener('click', hideCustomModal);
    document.getElementById('customModal').addEventListener('click', (e) => {
        if (e.target.id === 'customModal') hideCustomModal();
    });
    
    // Map/List toggle
    document.getElementById('mapBtn').addEventListener('click', switchToMap);
    document.getElementById('listBtn').addEventListener('click', switchToList);
    
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Photo handlers
    setupPhotoHandlers('donate');
    setupPhotoHandlers('take');
    setupPhotoHandlers('report');
}

function setActiveTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}View`).classList.add('active');
    
    // Initialize tab-specific functionality
    switch(tabName) {
        case 'find':
            // Already initialized
            break;
        case 'donate':
            resetDonateFlow();
            break;
        case 'take':
            resetTakeFlow();
            break;
        case 'report':
            resetReportFlow();
            break;
    }
}

/* ========================================
   VIEW MANAGEMENT
   ======================================== */

function initializeViews() {
    // Initialize with map view
    switchToMap();
}

function switchToMap() {
    document.getElementById('mapView').classList.remove('hidden');
    document.getElementById('listView').classList.add('hidden');
    document.getElementById('mapBtn').classList.add('active');
    document.getElementById('listBtn').classList.remove('active');
    
    // Initialize map if needed
    if (!map) {
        initializeMap();
    }
    
    // Load pātaka markers
    loadPatakasOnMap();
}

function switchToList() {
    document.getElementById('mapView').classList.add('hidden');
    document.getElementById('listView').classList.remove('hidden');
    document.getElementById('mapBtn').classList.remove('active');
    document.getElementById('listBtn').classList.add('active');
    
    // Refresh list view
    renderCupboards(cupboards);
}

/* ========================================
   SEARCH FUNCTIONALITY
   ======================================== */

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        renderCupboards(cupboards);
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
        
        // Switch to list view for search results
        if (!document.getElementById('mapView').classList.contains('hidden')) {
            switchToList();
        }
        
        renderCupboards(filteredCupboards);
    }
}

/* ========================================
   LIST VIEW RENDERING
   ======================================== */

function renderCupboards(cupboardsToRender) {
    const cupboardsList = document.getElementById('cupboardsList');
    
    if (!cupboardsToRender || cupboardsToRender.length === 0) {
        cupboardsList.innerHTML = `
            <div class="no-results">
                <h3>No pātaka found</h3>
                <p>Try adjusting your search or check back later.</p>
            </div>
        `;
        return;
    }
    
    cupboardsList.innerHTML = cupboardsToRender.map(cupboard => {
        const statusClass = cupboard.status === 'Available' ? 'status-available' : 'status-empty';
        const inventoryText = cupboard.inventory && cupboard.inventory.length > 0 
            ? cupboard.inventory.map(item => `${item.Name}`).join(', ')
            : 'No items listed';
            
        return `
            <div class="cupboard-card" onclick="selectCupboardFromList(${cupboard.id})">
                <h3>${cupboard.name}</h3>
                <p>📍 ${cupboard.address}</p>
                <p>🥫 ${inventoryText}</p>
                <span class="cupboard-status ${statusClass}">${cupboard.status}</span>
            </div>
        `;
    }).join('');
}

function selectCupboardFromList(cupboardId) {
    const cupboard = cupboards.find(c => c.id === cupboardId);
    if (cupboard) {
        showCupboardDetails(cupboard);
    }
}

function showCupboardDetails(cupboard) {
    const inventoryText = cupboard.inventory && cupboard.inventory.length > 0 
        ? cupboard.inventory.map(item => `• ${item.Name}`).join('\n')
        : 'No items currently listed';
        
    const message = `
        📍 ${cupboard.address}
        
        🥫 Current Inventory:
        ${inventoryText}
        
        Status: ${cupboard.status}
    `;
    
    showCustomModal(cupboard.name, message);
}

function showPatakaDetailsByName(name) {
    const pataka = cupboards.find(p => p.name === name);
    if (pataka) {
        switchToList();
        setTimeout(() => {
            const cards = document.querySelectorAll('.cupboard-card');
            cards.forEach(card => {
                if (card.textContent.includes(name)) {
                    card.style.backgroundColor = '#fff3cd';
                    card.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }, 100);
    }
}

/* ========================================
   UTILITY FUNCTIONS
   ======================================== */

function showCustomModal(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('customModal').classList.remove('hidden');
}

function hideCustomModal() {
    document.getElementById('customModal').classList.add('hidden');
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal
}

function formatLastUpdated(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
}

function getItemEmoji(itemName) {
    const emojiMap = {
        'apple': '🍎', 'apples': '🍎',
        'banana': '🍌', 'bananas': '🍌',
        'bread': '🍞',
        'milk': '🥛',
        'cheese': '🧀',
        'meat': '🥩',
        'fish': '🐟',
        'vegetables': '🥕', 'vegetable': '🥕',
        'fruit': '🍇', 'fruits': '🍇',
        'rice': '🍚',
        'pasta': '🍝',
        'beans': '🫘',
        'soup': '🍲',
        'cereal': '🥣',
        'juice': '🧃',
        'water': '💧',
        'egg': '🥚', 'eggs': '🥚'
    };
    
    const key = itemName.toLowerCase();
    return emojiMap[key] || '🥫';
}

async function populatePatakaDropdown(selectId) {
    await fetchCupboards();
    const select = document.getElementById(selectId);
    
    select.innerHTML = '<option value="">Choose a pataka...</option>';
    
    cupboards.forEach(pataka => {
        const option = document.createElement('option');
        option.value = pataka.id;
        option.textContent = `${pataka.name} - ${pataka.address}`;
        select.appendChild(option);
    });
}

/* ========================================
   PHOTO HANDLING
   ======================================== */

function setupPhotoHandlers(actionType) {
    const takeBtn = document.getElementById(`${actionType}TakePhotoBtn`);
    const selectBtn = document.getElementById(`${actionType}SelectPhotoBtn`);
    const takeInput = document.getElementById(`${actionType}TakePhotoInput`);
    const selectInput = document.getElementById(`${actionType}SelectPhotoInput`);
    
    if (takeBtn) takeBtn.addEventListener('click', () => takeInput?.click());
    if (selectBtn) selectBtn.addEventListener('click', () => selectInput?.click());
    
    if (takeInput) takeInput.addEventListener('change', (e) => handlePhotoSelection(e, actionType));
    if (selectInput) selectInput.addEventListener('change', (e) => handlePhotoSelection(e, actionType));
}

function handlePhotoSelection(e, actionType) {
    const file = e.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            showCustomModal('Invalid File', 'Please select an image file');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showCustomModal('File Too Large', 'Image size must be less than 5MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(`${actionType}PhotoPreview`);
            const container = document.getElementById(`${actionType}PhotoPreviewContainer`);
            if (preview && container) {
                preview.src = e.target.result;
                container.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
        
        actionData.photo = file;
    }
}

/* ========================================
   WORKFLOW RESET FUNCTIONS
   ======================================== */

function resetDonateFlow() {
    document.querySelectorAll('#donateView .action-section').forEach(section => section.classList.remove('active'));
    document.getElementById('donateSection1').classList.add('active');
    
    document.querySelectorAll('#donateView .step').forEach(step => step.classList.remove('active', 'completed'));
    document.getElementById('donateStep1').classList.add('active');
    
    selectedPataka = null;
    actionData = {};
}

function resetTakeFlow() {
    document.querySelectorAll('#takeView .action-section').forEach(section => section.classList.remove('active'));
    document.getElementById('takeSection1').classList.add('active');
    
    document.querySelectorAll('#takeView .step').forEach(step => step.classList.remove('active', 'completed'));
    document.getElementById('takeStep1').classList.add('active');
    
    selectedPataka = null;
    actionData = {};
}

function resetReportFlow() {
    document.querySelectorAll('#reportView .action-section').forEach(section => section.classList.remove('active'));
    document.getElementById('reportSection1').classList.add('active');
    
    document.querySelectorAll('#reportView .step').forEach(step => step.classList.remove('active', 'completed'));
    document.getElementById('step1').classList.add('active');
    
    selectedPataka = null;
    actionData = {};
}
