/* ========================================
   MAP FUNCTIONS MODULE
   ======================================== */

let mapMarkers = [];

/* ========================================
   MAP INITIALIZATION
   ======================================== */

function initializeMap() {
    try {
        // Initialize Leaflet map centered on Taranaki - CORRECT ELEMENT ID
        map = L.map('azureMap').setView([-39.057, 174.075], 12);

        // Add OpenStreetMap tiles (free)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Catch clicks from any marker popup buttons
        document.getElementById('azureMap').addEventListener('click', (e) => {
            const btn = e.target.closest('.popup-details-btn');
            if (!btn) return;
            const name = btn.getAttribute('data-pataka-name');
            showPatakaDetailsByName(name);
        });

        console.log('✅ Map initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing map:', error);
        showCustomModal('Map Error', 'Unable to initialize map. Please try refreshing the page.');
    }
}

/* ========================================
   PATAKA MARKERS
   ======================================== */

async function loadPatakasOnMap() {
    try {
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
        
    } catch (error) {
        console.error('❌ Error loading pātaka on map:', error);
    }
}

function addPatakaMarker(pataka) {
    try {
        // Use default Leaflet marker (blue pin)
        const marker = L.marker([pataka.latitude, pataka.longitude]).addTo(map);
        
        // Create popup content with View Details button
        const inventoryText = pataka.inventory && pataka.inventory.length > 0 
            ? pataka.inventory.map(item => `${item.Name}`).join(', ')
            : 'No items currently listed';
            
        const statusClass = pataka.status === 'Available' ? 'status-available' : 'status-empty';
        
        const popupContent = `
            <div style="max-width: 200px;">
                <h4 style="color: #289DA7; margin-bottom: 8px; font-size: 1rem;">
                    ${pataka.name}
                </h4>
                <p style="margin: 4px 0; color: #666; font-size: 0.85rem;">
                    📍 ${pataka.address}
                </p>
                <div style="margin: 8px 0;">
                    <span style="display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; ${statusClass === 'status-available' ? 'background: #e8f5e9; color: #2e7d32;' : 'background: #ffebee; color: #c62828;'}">
                        ${pataka.status}
                    </span>
                </div>
                <div style="text-align: center; margin-top: 10px;">
                    <button class="popup-details-btn" data-pataka-name="${pataka.name}" style="background: #289DA7; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-size: 0.8rem;">
                        View details
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

function clearMapMarkers() {
    mapMarkers.forEach(marker => {
        if (map) {
            map.removeLayer(marker);
        }
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
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
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

async function getUserLocation() {
    try {
        userLocation = await getCurrentLocation();
        console.log('✅ User location obtained');
    } catch (error) {
        console.warn('❌ Could not get user location:', error.message);
        userLocation = null;
    }
}

async function showUserLocationOnMap() {
    try {
        const location = await getCurrentLocation();
        
        // Add user location marker
        addLocationMarker(location.lat, location.lng, 'You are here');
        
        // Center map on user location
        centerMapOnLocation(location.lat, location.lng);
        
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
        const location = await getCurrentLocation();
        
        if (!cupboards || cupboards.length === 0) {
            throw new Error('No pātaka data available');
        }
        
        let nearestPataka = null;
        let shortestDistance = Infinity;
        
        cupboards.forEach(pataka => {
            if (pataka.latitude && pataka.longitude) {
                const distance = calculateDistance(
                    location.lat, 
                    location.lng,
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
