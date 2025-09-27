/* ========================================
   REPORT WORKFLOW MODULE
   ======================================== */

let reportData = {
    pataka: null,
    description: '',
    photo: null,
    reporterName: '',
    reporterEmail: '',
    okToContact: false
};

/* ========================================
   REPORT EVENT LISTENERS SETUP
   ======================================== */

function setupReportEventListeners() {
    // QR Scanner events
    document.getElementById('reportUnableToScanBtn')?.addEventListener('click', async () => {
        await stopQRScanner();
        await populatePatakaDropdown('reportPatakaSelect');
        document.getElementById('reportSection1').classList.remove('active');
        document.getElementById('reportSection1b')?.classList.add('active');
    });

    document.getElementById('cancelReportBtn')?.addEventListener('click', async () => {
        await stopQRScanner();
        setActiveTab('find');
        switchToMap();
    });

    // Manual selection
    document.getElementById('reportPatakaSelect')?.addEventListener('change', (e) => {
        if (e.target.value) {
            handleManualPatakaSelection('reportPatakaSelect', 'report');
        }
    });

    document.getElementById('backToReportQRBtn')?.addEventListener('click', () => {
        document.getElementById('reportSection1b').classList.remove('active');
        document.getElementById('reportSection1').classList.add('active');
        startQRScanner('reportQRVideo', 'report');
    });

    // Report details step events
    document.getElementById('reportNextBtn')?.addEventListener('click', () => {
        if (validateReportDetails()) {
            proceedToReportContact();
        }
    });

    document.getElementById('reportBackBtn')?.addEventListener('click', () => {
        document.getElementById('reportSection2').classList.remove('active');
        document.getElementById('reportSection1').classList.add('active');
        
        document.getElementById('step2').classList.remove('active');
        document.getElementById('step1').classList.add('active');
        document.getElementById('step1').classList.remove('completed');
    });

    // Contact details step events
    document.getElementById('reportSubmitBtn')?.addEventListener('click', async () => {
        await submitReport();
    });

    document.getElementById('reportContactBackBtn')?.addEventListener('click', () => {
        document.getElementById('reportSection3').classList.remove('active');
        document.getElementById('reportSection2').classList.add('active');
        
        document.getElementById('step3').classList.remove('active');
        document.getElementById('step2').classList.add('active');
        document.getElementById('step2').classList.remove('completed');
    });

    // Success screen
    document.getElementById('reportBackToMapBtn')?.addEventListener('click', () => {
        setActiveTab('find');
        switchToMap();
    });

    // Initialize QR scanner when report tab becomes active
    const reportTab = document.querySelector('[data-tab="report"]');
    reportTab?.addEventListener('click', () => {
        setTimeout(() => {
            startQRScanner('reportQRVideo', 'report');
        }, 300);
    });

    // Issue type selection
    document.querySelectorAll('input[name="issueType"]').forEach(radio => {
        radio.addEventListener('change', handleIssueTypeChange);
    });

    // Photo upload for evidence
    document.getElementById('reportPhotoInput')?.addEventListener('change', (e) => {
        handleReportPhotoSelection(e);
    });

    document.getElementById('reportTakePhotoBtn')?.addEventListener('click', () => {
        document.getElementById('reportPhotoInput')?.click();
    });
}

/* ========================================
   WORKFLOW NAVIGATION
   ======================================== */

function proceedToReportContact() {
    // Capture report details
    reportData.description = document.getElementById('reportDescription')?.value.trim() || '';
    
    document.getElementById('reportSection2').classList.remove('active');
    document.getElementById('reportSection3')?.classList.add('active');
    
    document.getElementById('step2').classList.remove('active');
    document.getElementById('step2').classList.add('completed');
    document.getElementById('step3')?.classList.add('active');
    
    // Update summary
    updateReportSummary();
}

function updateReportSummary() {
    const summaryContainer = document.getElementById('reportSummary');
    if (!summaryContainer) return;
    
    const issueType = document.querySelector('input[name="issueType"]:checked')?.value || 'Not specified';
    const description = reportData.description || 'No description provided';
    const hasPhoto = reportData.photo ? 'Yes' : 'No';
    
    summaryContainer.innerHTML = `
        <div class="report-summary">
            <h4>Report Summary</h4>
            <p><strong>Pātaka:</strong> ${selectedPataka?.name}</p>
            <p><strong>Issue Type:</strong> ${issueType}</p>
            <p><strong>Description:</strong> ${description}</p>
            <p><strong>Photo Evidence:</strong> ${hasPhoto}</p>
        </div>
    `;
}

/* ========================================
   VALIDATION
   ======================================== */

function validateReportDetails() {
    const issueType = document.querySelector('input[name="issueType"]:checked');
    const description = document.getElementById('reportDescription')?.value.trim();
    
    if (!issueType) {
        showCustomModal('Validation Error', 'Please select an issue type');
        return false;
    }
    
    if (!description && !reportData.photo) {
        showCustomModal('Validation Error', 'Please provide either a description or photo evidence');
        return false;
    }
    
    return true;
}

function validateContactDetails() {
    const reporterEmail = document.getElementById('reporterEmail')?.value.trim();
    
    // Email is optional, but if provided, should be valid
    if (reporterEmail && !isValidEmail(reporterEmail)) {
        showCustomModal('Validation Error', 'Please enter a valid email address');
        return false;
    }
    
    return true;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/* ========================================
   ISSUE TYPE HANDLING
   ======================================== */

function handleIssueTypeChange(e) {
    const issueType = e.target.value;
    const customDescriptionContainer = document.getElementById('customDescriptionContainer');
    
    // Show/hide custom description based on issue type
    if (issueType === 'other') {
        customDescriptionContainer?.classList.remove('hidden');
    } else {
        customDescriptionContainer?.classList.add('hidden');
    }
    
    // Pre-fill description based on issue type
    const descriptionTextarea = document.getElementById('reportDescription');
    if (descriptionTextarea && issueType !== 'other') {
        const descriptions = {
            'damaged': 'The pātaka appears to be damaged and needs repair.',
            'empty': 'The pātaka has been empty for an extended period.',
            'full': 'The pātaka is overfull and items may be spoiling.',
            'maintenance': 'The pātaka requires general maintenance or cleaning.',
            'vandalism': 'The pātaka has been vandalized or tampered with.',
            'access': 'There are issues accessing the pātaka (locked, blocked, etc.).'
        };
        
        if (descriptions[issueType]) {
            descriptionTextarea.value = descriptions[issueType];
        }
    }
}

/* ========================================
   PHOTO HANDLING
   ======================================== */

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
            const preview = document.getElementById('reportPhotoPreview');
            const container = document.getElementById('reportPhotoPreviewContainer');
            if (preview && container) {
                preview.src = e.target.result;
                container.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
        
        reportData.photo = file;
        console.log('📷 Report photo selected:', file.name);
    }
}

/* ========================================
   REPORT SUBMISSION
   ======================================== */

async function submitReport() {
    try {
        // Validate all data
        if (!selectedPataka) {
            showCustomModal('Error', 'No pātaka selected');
            return;
        }
        
        if (!validateContactDetails()) {
            return;
        }
        
        // Collect all form data
        const issueType = document.querySelector('input[name="issueType"]:checked')?.value;
        const description = document.getElementById('reportDescription')?.value.trim();
        const reporterName = document.getElementById('reporterName')?.value.trim();
        const reporterEmail = document.getElementById('reporterEmail')?.value.trim();
        const okToContact = document.getElementById('okToContact')?.checked || false;
        
        // Show loading state
        const submitBtn = document.getElementById('reportSubmitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        // Prepare submission data
        const submissionData = {
            patakaId: selectedPataka.id,
            issueType: issueType,
            description: description,
            reporterName: reporterName,
            reporterEmail: reporterEmail,
            okToContact: okToContact,
            photo: reportData.photo,
            timestamp: new Date().toISOString()
        };
        
        console.log('⚠️ Submitting report:', submissionData);
        
        // Call the existing ReportIssue API
        await submitReportToAPI(submissionData);
        
        // Show success
        showReportSuccess();
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('❌ Error submitting report:', error);
        showCustomModal('Submission Error', 'Failed to submit report. Please try again.');
        
        const submitBtn = document.getElementById('reportSubmitBtn');
        submitBtn.textContent = 'Submit Report';
        submitBtn.disabled = false;
    }
}

async function submitReportToAPI(data) {
    try {
        // Use the existing ReportIssue API endpoint
        const formData = new FormData();
        formData.append('patakaId', data.patakaId);
        formData.append('description', data.description);
        
        if (data.reporterName) {
            formData.append('reporterName', data.reporterName);
        }
        
        if (data.reporterEmail) {
            formData.append('reporterEmail', data.reporterEmail);
        }
        
        if (data.okToContact) {
            formData.append('okToContact', 'true');
        }
        
        if (data.photo) {
            formData.append('photo', data.photo);
        }
        
        const response = await fetch(`${API_BASE_URL}/ReportIssue`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Report submitted successfully:', result);
        
        return result;
        
    } catch (error) {
        console.error('❌ API call failed:', error);
        throw error;
    }
}

function showReportSuccess() {
    // Hide current section
    document.getElementById('reportSection3').classList.remove('active');
    
    // Show success section
    const successSection = document.getElementById('reportSection4');
    if (successSection) {
        successSection.classList.add('active');
    } else {
        // Create success section if it doesn't exist
        const reportView = document.getElementById('reportView');
        const successHTML = `
            <div id="reportSection4" class="action-section active">
                <div class="section-content">
                    <div class="success-message">
                        <h3>✅ Report Submitted!</h3>
                        <p>Thank you for reporting the issue at ${selectedPataka?.name}!</p>
                        <p>The kaitiaki has been notified and will address the issue as soon as possible.</p>
                        ${reportData.reporterEmail ? '<p>You will receive updates if you provided your email.</p>' : ''}
                    </div>
                    <div class="action-buttons">
                        <button id="reportBackToMapBtn" class="btn btn-primary">Back to Map</button>
                        <button onclick="setActiveTab('report')" class="btn btn-secondary">Report Another Issue</button>
                    </div>
                </div>
            </div>
        `;
        reportView.insertAdjacentHTML('beforeend', successHTML);
        
        // Add event listener for back button
        document.getElementById('reportBackToMapBtn').addEventListener('click', () => {
            setActiveTab('find');
            switchToMap();
        });
    }
    
    // Update step indicator
    document.getElementById('step3')?.classList.add('completed');
    
    // Reset report data
    resetReportData();
}

function resetReportData() {
    reportData = {
        pataka: null,
        description: '',
        photo: null,
        reporterName: '',
        reporterEmail: '',
        okToContact: false
    };
    
    // Clear form inputs
    document.getElementById('reportDescription').value = '';
    document.getElementById('reporterName').value = '';
    document.getElementById('reporterEmail').value = '';
    document.getElementById('okToContact').checked = false;
    
    // Clear radio selections
    document.querySelectorAll('input[name="issueType"]').forEach(radio => {
        radio.checked = false;
    });
    
    // Clear photo preview
    const preview = document.getElementById('reportPhotoPreview');
    const container = document.getElementById('reportPhotoPreviewContainer');
    if (preview && container) {
        preview.src = '';
        container.classList.add('hidden');
    }
    
    // Hide custom description container
    document.getElementById('customDescriptionContainer')?.classList.add('hidden');
}
