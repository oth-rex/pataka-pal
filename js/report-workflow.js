// Flow reset functions
function resetReportFlow() {
    document.querySelectorAll('#reportView .action-section').forEach(section => section.classList.remove('active'));
    document.getElementById('reportStep1').classList.add('active');
    
    document.querySelectorAll('#reportView .step').forEach(step => step.classList.remove('active', 'completed'));
    document.getElementById('step1').classList.add('active');
    
    selectedPataka = null;
    actionData = {};
}

// Navigation functions
function proceedToReportDetails() {
    document.getElementById('selectedPatakaName').textContent = selectedPataka.name;
    
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

// Report-specific photo handling
function handleReportPhotoSelection(e) {
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
            const preview = document.getElementById('photoPreview');
            const container = document.getElementById('photoPreviewContainer');
            preview.src = e.target.result;
            container.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
        
        actionData.photo = file;
    }
}

function setupReportEventListeners() {
    document.getElementById('unableToScanBtn').addEventListener('click', async () => {
        await stopQRScanner();
        await populatePatakaDropdown('patakaSelect');
        document.getElementById('reportStep1').classList.remove('active');
        document.getElementById('reportStep1b').classList.add('active');
    });

    document.getElementById('cancelReportBtn').addEventListener('click', async () => {
        await stopQRScanner();
        setActiveTab('find');
        switchToMap();
    });

    document.getElementById('backToScanBtn').addEventListener('click', () => {
        document.getElementById('reportStep1b').classList.remove('active');
        document.getElementById('reportStep1').classList.add('active');
        startQRScanner('qr-scanner', 'report');
    });

    document.getElementById('patakaSelect').addEventListener('change', (e) => {
        const cupboardId = parseInt(e.target.value);
        const confirmBtn = document.getElementById('confirmPatakaBtn');
        
        if (cupboardId) {
            selectedPataka = cupboards.find(p => p.id === cupboardId);
            confirmBtn.disabled = false;
        } else {
            selectedPataka = null;
            confirmBtn.disabled = true;
        }
    });

    document.getElementById('confirmPatakaBtn').addEventListener('click', () => {
        proceedToReportDetails();
    });

    // Report photo handlers
    document.getElementById('takePhotoBtn').addEventListener('click', () => {
        document.getElementById('takePhotoInput').click();
    });

    document.getElementById('selectPhotoBtn').addEventListener('click', () => {
        document.getElementById('selectPhotoInput').click();
    });

    document.getElementById('takePhotoInput').addEventListener('change', handleReportPhotoSelection);
    document.getElementById('selectPhotoInput').addEventListener('change', handleReportPhotoSelection);

    document.getElementById('continueToContactBtn').addEventListener('click', () => {
        const description = document.getElementById('issueDescription').value.trim();
        const hasPhoto = actionData.photo;
        
        if (!description && !hasPhoto) {
            document.getElementById('reportValidation').classList.remove('hidden');
            return;
        }
        
        document.getElementById('reportValidation').classList.add('hidden');
        actionData.description = description;
        
        document.getElementById('reportStep2').classList.remove('active');
        document.getElementById('reportStep3').classList.add('active');
        
        document.getElementById('step2').classList.remove('active');
        document.getElementById('step2').classList.add('completed');
        document.getElementById('step3').classList.add('active');
    });

    document.getElementById('backToSelectionBtn').addEventListener('click', () => {
        document.getElementById('reportStep2').classList.remove('active');
        document.getElementById('reportStep1').classList.add('active');
        
        document.getElementById('step2').classList.remove('active');
        document.getElementById('step1').classList.add('active');
        document.getElementById('step1').classList.remove('completed');
        
        startQRScanner('qr-scanner', 'report');
    });

    document.getElementById('backToDetailsBtn').addEventListener('click', () => {
        document.getElementById('reportStep3').classList.remove('active');
        document.getElementById('reportStep2').classList.add('active');
        
        document.getElementById('step3').classList.remove('active');
        document.getElementById('step2').classList.add('active');
        document.getElementById('step2').classList.remove('completed');
    });

    document.getElementById('backToMapBtn').addEventListener('click', () => {
        setActiveTab('find');
        switchToMap();
    });
}

// Report Issue Submission Integration (from v27)
async function submitReportIssueFromApp() {
    try {
        // Require selectedPataka from app state
        if (typeof selectedPataka !== 'object' || !selectedPataka || !selectedPataka.id) {
            throw new Error('No pataka selected. Please pick a pätaka first.');
        }
        const patakaId = Number(selectedPataka.id);

        // Grab fields
        const descEl = document.getElementById('issueDescription');
        const nameEl = document.getElementById('contactName');
        const contactEl = document.getElementById('contactInfo');
        const takeEl = document.getElementById('takePhotoInput');
        const selectEl = document.getElementById('selectPhotoInput');

        const description  = descEl ? (descEl.value || '').trim() : '';
        const reporterName = nameEl ? (nameEl.value || '').trim() : '';
        const reporterEmail = ''; // your UI uses a freeform contact field
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
            body: fd,
            timeout: 60000 // 60 second timeout for upload
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
        // Show your existing modal if available
        if (typeof showCustomModal === 'function') {
            showCustomModal('Report failed', (err && err.message) ? err.message : String(err));
        } else {
            alert((err && err.message) ? err.message : String(err));
        }
        throw err;
    }
}

// Initialize report submission when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('submitReportBtn');
    if (btn) {
        btn.addEventListener('click', async function(ev) {
            ev.preventDefault();
            btn.disabled = true;
            const original = btn.textContent;
            btn.textContent = 'Submitting…';
            try { 
                await submitReportIssueFromApp(); 
            } finally { 
                btn.disabled = false; 
                btn.textContent = original; 
            }
        });
    }
});
