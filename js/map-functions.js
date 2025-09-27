/* ========================================
   MAP FUNCTIONS MODULE
   ======================================== */

let mapMarkers = [];

/* ========================================
   MAP INITIALIZATION
   ======================================== */

function initializeMap() {
    try {
        // Initialize Leaflet map centered on Taranaki
        map = L.map('map').setView([-39.0631, 174.1062], 12);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);
        
        // Custom marker icon for pātaka
// Use default Leaflet markers instead of custom food can icons
// Remove the custom patakaIcon creation completely
// The addPatakaMarker function should use default markers

console.log('✅ Map initialized successfully');
        
        // Store icon for later use
        window.patakaIcon = patakaIcon;
        
        console.log('✅ Map initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing map:', error);
        showCustomModal('Map Error', 'Unable to initialize map. Please try refreshing the page.');
    }
}

/* ========================================
   PATAKA MARKERS
   ======================================== */

function loadPatakasOnMap() {
    if (!map) {
        console.warn('Map not initialized');
        return;
    }
    
    // Clear existing markers
    clearMapMarkers();
    
    if (!cupboards || cupboards.length === 0) {
        console.warn('No pātaka data to display on map');
        return;
    }
    
    cupboards.forEach(pataka => {
        if (pataka.latitude && pataka.longitude) {
            addPatakaMarker(pataka);
        }
    });
    
    // Fit map to show all markers
    if (mapMarkers.length > 0) {
        const group = new L.featureGroup(mapMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
    
    console.log(`✅ Added ${mapMarkers.length} pātaka markers to map`);
}

function addPatakaMarker(pataka) {
    try {
        // Use default Leaflet marker (blue pin)
        const marker = L.marker([pataka.latitude, pataka.longitude]).addTo(map);
        
        // Create popup content with View Details button
        const inventoryText = pataka.inventory && pataka.inventory.length > 0 
            ? pataka.inventory.map(item => `• ${item.Name}: ${item.Quantity}`).join('<br>')
            : 'No items currently listed';
            
        const statusClass = pataka.status === 'Available' ? 'status-available' : 'status-empty';
        
        const popupContent = `
            <div style="max-width: 250px;">
                <h3 style="color: #289DA7; margin-bottom: 10px; font-size: 1.1rem;">
                    ${pataka.name}
                </h3>
                <p style="margin-bottom: 8px; color: #666; font-size: 0.9rem;">
                    📍 ${pataka.address}
                </p>
                <div style="margin-bottom: 10px;">
                    <strong>Current Inventory:</strong><br>
                    <span style="font-size: 0.85rem;">${inventoryText}</span>
                </div>
                <div style="text-align: center; margin-top: 10px;">
                    <span style="display: inline-block; padding: 4px 8px; border-radius: 15px; font-size: 0.8rem; font-weight: 600; ${statusClass === 'status-available' ? 'background: #e8f5e9; color: #2e7d32;' : 'background: #ffebee; color: #c62828;'}">
                        ${pataka.status}
                    </span>
                    <br><br>
                    <button onclick="viewPatakaDetails(${pataka.id})" style="background: #289DA7; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">
                        View Details
                    </button>
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        mapMarkers.push(marker);
        
    } catch (error) {
        console.error('❌ Error adding marker for pātaka:', pataka.name, error);
    }
}

// Add this function to handle the View Details button
function viewPatakaDetails(patakaId) {
    switchToList();
    // Highlight the specific pataka in list view
    setTimeout(() => {
        const cards = document.querySelectorAll('.cupboard-card');
        cards.forEach(card => {
            if (card.onclick && card.onclick.toString().includes(patakaId)) {
                card.style.backgroundColor = '#fff3cd';
                card.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }, 100);
}

function clearMapMarkers() {
    mapMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    mapMarkers = [];
}

/* ========================================
   MAP UTILITIES
   ======================================== */

function centerMapOnLocation(latitude, longitude, zoom = 15) {
    if (!map) {
        console.warn('Map not initialized');
        return;
    }
    
    map.setView([latitude, longitude], zoom);
}

function addLocationMarker(latitude, longitude, popupText = 'Your Location') {
    if (!map) {
        console.warn('Map not initialized');
        return;
    }
    
    const userIcon = L.divIcon({
        html: `
            <div style="
                background: #ff4444;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                border: 3px solid white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            "></div>
        `,
        className: 'user-location-icon',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
    });
    
    const marker = L.marker([latitude, longitude], { icon: userIcon })
        .addTo(map)
        .bindPopup(popupText);
        
    return marker;
}

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            error => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    });
}

async function showUserLocationOnMap() {
    try {
        const location = await getCurrentLocation();
        
        // Add user location marker
        addLocationMarker(location.latitude, location.longitude, 'You are here');
        
        // Center map on user location
        centerMapOnLocation(location.latitude, location.longitude);
        
        console.log('✅ User location added to map');
        
    } catch (error) {
        console.warn('❌ Could not get user location:', error.message);
        // Don't show error to user as location is optional
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
}

async function findNearestPataka() {
    try {
        const userLocation = await getCurrentLocation();
        
        if (!cupboards || cupboards.length === 0) {
            throw new Error('No pātaka data available');
        }
        
        let nearestPataka = null;
        let shortestDistance = Infinity;
        
        cupboards.forEach(pataka => {
            if (pataka.latitude && pataka.longitude) {
                const distance = calculateDistance(
                    userLocation.latitude, 
                    userLocation.longitude,
                    pataka.latitude,
                    pataka.longitude
                );
                
                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    nearestPataka = pataka;
                }
            }
        });
        
        if (nearestPataka) {
            return {
                pataka: nearestPataka,
                distance: shortestDistance
            };
        } else {
            throw new Error('No pātaka with valid coordinates found');
        }
        
    } catch (error) {
        console.error('❌ Error finding nearest pātaka:', error);
        throw error;
    }
}

/* ========================================
   MAP RESIZE HANDLER
   ======================================== */

function resizeMap() {
    if (map) {
        // Invalidate map size when container changes
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }
}

// Add resize listener for when map tab becomes active
document.addEventListener('DOMContentLoaded', function() {
    // Listen for tab changes to resize map
    new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'class' &&
                mutation.target.id === 'findView' &&
                mutation.target.classList.contains('active')) {
                resizeMap();
            }
        });
    }).observe(document.body, {
        attributes: true,
        subtree: true
    });
});
