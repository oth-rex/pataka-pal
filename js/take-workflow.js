// Import from config.js
import { state } from './config.js';

// Import from app-core.js
import { showCustomModal, setActiveTab, switchToMap } from './app-core.js';

// Import from qr-scanner.js
import { stopQRScanner, startQRScanner } from './qr-scanner.js';

// Import from map-functions.js
import { fetchCupboards } from './map-functions.js';

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
    
    document.getElementById('takeSection1').classList.remove('active');
    document.getElementById('takeSection1b').classList.remove('active');
    document.getElementById('takeSection2').classList.add('active');
    
    document.getElementById('takeStep1').classList.remove('active');
    document.getElementById('takeStep1').classList.add('completed');
    document.getElementById('takeStep2').classList.add('active');
}

function showTakeSuccess() {
    document.getElementById('takeSection3').classList.remove('active');
    document.getElementById('takeSuccess').classList.add('active');
    document.getElementById('takeStep3').classList.remove('active');
    document.getElementById('takeStep3').classList.add('completed');
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

    // Step 2: Navigation buttons
    const photoNextBtn = document.getElementById('takePhotoNextBtn');
    if (photoNextBtn && !photoNextBtn.__takeBound) {
        photoNextBtn.addEventListener('click', () => {
            document.getElementById('takeSection2').classList.remove('active');
            document.getElementById('takeSection3').classList.add('active');
            document.getElementById('takeStep2').classList.remove('active');
            document.getElementById('takeStep2').classList.add('completed');
            document.getElementById('takeStep3').classList.add('active');
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

    // Step 3: Navigation buttons
    const commentBackBtn = document.getElementById('takeCommentBackBtn');
    if (commentBackBtn && !commentBackBtn.__takeBound) {
        commentBackBtn.addEventListener('click', () => {
            document.getElementById('takeSection3').classList.remove('active');
            document.getElementById('takeSection2').classList.add('active');
            
            document.getElementById('takeStep3').classList.remove('active');
            document.getElementById('takeStep2').classList.add('active');
            document.getElementById('takeStep2').classList.remove('completed');
        });
        commentBackBtn.__takeBound = true;
    }

    // Step 3: Submit button
    const submitBtn = document.getElementById('takeSubmitBtn');
    if (submitBtn && !submitBtn.__takeBound) {
        submitBtn.addEventListener('click', () => {
            console.log('Taking submitted');
            showTakeSuccess();
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