/* ========================================
   DONATE WORKFLOW MODULE
   ======================================== */

let donateData = {
    pataka: null,
    photo: null,
    aiResults: [],
    manualItems: [],
    comment: ''
};

/* ========================================
   DONATE EVENT LISTENERS SETUP
   ======================================== */

function setupDonateEventListeners() {
    // QR Scanner events
    document.getElementById('donateUnableToScanBtn')?.addEventListener('click', async () => {
        await stopQRScanner();
        await populatePatakaDropdown('donatePatakaSelect');
        document.getElementById('donateSection1').classList.remove('active');
        document.getElementById('donateSection1b')?.classList.add('active');
    });

    document.getElementById('cancelDonateBtn')?.addEventListener('click', async () => {
        await stopQRScanner();
        setActiveTab('find');
        switchToMap();
    });

    // Manual selection
    document.getElementById('donatePatakaSelect')?.addEventListener('change', (e) => {
        if (e.target.value) {
            handleManualPatakaSelection('donatePatakaSelect', 'donate');
        }
    });

    document.getElementById('backToDonateQRBtn')?.addEventListener('click', () => {
        document.getElementById('donateSection1b').classList.remove('active');
        document.getElementById('donateSection1').classList.add('active');
        startQRScanner('donateQRVideo', 'donate');
    });

    // Photo step events
    document.getElementById('donateSkipPhotoBtn')?.addEventListener('click', () => {
        proceedToDonateItems();
    });

    document.getElementById('donateAnalyzePhotoBtn')?.addEventListener('click', async () => {
        if (donateData.photo) {
            await analyzePhotoForDonation();
        } else {
            showCustomModal('No Photo', 'Please take or select a photo first');
        }
    });

    document.getElementById('donatePhotoBackBtn')?.addEventListener('click', () => {
        document.getElementById('donateSection2').classList.remove('active');
        document.getElementById('donateSection1').classList.add('active');
        
        document.getElementById('donateStep2').classList.remove('active');
        document.getElementById('donateStep1').classList.add('active');
        document.getElementById('donateStep1').classList.remove('completed');
    });

    // AI Results step events
    document.getElementById('donateAINextBtn')?.addEventListener('click', () => {
        proceedToDonateComment();
    });

    document.getElementById('donateAIBackBtn')?.addEventListener('click', () => {
        document.getElementById('donateSection3').classList.remove('active');
        document.getElementById('donateSection2').classList.add('active');
        
        document.getElementById('donateStep3').classList.remove('active');
        document.getElementById('donateStep2').classList.add('active');
        document.getElementById('donateStep2').classList.remove('completed');
    });

    // Manual item addition
    document.getElementById('donateAddManualBtn')?.addEventListener('click', () => {
        const name = document.getElementById('donateManualItemName')?.value.trim();
        const qty = parseInt(document.getElementById('donateManualItemQty')?.value);
        
        if (name && qty > 0) {
            addManualItem(name, qty, 'donate');
            document.getElementById('donateManualItemName').value = '';
            document.getElementById('donateManualItemQty').value = '1';
        }
    });

    // Final submission
    document.getElementById('donateSubmitBtn')?.addEventListener('click', async () => {
        await submitDonation();
    });

    document.getElementById('donateCommentBackBtn')?.addEventListener('click', () => {
        document.getElementById('donateSection4').classList.remove('active');
        document.getElementById('donateSection3').classList.add('active');
        
        document.getElementById('donateStep4').classList.remove('active');
        document.getElementById('donateStep3').classList.add('active');
        document.getElementById('donateStep3').classList.remove('completed');
    });

    // Success screen
    document.getElementById('donateBackToMapBtn')?.addEventListener('click', () => {
        setActiveTab('find');
        switchToMap();
    });

    // Initialize QR scanner when donate tab becomes active
    const donateTab = document.querySelector('[data-tab="donate"]');
    donateTab?.addEventListener('click', () => {
        setTimeout(() => {
            startQRScanner('donateQRVideo', 'donate');
        }, 300);
    });
}

/* ========================================
   WORKFLOW NAVIGATION
   ======================================== */

function proceedToDonateItems() {
    document.getElementById('donateSection2').classList.remove('active');
    document.getElementById('donateSection3')?.classList.add('active');
    
    document.getElementById('donateStep2').classList.remove('active');
    document.getElementById('donateStep2').classList.add('completed');
    document.getElementById('donateStep3')?.classList.add('active');
    
    renderDonateItems();
}

function proceedToDonateComment() {
    document.getElementById('donateSection3').classList.remove('active');
    document.getElementById('donateSection4')?.classList.add('active');
    
    document.getElementById('donateStep3').classList.remove('active');
    document.getElementById('donateStep3').classList.add('completed');
    document.getElementById('donateStep4')?.classList.add('active');
}

/* ========================================
   PHOTO ANALYSIS
   ======================================== */

async function analyzePhotoForDonation() {
    if (!donateData.photo) {
        showCustomModal('No Photo', 'Please select a photo first');
        return;
    }
    
    try {
        // Show loading state
        const analyzeBtn = document.getElementById('donateAnalyzePhotoBtn');
        const originalText = analyzeBtn.textContent;
        analyzeBtn.textContent = 'Analyzing...';
        analyzeBtn.disabled = true;
        
        // TODO: Call Azure Computer Vision API
        // For now, simulate AI analysis
        donateData.aiResults = await simulateAIAnalysis(donateData.photo);
        
        // Proceed to items review
        proceedToDonateItems();
        
        analyzeBtn.textContent = originalText;
        analyzeBtn.disabled = false;
        
    } catch (error) {
        console.error('❌ Error analyzing photo:', error);
        showCustomModal('Analysis Error', 'Failed to analyze photo. You can still add items manually.');
        
        // Proceed anyway
        proceedToDonateItems();
    }
}

async function simulateAIAnalysis(photoFile) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock results
    return [
        { name: 'Apple', confidence: 0.92, emoji: '🍎', quantity: 3 },
        { name: 'Bread', confidence: 0.87, emoji: '🍞', quantity: 1 },
        { name: 'Milk', confidence: 0.78, emoji: '🥛', quantity: 1 }
    ];
}

/* ========================================
   ITEMS MANAGEMENT
   ======================================== */

function renderDonateItems() {
    const container = document.getElementById('donateDetectedItems');
    if (!container) return;
    
    const allItems = [...donateData.aiResults, ...donateData.manualItems];
    
    if (allItems.length === 0) {
        container.innerHTML = `
            <div class="no-items">
                <p>No items detected. Add items manually below.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allItems.map((item, index) => `
        <div class="detected-item">
            <div class="item-header">
                <h5>${item.emoji} ${item.name}</h5>
                <button onclick="removeDonateItem(${index})" class="remove-item-btn">✕</button>
            </div>
            ${item.confidence ? `
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${item.confidence * 100}%"></div>
                </div>
                <p class="confidence-text">${Math.round(item.confidence * 100)}% confidence</p>
            ` : ''}
            <div class="quantity-controls">
                <label>Quantity:</label>
                <div class="quantity-input">
                    <button onclick="adjustDonateQuantity(${index}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="adjustDonateQuantity(${index}, 1)">+</button>
                </div>
            </div>
        </div>
    `).join('');
}

function addManualItem(name, quantity, type) {
    if (type === 'donate') {
        donateData.manualItems.push({
            name: name,
            quantity: quantity,
            emoji: getItemEmoji(name),
            isManual: true
        });
        renderDonateItems();
    }
}

function removeDonateItem(index) {
    const allItems = [...donateData.aiResults, ...donateData.manualItems];
    
    if (index < donateData.aiResults.length) {
        // Removing AI result
        donateData.aiResults.splice(index, 1);
    } else {
        // Removing manual item
        const manualIndex = index - donateData.aiResults.length;
        donateData.manualItems.splice(manualIndex, 1);
    }
    
    renderDonateItems();
}

function adjustDonateQuantity(index, change) {
    const allItems = [...donateData.aiResults, ...donateData.manualItems];
    
    if (index < donateData.aiResults.length) {
        // Adjusting AI result
        donateData.aiResults[index].quantity = Math.max(1, donateData.aiResults[index].quantity + change);
    } else {
        // Adjusting manual item
        const manualIndex = index - donateData.aiResults.length;
        donateData.manualItems[manualIndex].quantity = Math.max(1, donateData.manualItems[manualIndex].quantity + change);
    }
    
    renderDonateItems();
}

/* ========================================
   DONATION SUBMISSION
   ======================================== */

async function submitDonation() {
    try {
        // Validate donation data
        if (!selectedPataka) {
            showCustomModal('Error', 'No pātaka selected');
            return;
        }
        
        const allItems = [...donateData.aiResults, ...donateData.manualItems];
        if (allItems.length === 0) {
            showCustomModal('Error', 'Please add at least one item');
            return;
        }
        
        // Get comment
        const comment = document.getElementById('donateCommentInput')?.value.trim() || '';
        
        // Show loading state
        const submitBtn = document.getElementById('donateSubmitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        // Prepare submission data
        const submissionData = {
            patakaId: selectedPataka.id,
            items: allItems.map(item => ({
                name: item.name,
                quantity: item.quantity,
                confidence: item.confidence || null
            })),
            comment: comment,
            photo: donateData.photo,
            timestamp: new Date().toISOString(),
            transactionType: 'donation'
        };
        
        console.log('📤 Submitting donation:', submissionData);
        
        // TODO: Call actual API
        await submitToAPI(submissionData);
        
        // Show success
        showDonateSuccess();
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('❌ Error submitting donation:', error);
        showCustomModal('Submission Error', 'Failed to submit donation. Please try again.');
        
        const submitBtn = document.getElementById('donateSubmitBtn');
        submitBtn.textContent = 'Submit Donation';
        submitBtn.disabled = false;
    }
}

async function submitToAPI(data) {
    // Simulate API call for now
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // TODO: Replace with actual API call to submitDonation endpoint
    /*
    const formData = new FormData();
    formData.append('patakaId', data.patakaId);
    formData.append('items', JSON.stringify(data.items));
    formData.append('comment', data.comment);
    formData.append('timestamp', data.timestamp);
    if (data.photo) {
        formData.append('photo', data.photo);
    }
    
    const response = await fetch(`${API_BASE_URL}/submitDonation`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
    */
}

function showDonateSuccess() {
    // Hide current section
    document.getElementById('donateSection4').classList.remove('active');
    
    // Show success section
    const successSection = document.getElementById('donateSection5');
    if (successSection) {
        successSection.classList.add('active');
    } else {
        // Create success section if it doesn't exist
        const donateView = document.getElementById('donateView');
        const successHTML = `
            <div id="donateSection5" class="action-section active">
                <div class="section-content">
                    <div class="success-message">
                        <h3>🎉 Donation Successful!</h3>
                        <p>Thank you for your generous donation to ${selectedPataka?.name}!</p>
                        <p>Your contribution helps feed our community.</p>
                    </div>
                    <div class="action-buttons">
                        <button id="donateBackToMapBtn" class="btn btn-primary">Back to Map</button>
                        <button onclick="setActiveTab('donate')" class="btn btn-secondary">Donate Again</button>
                    </div>
                </div>
            </div>
        `;
        donateView.insertAdjacentHTML('beforeend', successHTML);
        
        // Add event listener for back button
        document.getElementById('donateBackToMapBtn').addEventListener('click', () => {
            setActiveTab('find');
            switchToMap();
        });
    }
    
    // Update step indicator
    document.getElementById('donateStep4')?.classList.add('completed');
    
    // Reset donation data
    resetDonateData();
}

function resetDonateData() {
    donateData = {
        pataka: null,
        photo: null,
        aiResults: [],
        manualItems: [],
        comment: ''
    };
    
    // Clear photo preview
    const preview = document.getElementById('donatePhotoPreview');
    const container = document.getElementById('donatePhotoPreviewContainer');
    if (preview && container) {
        preview.src = '';
        container.classList.add('hidden');
    }
    
    // Clear form inputs
    document.getElementById('donateManualItemName').value = '';
    document.getElementById('donateManualItemQty').value = '1';
    document.getElementById('donateCommentInput').value = '';
}
