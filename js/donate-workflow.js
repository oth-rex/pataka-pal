// Import from config.js
import { state, API_BASE_URL, getItemEmoji, foodWhitelist } from './config.js';

// Import from app-core.js
import { showCustomModal, setActiveTab, switchToMap } from './app-core.js';

// Import from qr-scanner.js
import { stopQRScanner, startQRScanner } from './qr-scanner.js';

// Import from map-functions.js
import { fetchCupboards } from './map-functions.js';

// Flow reset function
function resetDonateFlow() {
    document.querySelectorAll('#donateView .action-section').forEach(section => section.classList.remove('active'));
    document.getElementById('donateSection1').classList.add('active');
    
    document.querySelectorAll('#donateView .step').forEach(step => step.classList.remove('active', 'completed'));
    document.getElementById('donateStep1').classList.add('active');
    
    state.selectedPataka = null;
    state.actionData = {};
}

// Navigation functions
function proceedToDonatePhoto() {
    document.getElementById('donateSelectedPatakaName').textContent = state.selectedPataka.name;
    
    document.getElementById('donateSection1').classList.remove('active');
    document.getElementById('donateSection1b').classList.remove('active');
    document.getElementById('donateSection2').classList.add('active');
    
    document.getElementById('donateStep1').classList.remove('active');
    document.getElementById('donateStep1').classList.add('completed');
    document.getElementById('donateStep2').classList.add('active');
}

// Computer Vision AI Integration
async function analyzeImageWithAI(imageFile) {
    try {
        console.log('Starting AI analysis...');
        console.log('File size:', imageFile.size);
        console.log('File type:', imageFile.type);
        
        // For now, return mock data since CV API keys are removed
        console.log('Using mock AI data for demo');
        return {
            tags: [
                { name: 'banana', confidence: 0.84 },
                { name: 'apple', confidence: 0.78 },
                { name: 'vegetable', confidence: 0.65 }
            ]
        };
    } catch (error) {
        console.error('AI analysis error details:', error);
        
        // Return mock data for demo instead of showing error
        console.log('Using mock AI data for demo');
        return {
            tags: [
                { name: 'banana', confidence: 0.84 },
                { name: 'apple', confidence: 0.78 },
                { name: 'vegetable', confidence: 0.65 }
            ]
        };
    }
}

function filterFoodItems(aiResult) {
    if (!aiResult.tags) return [];
    
    return aiResult.tags
        .filter(tag => {
            const name = tag.name.toLowerCase();
            return foodWhitelist.some(food => name.includes(food)) && tag.confidence > 0.5;
        })
        .map(tag => ({
            name: tag.name,
            confidence: tag.confidence,
            emoji: getItemEmoji(tag.name),
            quantity: 1
        }));
}

// AI processing
async function processAIAnalysis(actionType) {
    const loadingElement = document.getElementById(`${actionType}AILoading`);
    const resultsElement = document.getElementById(`${actionType}AIResults`);
    
    loadingElement.style.display = 'block';
    resultsElement.classList.add('hidden');
    
    if (state.actionData.photo) {
        const aiResult = await analyzeImageWithAI(state.actionData.photo);
        const detectedItems = filterFoodItems(aiResult);
        displayAIResults(detectedItems, actionType);
    } else {
        displayAIResults([], actionType);
    }
    
    loadingElement.style.display = 'none';
    resultsElement.classList.remove('hidden');
}

function displayAIResults(detectedItems, actionType) {
    const container = document.getElementById(`${actionType}DetectedItems`);
    container.innerHTML = '';
    
    if (detectedItems.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No food items detected. You can add items manually below.</p>';
    } else {
        detectedItems.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'detected-item selected';
            itemDiv.innerHTML = `
                <span class="emoji">${item.emoji}</span>
                <div class="name">${item.name}</div>
                <div class="confidence">${(item.confidence * 100).toFixed(1)}% confidence</div>
                <input type="number" class="quantity-input" value="${item.quantity}" min="0" data-index="${index}">
            `;
            container.appendChild(itemDiv);
        });
    }
    
    state.actionData.detectedItems = detectedItems;
}

function showDonateSuccess() {
    document.getElementById('donateSection4').classList.remove('active');
    document.getElementById('donateSuccess').classList.add('active');
    document.getElementById('donateStep4').classList.remove('active');
    document.getElementById('donateStep4').classList.add('completed');
}

// Helper functions
async function populatePatakaDropdown(selectId) {
    try {
        // Ensure data exists before filling the dropdown
        if (!Array.isArray(state.cupboards) || state.cupboards.length === 0) {
            await fetchCupboards();
        }

        const list = Array.isArray(state.cupboards) ? state.cupboards : [];
        const select = document.getElementById(selectId);
        if (!select) return;

        // Fill options
        select.innerHTML = '<option value="">Choose a pataka...</option>';
        for (const p of list) {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.name} - ${p.address}`;
            select.appendChild(opt);
        }
        
        console.log(`✅ Populated ${selectId} with ${list.length} options`);
    } catch (e) {
        console.warn('[populatePatakaDropdown] failed:', e);
    }
}

function addManualItem(name, quantity, actionType) {
    if (!state.actionData.detectedItems) state.actionData.detectedItems = [];
    
    const newItem = {
        name: name,
        quantity: quantity,
        emoji: getItemEmoji(name),
        confidence: 1.0,
        manual: true
    };
    
    state.actionData.detectedItems.push(newItem);
    displayAIResults(state.actionData.detectedItems, actionType);
}

// Photo handling helper
function handlePhotoSelection(e, previewImgId, previewContainerId) {
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
            const preview = document.getElementById(previewImgId);
            const container = document.getElementById(previewContainerId);
            preview.src = e.target.result;
            container.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
        
        state.actionData.photo = file;
    }
}

// Event listeners setup
function setupDonateEventListeners() {
    // Step 1: Unable to scan button
    const unableBtn = document.getElementById('donateUnableToScanBtn');
    if (unableBtn && !unableBtn.__donateBound) {
        unableBtn.addEventListener('click', async () => {
            await stopQRScanner();
            await populatePatakaDropdown('donatePatakaSelect');
            document.getElementById('donateSection1').classList.remove('active');
            document.getElementById('donateSection1b').classList.add('active');
            
            document.getElementById('donateStep1').classList.remove('active');
            document.getElementById('donateStep1').classList.add('completed');
            document.getElementById('donateStep2').classList.add('active');
        });
        unableBtn.__donateBound = true;
    }

    // Step 1: Cancel button
    const cancelBtn = document.getElementById('cancelDonateBtn');
    if (cancelBtn && !cancelBtn.__donateBound) {
        cancelBtn.addEventListener('click', async () => {
            await stopQRScanner();
            setActiveTab('find');
            switchToMap();
        });
        cancelBtn.__donateBound = true;
    }

    // Step 1b: Back to QR Scan button
    const backToQRBtn = document.getElementById('backToDonateQRBtn');
    if (backToQRBtn && !backToQRBtn.__donateBound) {
        backToQRBtn.addEventListener('click', () => {
            document.getElementById('donateSection1b').classList.remove('active');
            document.getElementById('donateSection1').classList.add('active');
            
            document.getElementById('donateStep2').classList.remove('active');
            document.getElementById('donateStep1').classList.add('active');
            document.getElementById('donateStep1').classList.remove('completed');
            
            startQRScanner('donate-qr-scanner', 'donate');
        });
        backToQRBtn.__donateBound = true;
    }

    // Step 1b: Pataka selection dropdown
    const patakaSelect = document.getElementById('donatePatakaSelect');
    const confirmBtn = document.getElementById('confirmDonatePatakaBtn');
    if (patakaSelect && confirmBtn && !patakaSelect.__donateBound) {
        patakaSelect.addEventListener('change', (e) => {
            const cupboardId = parseInt(e.target.value);
            
            if (cupboardId) {
                state.selectedPataka = state.cupboards.find(p => p.id === cupboardId);
                confirmBtn.disabled = false;
            } else {
                state.selectedPataka = null;
                confirmBtn.disabled = true;
            }
        });
        
        confirmBtn.addEventListener('click', () => {
            if (state.selectedPataka) {
                proceedToDonatePhoto();
            }
        });
        
        patakaSelect.__donateBound = true;
    }

    // Step 2: Photo buttons
    const takePhotoBtn = document.getElementById('donateTakePhotoBtn');
    const selectPhotoBtn = document.getElementById('donateSelectPhotoBtn');
    const takePhotoInput = document.getElementById('donateTakePhotoInput');
    const selectPhotoInput = document.getElementById('donateSelectPhotoInput');
    
    if (takePhotoBtn && !takePhotoBtn.__donateBound) {
        takePhotoBtn.addEventListener('click', () => takePhotoInput.click());
        takePhotoBtn.__donateBound = true;
    }
    
    if (selectPhotoBtn && !selectPhotoBtn.__donateBound) {
        selectPhotoBtn.addEventListener('click', () => selectPhotoInput.click());
        selectPhotoBtn.__donateBound = true;
    }
    
    if (takePhotoInput && !takePhotoInput.__donateBound) {
        takePhotoInput.addEventListener('change', (e) => 
            handlePhotoSelection(e, 'donatePhotoPreview', 'donatePhotoPreviewContainer')
        );
        takePhotoInput.__donateBound = true;
    }
    
    if (selectPhotoInput && !selectPhotoInput.__donateBound) {
        selectPhotoInput.addEventListener('change', (e) => 
            handlePhotoSelection(e, 'donatePhotoPreview', 'donatePhotoPreviewContainer')
        );
        selectPhotoInput.__donateBound = true;
    }

    // Step 2: Navigation buttons
    const photoNextBtn = document.getElementById('donatePhotoNextBtn');
    if (photoNextBtn && !photoNextBtn.__donateBound) {
        photoNextBtn.addEventListener('click', () => {
            document.getElementById('donateSection2').classList.remove('active');
            document.getElementById('donateSection3').classList.add('active');
            document.getElementById('donateStep2').classList.remove('active');
            document.getElementById('donateStep2').classList.add('completed');
            document.getElementById('donateStep3').classList.add('active');
            
            processAIAnalysis('donate');
        });
        photoNextBtn.__donateBound = true;
    }

    const photoBackBtn = document.getElementById('donatePhotoBackBtn');
    if (photoBackBtn && !photoBackBtn.__donateBound) {
        photoBackBtn.addEventListener('click', () => {
            document.getElementById('donateSection2').classList.remove('active');
            document.getElementById('donateSection1').classList.add('active');
            
            document.getElementById('donateStep2').classList.remove('active');
            document.getElementById('donateStep1').classList.add('active');
            document.getElementById('donateStep1').classList.remove('completed');
            
            startQRScanner('donate-qr-scanner', 'donate');
        });
        photoBackBtn.__donateBound = true;
    }

    // Step 3: AI Results navigation
    const aiNextBtn = document.getElementById('donateAINextBtn');
    if (aiNextBtn && !aiNextBtn.__donateBound) {
        aiNextBtn.addEventListener('click', () => {
            document.getElementById('donateSection3').classList.remove('active');
            document.getElementById('donateSection4').classList.add('active');
            
            document.getElementById('donateStep3').classList.remove('active');
            document.getElementById('donateStep3').classList.add('completed');
            document.getElementById('donateStep4').classList.add('active');
        });
        aiNextBtn.__donateBound = true;
    }

    const aiBackBtn = document.getElementById('donateAIBackBtn');
    if (aiBackBtn && !aiBackBtn.__donateBound) {
        aiBackBtn.addEventListener('click', () => {
            document.getElementById('donateSection3').classList.remove('active');
            document.getElementById('donateSection2').classList.add('active');
            
            document.getElementById('donateStep3').classList.remove('active');
            document.getElementById('donateStep2').classList.add('active');
            document.getElementById('donateStep2').classList.remove('completed');
        });
        aiBackBtn.__donateBound = true;
    }

    // Step 3: Add manual item button
    const addManualBtn = document.getElementById('donateAddManualBtn');
    if (addManualBtn && !addManualBtn.__donateBound) {
        addManualBtn.addEventListener('click', () => {
            const name = document.getElementById('donateManualItemName').value.trim();
            const qty = parseInt(document.getElementById('donateManualItemQty').value);
            
            if (name && qty > 0) {
                addManualItem(name, qty, 'donate');
                document.getElementById('donateManualItemName').value = '';
                document.getElementById('donateManualItemQty').value = '1';
            }
        });
        addManualBtn.__donateBound = true;
    }

    // Step 4: Submit button
const submitBtn = document.getElementById('donateSubmitBtn');
if (submitBtn && !submitBtn.__donateBound) {
    submitBtn.addEventListener('click', async () => {
        // Disable button during submission
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        
        try {
            // Gather data
            const patakaId = state.selectedPataka.id;
            const comment = document.getElementById('donateComment').value.trim();
            const items = state.actionData.detectedItems || [];
            const photo = state.actionData.photo;
            
            // Validate we have items
            if (items.length === 0) {
                showCustomModal('No Items', 'Please add at least one item to donate');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }
            
            // Prepare request
            let response;
            
            if (photo) {
                // Multipart submission (with photo)
                const formData = new FormData();
                formData.append('patakaId', patakaId);
                formData.append('items', JSON.stringify(items));
                if (comment) formData.append('comment', comment);
                formData.append('photo', photo);
                // Note: isTest will be determined by pātaka's IsTest flag in backend
                
                response = await fetch(API_BASE_URL + '/SubmitDonation', {
                    method: 'POST',
                    body: formData
                });
            } else {
                // JSON submission (no photo)
                response = await fetch(API_BASE_URL + '/SubmitDonation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        patakaId: patakaId,
                        items: items,
                        comment: comment || null
                    })
                });
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Donation successful:', result);
            
            // Show success screen
            showDonateSuccess();
            
        } catch (error) {
            console.error('❌ Donation failed:', error);
            showCustomModal('Submission Failed', error.message || 'Please try again');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
    submitBtn.__donateBound = true;
}

    // Step 4: Back button
    const commentBackBtn = document.getElementById('donateCommentBackBtn');
    if (commentBackBtn && !commentBackBtn.__donateBound) {
        commentBackBtn.addEventListener('click', () => {
            document.getElementById('donateSection4').classList.remove('active');
            document.getElementById('donateSection3').classList.add('active');
            
            document.getElementById('donateStep4').classList.remove('active');
            document.getElementById('donateStep3').classList.add('active');
            document.getElementById('donateStep3').classList.remove('completed');
        });
        commentBackBtn.__donateBound = true;
    }

    // Success: Back to Map button
    const backToMapBtn = document.getElementById('donateBackToMapBtn');
    if (backToMapBtn && !backToMapBtn.__donateBound) {
        backToMapBtn.addEventListener('click', () => {
            setActiveTab('find');
            switchToMap();
        });
        backToMapBtn.__donateBound = true;
    }
}

// Initialize event listeners when module loads
setupDonateEventListeners();

// Expose functions globally for QR scanner callback
window.proceedToDonatePhoto = proceedToDonatePhoto;
window.resetDonateFlow = resetDonateFlow;

// Export for ES6 modules
export {
    resetDonateFlow,
    proceedToDonatePhoto,
    setupDonateEventListeners
};