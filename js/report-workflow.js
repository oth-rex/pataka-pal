// Import from config.js
import { state, API_BASE_URL } from './config.js';

// Import from app-core.js
import { showCustomModal, setActiveTab, switchToMap } from './app-core.js';

// Import from qr-scanner.js
import { stopQRScanner, startQRScanner } from './qr-scanner.js';

// Import from map-functions.js
import { fetchCupboards } from './map-functions.js';

// Flow reset function
function resetReportFlow() {
    document.querySelectorAll('#reportView .action-section').forEach(section => section.classList.remove('active'));
    document.getElementById('reportStep1').classList.add('active');
    
    document.querySelectorAll('#reportView .step').forEach(step => step.classList.remove('active', 'completed'));
    document.getElementById('step1').classList.add('active');
    
    state.selectedPataka = null;
    state.actionData = {};
}

// Navigation functions
function proceedToReportDetails() {
    document.getElementById('selectedPatakaName').textContent = state.selectedPataka.name;
    
    document.getElementById('reportStep1').classList.remove('active');
    document.getElementById('reportStep1b').classList.remove('active');
    document.getElementById('reportStep2').classList.add('active');
    
    document.getElementById('step1').classList.remove('active');
    document.getElementById('step1').classList.add('completed');
    document.getElementById('step2').classList.add('active');
}

function showReportSuccess() {
    document.getElementById('reportStep3').classList.remove('active');
    document.getElementById('reportSuccess').classList.add('active');
    document.getElementById('step3').classList.remove('active');
    document.getElementById('step3').classList.add('completed');
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

// Report Issue Submission (Backend Integration - KEEP THIS WORKING!)
async function submitReportIssueFromApp() {
    try {
        // Require selectedPataka from app state
        if (typeof state.selectedPataka !== 'object' || !state.selectedPataka || !state.selectedPataka.id) {
            throw new Error('No pataka selected. Please pick a pātaka first.');
        }
        const patakaId = Number(state.selectedPataka.id);

        // Grab fields
        const descEl = document.getElementById('issueDescription');
        const nameEl = document.getElementById('contactName');
        const contactEl = document.getElementById('contactInfo');
        const takeEl = document.getElementById('takePhotoInput');
        const selectEl = document.getElementById('selectPhotoInput');

        const description  = descEl ? (descEl.value || '').trim() : '';
        const reporterName = nameEl ? (nameEl.value || '').trim() : '';
        const reporterEmail = ''; // UI uses a freeform contact field
        const okToContact  = contactEl && contactEl.value && contactEl.value.trim().length > 0;
        const photoFile    = (takeEl && takeEl.files && takeEl.files[0]) ? takeEl.files[0]
                            : (selectEl && selectEl.files && selectEl.files[0]) ? selectEl.files[0]
                            : null;

        if (!description && !photoFile) {
            const v = document.getElementById('reportValidation');
            if (v) { v.classList.remove('hidden'); }
            throw new Error('Please provide either a description or a photo.');
        }

        const fd = new FormData();
        fd.append('patakaId', patakaId);
        if (description)   fd.append('description', description);
        if (reporterName)  fd.append('reporterName', reporterName);
        if (reporterEmail) fd.append('reporterEmail', reporterEmail);
        fd.append('okToContact', okToContact ? 'true' : 'false');
        if (photoFile)     fd.append('photo', photoFile);

        const res = await fetch(API_BASE_URL + '/ReportIssue', { 
            method: 'POST', 
            body: fd
        });
        
        if (!res.ok) {
            const text = await res.text().catch(()=>''); 
            throw new Error(text || ('HTTP ' + res.status));
        }
        
        const json = await res.json();
        
        // Success - show the success screen
        showReportSuccess();
        return json;
    } catch (err) {
        console.error('Report submit failed:', err);
        showCustomModal('Report Failed', (err && err.message) ? err.message : String(err));
        throw err;
    }
}

// Event listeners setup
function setupReportEventListeners() {
    // Step 1: Unable to scan button
    const unableBtn = document.getElementById('unableToScanBtn');
    if (unableBtn && !unableBtn.__reportBound) {
        unableBtn.addEventListener('click', async () => {
            await stopQRScanner();
            await populatePatakaDropdown('patakaSelect');
            document.getElementById('reportStep1').classList.remove('active');
            document.getElementById('reportStep1b').classList.add('active');
            
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step1').classList.add('completed');
            document.getElementById('step2').classList.add('active');
        });
        unableBtn.__reportBound = true;
    }

    // Step 1: Cancel button
    const cancelBtn = document.getElementById('cancelReportBtn');
    if (cancelBtn && !cancelBtn.__reportBound) {
        cancelBtn.addEventListener('click', async () => {
            await stopQRScanner();
            setActiveTab('find');
            switchToMap();
        });
        cancelBtn.__reportBound = true;
    }

    // Step 1b: Back to QR Scan button
    const backToQRBtn = document.getElementById('backToScanBtn');
    if (backToQRBtn && !backToQRBtn.__reportBound) {
        backToQRBtn.addEventListener('click', () => {
            document.getElementById('reportStep1b').classList.remove('active');
            document.getElementById('reportStep1').classList.add('active');
            
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step1').classList.add('active');
            document.getElementById('step1').classList.remove('completed');
            
            startQRScanner('qr-scanner', 'report');
        });
        backToQRBtn.__reportBound = true;
    }

    // Step 1b: Pataka selection dropdown
    const patakaSelect = document.getElementById('patakaSelect');
    const confirmBtn = document.getElementById('confirmPatakaBtn');
    if (patakaSelect && confirmBtn && !patakaSelect.__reportBound) {
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
                proceedToReportDetails();
            }
        });
        
        patakaSelect.__reportBound = true;
    }

    // Step 2: Photo buttons
    const takePhotoBtn = document.getElementById('takePhotoBtn');
    const selectPhotoBtn = document.getElementById('selectPhotoBtn');
    const takePhotoInput = document.getElementById('takePhotoInput');
    const selectPhotoInput = document.getElementById('selectPhotoInput');
    
    if (takePhotoBtn && !takePhotoBtn.__reportBound) {
        takePhotoBtn.addEventListener('click', () => takePhotoInput.click());
        takePhotoBtn.__reportBound = true;
    }
    
    if (selectPhotoBtn && !selectPhotoBtn.__reportBound) {
        selectPhotoBtn.addEventListener('click', () => selectPhotoInput.click());
        selectPhotoBtn.__reportBound = true;
    }
    
    if (takePhotoInput && !takePhotoInput.__reportBound) {
        takePhotoInput.addEventListener('change', (e) => 
            handlePhotoSelection(e, 'photoPreview', 'photoPreviewContainer')
        );
        takePhotoInput.__reportBound = true;
    }
    
    if (selectPhotoInput && !selectPhotoInput.__reportBound) {
        selectPhotoInput.addEventListener('change', (e) => 
            handlePhotoSelection(e, 'photoPreview', 'photoPreviewContainer')
        );
        selectPhotoInput.__reportBound = true;
    }

    // Step 2: Continue to contact button
    const continueBtn = document.getElementById('continueToContactBtn');
    if (continueBtn && !continueBtn.__reportBound) {
        continueBtn.addEventListener('click', () => {
            const description = document.getElementById('issueDescription').value.trim();
            const hasPhoto = state.actionData.photo;
            
            if (!description && !hasPhoto) {
                document.getElementById('reportValidation').classList.remove('hidden');
                return;
            }
            
            document.getElementById('reportValidation').classList.add('hidden');
            state.actionData.description = description;
            
            document.getElementById('reportStep2').classList.remove('active');
            document.getElementById('reportStep3').classList.add('active');
            
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step2').classList.add('completed');
            document.getElementById('step3').classList.add('active');
        });
        continueBtn.__reportBound = true;
    }

    // Step 2: Back button
    const backToSelectionBtn = document.getElementById('backToSelectionBtn');
    if (backToSelectionBtn && !backToSelectionBtn.__reportBound) {
        backToSelectionBtn.addEventListener('click', () => {
            document.getElementById('reportStep2').classList.remove('active');
            document.getElementById('reportStep1').classList.add('active');
            
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step1').classList.add('active');
            document.getElementById('step1').classList.remove('completed');
            
            startQRScanner('qr-scanner', 'report');
        });
        backToSelectionBtn.__reportBound = true;
    }

    // Step 3: Submit report button (CRITICAL - Backend integration!)
    const submitBtn = document.getElementById('submitReportBtn');
    if (submitBtn && !submitBtn.__reportBound) {
        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            submitBtn.disabled = true;
const original = submitBtn.textContent;
submitBtn.innerHTML = `
    <div>Submitting your report - this may take up to 1 minute and you'll get a message when it's done</div>
    <div style="font-size:0.8rem;margin-top:4px;">
        Thank you for taking the time to help! ❤️
    </div>
`;
            
            try { 
                await submitReportIssueFromApp(); 
            } catch (err) {
                console.error('Submit failed:', err);
            } finally { 
                submitBtn.disabled = false; 
                submitBtn.textContent = original; 
            }
        });
        submitBtn.__reportBound = true;
    }

    // Step 3: Back button
    const backToDetailsBtn = document.getElementById('backToDetailsBtn');
    if (backToDetailsBtn && !backToDetailsBtn.__reportBound) {
        backToDetailsBtn.addEventListener('click', () => {
            document.getElementById('reportStep3').classList.remove('active');
            document.getElementById('reportStep2').classList.add('active');
            
            document.getElementById('step3').classList.remove('active');
            document.getElementById('step2').classList.add('active');
            document.getElementById('step2').classList.remove('completed');
        });
        backToDetailsBtn.__reportBound = true;
    }

    // Success: Back to Map button
    const backToMapBtn = document.getElementById('backToMapBtn');
    if (backToMapBtn && !backToMapBtn.__reportBound) {
        backToMapBtn.addEventListener('click', () => {
            setActiveTab('find');
            switchToMap();
        });
        backToMapBtn.__reportBound = true;
    }
}

// Initialize event listeners when module loads
setupReportEventListeners();

// Expose functions globally for QR scanner callback
window.proceedToReportDetails = proceedToReportDetails;
window.resetReportFlow = resetReportFlow;

// Export for ES6 modules
export {
    resetReportFlow,
    proceedToReportDetails,
    setupReportEventListeners,
    submitReportIssueFromApp
};