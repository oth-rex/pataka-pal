// Import from config.js
import { 
    API_BASE_URL,
    cupboards, 
    isLoading, 
    map, 
    markersLayer, 
    userLocation,
    getItemEmoji
} from './config.js';

// Import from app-core.js
import {
    showCustomModal
} from './app-core.js';

// Map and data functions
async function initializeMap() {
    try {
        // Show loading indicator
        const mapLoading = document.getElementById('mapLoading');
        mapLoading.classList.remove('hidden');

        // Initialize Leaflet map with better error handling
        map = L.map('azureMap', {
            maxZoom: 18,
            minZoom: 3
        }).setView([-39.057, 174.075], 12);

        // Add OpenStreetMap tiles with error handling
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            subdomains: ['a', 'b', 'c']
        });

        tileLayer.on('tileerror', function(error) {
            console.error('Tile loading error:', error);
        });

        tileLayer.on('tileload', function() {
            // Hide loading indicator when first tiles load
            setTimeout(() => {
                mapLoading.classList.add('hidden');
            }, 1000);
        });

        tileLayer.addTo(map);

        // Add marker click event handler
        document.getElementById('azureMap').addEventListener('click', (e) => {
            const btn = e.target.closest('.popup-details-btn');
            if (!btn) return;
            const name = btn.getAttribute('data-pataka-name');
            showPatakaDetailsByName(name);
        });

        // Load pataka locations
        await loadPatakasOnMap();

        // Hide loading after setup complete
        setTimeout(() => {
            mapLoading.classList.add('hidden');
        }, 2000);

    } catch (error) {
        console.error('Error initializing map:', error);
        document.getElementById('mapLoading').innerHTML = 
            '<div style="color: #f44336;">Error loading map</div>';
    }
}

async function fetchCupboards() {
    if (isLoading) return cupboards;
    
    try {
        isLoading = true;
        dataLoadAttempts++;
        
        // Show additional loading info for long delays
        if (dataLoadAttempts === 1) {
            const loadingInfo = document.getElementById('loadingInfo');
            if (loadingInfo) {
                loadingInfo.classList.remove('hidden');
            }
        }
        
        await getUserLocation();
        
        console.log(`Attempting to fetch cupboards (attempt ${dataLoadAttempts})...`);
        const response = await fetch(`${API_BASE_URL}/getCupboards`, {
            timeout: 60000, // 60 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Successfully fetched cupboards:', data);
        
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
        
        // Hide loading info on success
        const loadingInfo = document.getElementById('loadingInfo');
        if (loadingInfo) {
            loadingInfo.classList.add('hidden');
        }
        
        return cupboards;
        
    } catch (error) {
        console.error('Error fetching cupboards:', error);
        
        // Retry logic for failed requests
        if (dataLoadAttempts < maxRetries) {
            console.log(`Retrying in 5 seconds... (${dataLoadAttempts}/${maxRetries})`);
            setTimeout(() => {
                fetchCupboards();
            }, 5000);
        } else {
            // Show error message after max retries
            const listContainer = document.getElementById('listView');
            const loading = document.getElementById('loading');
            if (loading) loading.style.display = 'none';
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.innerHTML = `
                <h3>⚠️ Connection Error</h3>
                <p>Unable to load patakas. Please check your internet connection and try again.</p>
                <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; background: #289DA7; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Retry
                </button>
            `;
            listContainer.appendChild(errorDiv);
        }
        
        cupboards = [];
        return cupboards;
    } finally {
        isLoading = false;
    }
}

async function loadPatakasOnMap() {
    try {
        // Ensure up-to-date cupboards
        await fetchCupboards();

        // Create/clear a dedicated layer for markers
        if (!markersLayer) {
            markersLayer = L.layerGroup().addTo(map);
        } else {
            markersLayer.clearLayers();
        }

        const bounds = [];

        (cupboards || []).forEach(pataka => {
            if (typeof pataka.latitude !== "number" || typeof pataka.longitude !== "number") return;

            // Create marker with better styling
            const marker = L.marker([pataka.latitude, pataka.longitude], {
                title: pataka.name
            }).addTo(markersLayer);
            
            bounds.push([pataka.latitude, pataka.longitude]);

            // Create popup with better styling
            const popupContent = `
                <div style="min-width: 150px;">
                    <h3 style="margin:0 0 8px 0; font-size: 1rem;">${pataka.name}</h3>
                    <p style="margin: 4px 0; color: #666; font-size: 0.9rem;">📍 ${pataka.address}</p>
                    <button class="popup-details-btn" 
                            data-pataka-name="${pataka.name}"
                            style="margin-top: 10px; padding: 8px 16px; background: #289DA7; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.9rem;">
                        View details
                    </button>
                </div>
            `;

            marker.bindPopup(popupContent, {
                maxWidth: 200,
                className: 'custom-popup'
            });
        });

        // Fit map to show all markers if any exist
        if (bounds.length > 0) {
            map.fitBounds(bounds, { 
                padding: [20, 20],
                maxZoom: 15 
            });
        }

        console.log(`Loaded ${cupboards.length} pataka markers on map`);

    } catch (error) {
        console.error('Error loading map locations:', error);
    }
}

function renderCupboards(filteredCupboards = cupboards) {
    const listContainer = document.getElementById('listView');
    const loading = document.getElementById('loading');
    const loadingInfo = document.getElementById('loadingInfo');
    
    // Hide loading indicators
    if (loading) loading.style.display = 'none';
    if (loadingInfo) loadingInfo.classList.add('hidden');
    
    // Remove existing cards
    const existingCards = listContainer.querySelectorAll('.cupboard-card');
    existingCards.forEach(card => card.remove());

    // Remove existing error/no-results messages
    const existingMessages = listContainer.querySelectorAll('.no-results, .error-message');
    existingMessages.forEach(msg => msg.remove());

    if (filteredCupboards.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = '🔍 No patakas found matching your search';
        listContainer.appendChild(noResults);
        return;
    }

    filteredCupboards.forEach(pataka => {
        const card = createCupboardCard(pataka);
        listContainer.appendChild(card);
    });

    console.log(`Rendered ${filteredCupboards.length} pataka cards`);
}

function createCupboardCard(pataka) {
    const card = document.createElement('div');
    card.className = 'cupboard-card';
    card.dataset.patakaName = pataka.name; // so we can find this card later

    // --- Derive status from inventory presence ---
    const hasInventoryArray = Array.isArray(pataka.inventory);
    let derivedStatus = 'well'; // default
    if (!hasInventoryArray) {
        derivedStatus = 'unknown';
    } else if (pataka.inventory.length === 0) {
        derivedStatus = 'empty';
    } else if (typeof pataka.status === 'string' && pataka.status.trim() !== '') {
        derivedStatus = pataka.status.toLowerCase();
    }

    const statusClass = derivedStatus === 'empty' ? 'empty' :
                        derivedStatus === 'low' ? 'low' :
                        derivedStatus === 'unknown' ? 'unknown' : '';

    const statusText = derivedStatus === 'empty' ? 'Empty' :
                       derivedStatus === 'low' ? 'Low Stock' :
                       derivedStatus === 'unknown' ? 'Status Unknown' : 'Well Stocked';

    const previewItems = hasInventoryArray ? pataka.inventory.slice(0, 4) : [];

    card.innerHTML = `
        <div class="cupboard-header">
            <div class="cupboard-name">${pataka.name}</div>
            <div class="distance">${pataka.distance}</div>
        </div>
        <div class="cupboard-address">📍 ${pataka.address}</div>
        <div class="status-indicator">
            <div class="status-dot ${statusClass}"></div>
            <div class="status-text">${statusText}</div>
            <div style="margin-left: auto; font-size: 0.8rem; color: #999;">
                Updated ${pataka.lastUpdated}
            </div>
        </div>
        ${
            // Preview logic
            hasInventoryArray
                ? (previewItems.length > 0
                    ? `<div class="food-preview">
                           ${
                               previewItems.map(item => {
                                   const itemEmoji = getItemEmoji(item.Name, item.Category);
                                   return `<span class="food-tag">${itemEmoji} ${item.Name}</span>`;
                               }).join('')
                           }
                           ${
                               pataka.inventory.length > 4
                                   ? `<span class="food-tag">+${pataka.inventory.length - 4} more</span>`
                                   : ''
                           }
                       </div>`
                    : '<div style="color: #999; font-style: italic;">No items currently available</div>'
                  )
                : '<div style="color: #999; font-style: italic;">Inventory status is unknown</div>'
        }
    `;

    // Clicking the card toggles the detail section
    card.addEventListener('click', () => {
        toggleInventoryDetail(card, pataka);
    });

    return card;
}

function toggleInventoryDetail(card, pataka) {
    const existingDetail = card.querySelector('.inventory-detail');
    if (existingDetail) {
        existingDetail.remove();
        return;
    }

    const detailDiv = document.createElement('div');
    detailDiv.className = 'inventory-detail show';

    const hasInventoryArray = Array.isArray(pataka.inventory);
    if (hasInventoryArray && pataka.inventory.length > 0) {
        detailDiv.innerHTML = `
            <h4 style="margin: 0 0 10px 0; color: #289DA7;">Inventory:</h4>
            <div class="inventory-grid">
                ${
                    pataka.inventory.map(item => {
                        const itemEmoji = getItemEmoji(item.Name, item.Category);
                        return `
                            <div class="inventory-item">
                                <span class="item-emoji">${itemEmoji}</span>
                                <div class="item-name">${item.Name}</div>
                                <div class="item-count">${item.Quantity || 1} available</div>
                            </div>
                        `;
                    }).join('')
                }
            </div>
        `;
    } else if (hasInventoryArray && pataka.inventory.length === 0) {
        detailDiv.innerHTML = `
            <h4 style="margin: 0 0 10px 0; color: #999;">No items currently available</h4>
            <p style="color: #666; font-size: 0.9rem;">This pataka appears to be empty. Consider donating something!</p>
        `;
    } else {
        detailDiv.innerHTML = `
            <h4 style="margin: 0 0 10px 0; color: #999;">Inventory status is unknown</h4>
            <p style="color: #666; font-size: 0.9rem;">No inventory data has been received yet. Please check the pataka or try again later.</p>
        `;
    }

    card.appendChild(detailDiv);
}

async function showPatakaDetailsByName(patakaName) {
    // Go to List view so the card is visible
    await switchToList();
    // Find the pataka object and its card
    const pataka = (cupboards || []).find(p => p.name === patakaName);
    const cards = document.querySelectorAll('.cupboard-card');
    const card = Array.from(cards).find(c => c.dataset.patakaName === patakaName);
    if (card && pataka) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Move the selected card to the very top of the list
        const listContainer = document.getElementById('listView');
        if (listContainer && card.parentElement === listContainer) {
            listContainer.insertBefore(card, listContainer.firstChild);
        }

        // Apply a visible yellow highlight for a few seconds
        card.classList.add('selected-highlight');
        setTimeout(() => card.classList.remove('selected-highlight'), 4500);
        
        // highlight the card for a moment
        card.classList.add('highlighted');
        setTimeout(() => card.classList.remove('highlighted'), 2500);
        
        // ensure only one detail block is open
        const existing = card.querySelector('.inventory-detail');
        if (existing) existing.remove();
        toggleInventoryDetail(card, pataka);
    } else {
        console.warn('Pataka card not found for name:', patakaName);
    }
}
// Export for ES6 modules
export {
    initializeMap,
    fetchCupboards,
    loadPatakasOnMap,
    renderCupboards,
    createCupboardCard,
    toggleInventoryDetail,
    showPatakaDetailsByName
};