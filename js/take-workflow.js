// Import from config.js
import { state, API_BASE_URL, getItemEmoji, foodWhitelist } from './config.js';

// Import from app-core.js
import { showCustomModal, setActiveTab, switchToMap } from './app-core.js';

// Import from qr-scanner.js
import { stopQRScanner, startQRScanner } from './qr-scanner.js';

// Import from map-functions.js
import { fetchCupboards } from './map-functions.js';

// Import from photo-utils.js
import { processAndResizePhoto } from './photo-utils.js';

// Flow reset function
function resetTakeFlow() {
    document.querySelectorAll('#takeView .action-section').forEach(section => section.classList.remove('active'));
    document.getElementById('takeSection1').classList.add('active');
    
    document.querySelectorAll('#takeView .step').forEach(step => step.classList.remove('active', 'completed'));
    document.getElementById('takeStep1').classList.add('active');
    
    state.selectedPataka = null;
    state.actionData = {};
}

// Navigation functions
function proceedToTakePhoto() {
    document.getElementById('takeSelectedPatakaName').textContent = state.selectedPataka.name;
    
    // Store pataka info in actionData for submission
    state.actionData.selectedPatakaId = state.selectedPataka.id;
    state.actionData.selectedPataka = state.selectedPataka;
    
    document.getElementById('takeSection1').classList.remove('active');
    document.getElementById('takeSection1b').classList.remove('active');
    document.getElementById('takeSection2').classList.add('active');
    
    document.getElementById('takeStep1').classList.remove('active');
    document.getElementById('takeStep1').classList.add('completed');
    document.getElementById('takeStep2').classList.add('active');
}

function showTakeSuccess() {
    document.getElementById('takeSection4').classList.remove('active');
    document.getElementById('takeSuccess').classList.add('active');
    document.getElementById('takeStep4').classList.remove('active');
    document.getElementById('takeStep4').classList.add('completed');
}

// Computer Vision AI Integration
async function analyzeImageWithAI(imageFile) {
    try {
        console.log('Starting AI analysis...');
        console.log('File size:', imageFile.size);
        console.log('File type:', imageFile.type);
        
        // Convert image to ArrayBuffer for backend
        const arrayBuffer = await imageFile.arrayBuffer();
        
        // Call our backend API (which calls Computer Vision securely)
        const response = await fetch(`${API_BASE_URL}/analyzeFood`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            body: arrayBuffer
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Computer Vision result:', result);
        
        if (result.usingMockData) {
            console.warn('⚠️ Using mock data - Computer Vision API failed');
        }
        
        return {
            tags: result.tags || []
        };
        
    } catch (error) {
        console.error('❌ AI analysis error:', error);
        
        // Fallback to mock data
        console.warn('⚠️ Using fallback mock data');
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

// AI processing for Take workflow
async function processTakeAIAnalysis() {
    const loadingElement = document.getElementById('takeAILoading');
    const resultsElement = document.getElementById('takeAIResults');
    
    loadingElement.style.display = 'block';
    resultsElement.classList.add('hidden');
    
    if (state.actionData.photo) {
        const aiResult = await analyzeImageWithAI(state.actionData.photo);
        const detectedItems = filterFoodItems(aiResult);
        displayTakeAIResults(detectedItems);
    } else {
        displayTakeAIResults([]);
    }
    
    loadingElement.style.display = 'none';
    resultsElement.classList.remove('hidden');
}

function displayTakeAIResults(detectedItems) {
    const container = document.getElementById('takeDetectedItems');
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
        
        // Add event listeners to quantity inputs
        const quantityInputs = container.querySelectorAll('.quantity-input');
        quantityInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const newQuantity = parseInt(e.target.value) || 0;
                state.actionData.detectedItems[index].quantity = newQuantity;
                console.log(`Updated item ${index} quantity to ${newQuantity}`);
            });
        });
    }
    
    state.actionData.detectedItems = detectedItems;
}

function addManualTakeItem(name, quantity) {
    if (!state.actionData.detectedItems) state.actionData.detectedItems = [];
    
    const newItem = {
        name: name,
        quantity: quantity,
        emoji: getItemEmoji(name),
        confidence: 1.0,
        manual: true
    };
    
    state.actionData.detectedItems.push(newItem);
    displayTakeAIResults(state.actionData.detectedItems);
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

// Photo handling helper - NOW RESIZES IMMEDIATELY
async function handlePhotoSelection(e, previewImgId, previewContainerId) {
    const file = e.target.files[0];
    if (file) {
        // Process and resize photo immediately using photo-utils
        const { resizedBlob, dataURL, error } = await processAndResizePhoto(file);
        
        if (error) {
            showCustomModal('Photo Error', error);
            return;
        }
        
        // Show preview
        const preview = document.getElementById(previewImgId);
        const container = document.getElementById(previewContainerId);
        preview.src = dataURL;
        container.classList.remove('hidden');
        
        // Store RESIZED blob (not original file!)
        state.actionData.photo = resizedBlob;
        console.log('✅ Stored resized photo for both AI analysis and submission');
    }
}

// Event listeners setup
function setupTakeEventListeners() {
    // Step 1: Unable to scan button
    const unableBtn = document.getElementById('takeUnableToScanBtn');
    if (unableBtn && !unableBtn.__takeBound) {
        unableBtn.addEventListener('click', async () => {
            await stopQRScanner();
            await populatePatakaDropdown('takePatakaSelect');
            document.getElementById('takeSection1').classList.remove('active');
            document.getElementById('takeSection1b').classList.add('active');
            
            document.getElementById('takeStep1').classList.remove('active');
            document.getElementById('takeStep1').classList.add('completed');
            document.getElementById('takeStep2').classList.add('active');
        });
        unableBtn.__takeBound = true;
    }

    // Step 1: Cancel button
    const cancelBtn = document.getElementById('cancelTakeBtn');
    if (cancelBtn && !cancelBtn.__takeBound) {
        cancelBtn.addEventListener('click', async () => {
            await stopQRScanner();
            setActiveTab('find');
            switchToMap();
        });
        cancelBtn.__takeBound = true;
    }

    // Step 1b: Back to QR Scan button
    const backToQRBtn = document.getElementById('backToTakeQRBtn');
    if (backToQRBtn && !backToQRBtn.__takeBound) {
        backToQRBtn.addEventListener('click', () => {
            document.getElementById('takeSection1b').classList.remove('active');
            document.getElementById('takeSection1').classList.add('active');
            
            document.getElementById('takeStep2').classList.remove('active');
            document.getElementById('takeStep1').classList.add('active');
            document.getElementById('takeStep1').classList.remove('completed');
            
            startQRScanner('take-qr-scanner', 'take');
        });
        backToQRBtn.__takeBound = true;
    }

    // Step 1b: Pataka selection dropdown
    const patakaSelect = document.getElementById('takePatakaSelect');
    const confirmBtn = document.getElementById('confirmTakePatakaBtn');
    if (patakaSelect && confirmBtn && !patakaSelect.__takeBound) {
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
                proceedToTakePhoto();
            }
        });
        
        patakaSelect.__takeBound = true;
    }

    // Step 2: Photo buttons
    const takePhotoBtn = document.getElementById('takeTakePhotoBtn');
    const selectPhotoBtn = document.getElementById('takeSelectPhotoBtn');
    const takePhotoInput = document.getElementById('takeTakePhotoInput');
    const selectPhotoInput = document.getElementById('takeSelectPhotoInput');
    
    if (takePhotoBtn && !takePhotoBtn.__takeBound) {
        takePhotoBtn.addEventListener('click', () => takePhotoInput.click());
        takePhotoBtn.__takeBound = true;
    }
    
    if (selectPhotoBtn && !selectPhotoBtn.__takeBound) {
        selectPhotoBtn.addEventListener('click', () => selectPhotoInput.click());
        selectPhotoBtn.__takeBound = true;
    }
    
    if (takePhotoInput && !takePhotoInput.__takeBound) {
        takePhotoInput.addEventListener('change', (e) => 
            handlePhotoSelection(e, 'takePhotoPreview', 'takePhotoPreviewContainer')
        );
        takePhotoInput.__takeBound = true;
    }
    
    if (selectPhotoInput && !selectPhotoInput.__takeBound) {
        selectPhotoInput.addEventListener('change', (e) => 
            handlePhotoSelection(e, 'takePhotoPreview', 'takePhotoPreviewContainer')
        );
        selectPhotoInput.__takeBound = true;
    }

    // Step 2: Navigation buttons - NOW GOES TO AI STEP (Step 3)
    const photoNextBtn = document.getElementById('takePhotoNextBtn');
    if (photoNextBtn && !photoNextBtn.__takeBound) {
        photoNextBtn.addEventListener('click', () => {
            document.getElementById('takeSection2').classList.remove('active');
            document.getElementById('takeSection3').classList.add('active');
            document.getElementById('takeStep2').classList.remove('active');
            document.getElementById('takeStep2').classList.add('completed');
            document.getElementById('takeStep3').classList.add('active');
            
            // Process AI analysis
            processTakeAIAnalysis();
        });
        photoNextBtn.__takeBound = true;
    }

    const photoBackBtn = document.getElementById('takePhotoBackBtn');
    if (photoBackBtn && !photoBackBtn.__takeBound) {
        photoBackBtn.addEventListener('click', () => {
            document.getElementById('takeSection2').classList.remove('active');
            document.getElementById('takeSection1').classList.add('active');
            
            document.getElementById('takeStep2').classList.remove('active');
            document.getElementById('takeStep1').classList.add('active');
            document.getElementById('takeStep1').classList.remove('completed');
            
            startQRScanner('take-qr-scanner', 'take');
        });
        photoBackBtn.__takeBound = true;
    }

    // Step 3 (NEW): AI Results navigation
    const aiNextBtn = document.getElementById('takeAINextBtn');
    if (aiNextBtn && !aiNextBtn.__takeBound) {
        aiNextBtn.addEventListener('click', () => {
            document.getElementById('takeSection3').classList.remove('active');
            document.getElementById('takeSection4').classList.add('active');
            
            document.getElementById('takeStep3').classList.remove('active');
            document.getElementById('takeStep3').classList.add('completed');
            document.getElementById('takeStep4').classList.add('active');
        });
        aiNextBtn.__takeBound = true;
    }

    const aiBackBtn = document.getElementById('takeAIBackBtn');
    if (aiBackBtn && !aiBackBtn.__takeBound) {
        aiBackBtn.addEventListener('click', () => {
            document.getElementById('takeSection3').classList.remove('active');
            document.getElementById('takeSection2').classList.add('active');
            
            document.getElementById('takeStep3').classList.remove('active');
            document.getElementById('takeStep2').classList.add('active');
            document.getElementById('takeStep2').classList.remove('completed');
        });
        aiBackBtn.__takeBound = true;
    }

    // Step 3 (NEW): Add manual item button
    const addManualBtn = document.getElementById('takeAddManualBtn');
    if (addManualBtn && !addManualBtn.__takeBound) {
        addManualBtn.addEventListener('click', () => {
            const name = document.getElementById('takeManualItemName').value.trim();
            const qty = parseInt(document.getElementById('takeManualItemQty').value);
            
            if (name && qty > 0) {
                addManualTakeItem(name, qty);
                document.getElementById('takeManualItemName').value = '';
                document.getElementById('takeManualItemQty').value = '1';
            }
        });
        addManualBtn.__takeBound = true;
    }

    // Step 4 (FORMERLY STEP 3): Navigation buttons
    const commentBackBtn = document.getElementById('takeCommentBackBtn');
    if (commentBackBtn && !commentBackBtn.__takeBound) {
        commentBackBtn.addEventListener('click', () => {
            document.getElementById('takeSection4').classList.remove('active');
            document.getElementById('takeSection3').classList.add('active');
            
            document.getElementById('takeStep4').classList.remove('active');
            document.getElementById('takeStep3').classList.add('active');
            document.getElementById('takeStep3').classList.remove('completed');
        });
        commentBackBtn.__takeBound = true;
    }

// Step 4: Submit button
    const submitBtn = document.getElementById('takeSubmitBtn');
    if (submitBtn && !submitBtn.__takeBound) {
        // Ensure button is enabled at start
        submitBtn.disabled = false;
        
        submitBtn.addEventListener('click', async () => {
            // Disable button during submission
            submitBtn.disabled = true;
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            
            try {
                // Get form data
                const comment = document.getElementById('takeComment')?.value || '';
                const items = state.actionData.detectedItems.filter(item => item.quantity > 0);
                
                if (items.length === 0) {
                    throw new Error('No items to submit');
                }
                
                // Determine if this is a test pataka
                const isTest = state.actionData.selectedPataka?.IsTest || false;
                
                console.log('📤 Submitting taking:', {
                    patakaId: state.actionData.selectedPatakaId,
                    itemCount: items.length,
                    hasPhoto: !!state.actionData.photo,
                    isTest: isTest
                });
                
                // Create FormData for multipart submission
                const formData = new FormData();
                formData.append('patakaId', state.actionData.selectedPatakaId);
                formData.append('userId', ''); // Anonymous for now
                formData.append('items', JSON.stringify(items));
                formData.append('comment', comment);
                formData.append('isTest', isTest.toString());
                
                // Add photo if available
                if (state.actionData.photo) {
                    formData.append('photo', state.actionData.photo, 'taking.jpg');
                }
                
                // Submit to backend
                const response = await fetch(`${API_BASE_URL}/SubmitTaking`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || `HTTP ${response.status}`);
                }
                
                const result = await response.json();
                console.log('✅ Taking successful:', result);
                
                // Show success screen
                showTakeSuccess();
                
            } catch (error) {
                console.error('❌ Taking failed:', error);
                showCustomModal('Submission Failed', error.message || 'Please try again');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
        submitBtn.__takeBound = true;
    }

    // Success: Back to Map button
    const backToMapBtn = document.getElementById('takeBackToMapBtn');
    if (backToMapBtn && !backToMapBtn.__takeBound) {
        backToMapBtn.addEventListener('click', () => {
            setActiveTab('find');
            switchToMap();
        });
        backToMapBtn.__takeBound = true;
    }
}

// Initialize event listeners when module loads
setupTakeEventListeners();

// Expose functions globally for QR scanner callback
window.proceedToTakePhoto = proceedToTakePhoto;
window.resetTakeFlow = resetTakeFlow;

// Export for ES6 modules
export {
    resetTakeFlow,
    proceedToTakePhoto,
    setupTakeEventListeners
};