/* ========================================
   TAKE WORKFLOW MODULE
   ======================================== */

let takeData = {
    pataka: null,
    photo: null,
    selectedItems: [],
    comment: ''
};

/* ========================================
   TAKE EVENT LISTENERS SETUP
   ======================================== */

function setupTakeEventListeners() {
    // QR Scanner events
    document.getElementById('takeUnableToScanBtn')?.addEventListener('click', async () => {
        await stopQRScanner();
        await populatePatakaDropdown('takePatakaSelect');
        document.getElementById('takeSection1').classList.remove('active');
        document.getElementById('takeSection1b')?.classList.add('active');
    });

    document.getElementById('cancelTakeBtn')?.addEventListener('click', async () => {
        await stopQRScanner();
        setActiveTab('find');
        switchToMap();
    });

    // Manual selection
    document.getElementById('takePatakaSelect')?.addEventListener('change', (e) => {
        if (e.target.value) {
            handleManualPatakaSelection('takePatakaSelect', 'take');
        }
    });

    document.getElementById('backToTakeQRBtn')?.addEventListener('click', () => {
        document.getElementById('takeSection1b').classList.remove('active');
        document.getElementById('takeSection1').classList.add('active');
        startQRScanner('takeQRVideo', 'take');
    });

    // Photo step events
    document.getElementById('takeSkipPhotoBtn')?.addEventListener('click', () => {
        proceedToTakeItems();
    });

    document.getElementById('takeAnalyzePhotoBtn')?.addEventListener('click', async () => {
        if (takeData.photo) {
            await analyzePhotoForTaking();
        } else {
            showCustomModal('No Photo', 'Please take or select a photo first');
        }
    });

    document.getElementById('takePhotoBackBtn')?.addEventListener('click', () => {
        document.getElementById('takeSection2').classList.remove('active');
        document.getElementById('takeSection1').classList.add('active');
        
        document.getElementById('takeStep2').classList.remove('active');
        document.getElementById('takeStep1').classList.add('active');
        document.getElementById('takeStep1').classList.remove('completed');
    });

    // Items selection step events
    document.getElementById('takeItemsNextBtn')?.addEventListener('click', () => {
        if (takeData.selectedItems.length > 0) {
            proceedToTakeComment();
        } else {
            showCustomModal('No Items Selected', 'Please select at least one item to take');
        }
    });

    document.getElementById('takeItemsBackBtn')?.addEventListener('click', () => {
        document.getElementById('takeSection3').classList.remove('active');
        document.getElementById('takeSection2').classList.add('active');
        
        document.getElementById('takeStep3').classList.remove('active');
        document.getElementById('takeStep2').classList.add('active');
        document.getElementById('takeStep2').classList.remove('completed');
    });

    // Manual item addition
    document.getElementById('takeAddManualBtn')?.addEventListener('click', () => {
        const name = document.getElementById('takeManualItemName')?.value.trim();
        const qty = parseInt(document.getElementById('takeManualItemQty')?.value);
        
        if (name && qty > 0) {
            addManualItem(name, qty, 'take');
            document.getElementById('takeManualItemName').value = '';
            document.getElementById('takeManualItemQty').value = '1';
        }
    });

    // Final submission
    document.getElementById('takeSubmitBtn')?.addEventListener('click', async () => {
        await submitTaking();
    });

    document.getElementById('takeCommentBackBtn')?.addEventListener('click', () => {
        document.getElementById('takeSection4').classList.remove('active');
        document.getElementById('takeSection3').classList.add('active');
        
        document.getElementById('takeStep4').classList.remove('active');
        document.getElementById('takeStep3').classList.add('active');
        document.getElementById('takeStep3').classList.remove('completed');
    });

    // Success screen
    document.getElementById('takeBackToMapBtn')?.addEventListener('click', () => {
        setActiveTab('find');
        switchToMap();
    });

    // Initialize QR scanner when take tab becomes active
    const takeTab = document.querySelector('[data-tab="take"]');
    takeTab?.addEventListener('click', () => {
        setTimeout(() => {
            startQRScanner('takeQRVideo', 'take');
        }, 300);
    });
}

/* ========================================
   WORKFLOW NAVIGATION
   ======================================== */

function proceedToTakeItems() {
    document.getElementById('takeSection2').classList.remove('active');
    document.getElementById('takeSection3')?.classList.add('active');
    
    document.getElementById('takeStep2').classList.remove('active');
    document.getElementById('takeStep2').classList.add('completed');
    document.getElementById('takeStep3')?.classList.add('active');
    
    renderAvailableItems();
}

function proceedToTakeComment() {
    document.getElementById('takeSection3').classList.remove('active');
    document.getElementById('takeSection4')?.classList.add('active');
    
    document.getElementById('takeStep3').classList.remove('active');
    document.getElementById('takeStep3').classList.add('completed');
    document.getElementById('takeStep4')?.classList.add('active');
    
    renderSelectedItemsSummary();
}

/* ========================================
   PHOTO ANALYSIS
   ======================================== */

async function analyzePhotoForTaking() {
    if (!takeData.photo) {
        showCustomModal('No Photo', 'Please select a photo first');
        return;
    }
    
    try {
        // Show loading state
        const analyzeBtn = document.getElementById('takeAnalyzePhotoBtn');
        const originalText = analyzeBtn.textContent;
        analyzeBtn.textContent = 'Analyzing...';
        analyzeBtn.disabled = true;
        
        // TODO: Call Azure Computer Vision API to identify items
        // For now, proceed to items selection
        proceedToTakeItems();
        
        analyzeBtn.textContent = originalText;
        analyzeBtn.disabled = false;
        
    } catch (error) {
        console.error('❌ Error analyzing photo:', error);
        showCustomModal('Analysis Error', 'Failed to analyze photo. You can still select items manually.');
        
        // Proceed anyway
        proceedToTakeItems();
    }
}

/* ========================================
   ITEMS MANAGEMENT
   ======================================== */

function renderAvailableItems() {
    const container = document.getElementById('takeAvailableItems');
    if (!container) return;
    
    if (!selectedPataka || !selectedPataka.inventory || selectedPataka.inventory.length === 0) {
        container.innerHTML = `
            <div class="no-items">
                <p>No items currently available at this pātaka.</p>
                <p>You can add items you're taking manually below.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = selectedPataka.inventory.map((item, index) => `
        <div class="available-item" data-index="${index}">
            <div class="item-info">
                <h5>${getItemEmoji(item.Name)} ${item.Name}</h5>
                <p>Available: ${item.Quantity}</p>
            </div>
            <div class="take-controls">
                <div class="quantity-input">
                    <button onclick="adjustTakeQuantity(${index}, -1)">-</button>
                    <span id="take-qty-${index}">0</span>
                    <button onclick="adjustTakeQuantity(${index}, 1)">+</button>
                </div>
                <button onclick="toggleTakeItem(${index})" class="take-btn" id="take-btn-${index}">
                    Take
                </button>
            </div>
        </div>
    `).join('');
}

function toggleTakeItem(index) {
    const item = selectedPataka.inventory[index];
    const btn = document.getElementById(`take-btn-${index}`);
    const qtyDisplay = document.getElementById(`take-qty-${index}`);
    
    const existingIndex = takeData.selectedItems.findIndex(selected => selected.originalIndex === index);
    
    if (existingIndex >= 0) {
        // Remove from selected items
        takeData.selectedItems.splice(existingIndex, 1);
        btn.textContent = 'Take';
        btn.classList.remove('selected');
        qtyDisplay.textContent = '0';
    } else {
        // Add to selected items
        const quantity = Math.min(1, item.Quantity);
        takeData.selectedItems.push({
            name: item.Name,
            quantity: quantity,
            available: item.Quantity,
            originalIndex: index,
            emoji: getItemEmoji(item.Name)
        });
        btn.textContent = 'Selected';
        btn.classList.add('selected');
        qtyDisplay.textContent = quantity.toString();
    }
}

function adjustTakeQuantity(index, change) {
    const item = selectedPataka.inventory[index];
    const selectedIndex = takeData.selectedItems.findIndex(selected => selected.originalIndex === index);
    
    if (selectedIndex >= 0) {
        const currentQty = takeData.selectedItems[selectedIndex].quantity;
        const newQty = Math.max(0, Math.min(item.Quantity, currentQty + change));
        
        if (newQty === 0) {
            // Remove item if quantity becomes 0
            toggleTakeItem(index);
        } else {
            takeData.selectedItems[selectedIndex].quantity = newQty;
            document.getElementById(`take-qty-${index}`).textContent = newQty.toString();
        }
    } else if (change > 0) {
        // Add item if increasing from 0
        toggleTakeItem(index);
    }
}

function addManualItem(name, quantity, type) {
    if (type === 'take') {
        takeData.selectedItems.push({
            name: name,
            quantity: quantity,
            emoji: getItemEmoji(name),
            isManual: true,
            originalIndex: -1
        });
        
        // Re-render to show the new item
        renderSelectedItemsSummary();
    }
}

function renderSelectedItemsSummary() {
    const container = document.getElementById('takeSelectedItems');
    if (!container) return;
    
    if (takeData.selectedItems.length === 0) {
        container.innerHTML = `
            <div class="no-items">
                <p>No items selected for taking.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = takeData.selectedItems.map((item, index) => `
        <div class="selected-item">
            <div class="item-header">
                <h5>${item.emoji} ${item.name}</h5>
                <button onclick="removeSelectedItem(${index})" class="remove-item-btn">✕</button>
            </div>
            <div class="item-details">
                <p>Taking: ${item.quantity}</p>
                ${item.available ? `<p>Available: ${item.available}</p>` : ''}
                ${item.isManual ? '<p><em>Manually added</em></p>' : ''}
            </div>
        </div>
    `).join('');
}

function removeSelectedItem(index) {
    takeData.selectedItems.splice(index, 1);
    renderSelectedItemsSummary();
}

/* ========================================
   TAKING SUBMISSION
   ======================================== */

async function submitTaking() {
    try {
        // Validate taking data
        if (!selectedPataka) {
            showCustomModal('Error', 'No pātaka selected');
            return;
        }
        
        if (takeData.selectedItems.length === 0) {
            showCustomModal('Error', 'Please select at least one item');
            return;
        }
        
        // Get comment
        const comment = document.getElementById('takeCommentInput')?.value.trim() || '';
        
        // Show loading state
        const submitBtn = document.getElementById('takeSubmitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        // Prepare submission data
        const submissionData = {
            patakaId: selectedPataka.id,
            items: takeData.selectedItems.map(item => ({
                name: item.name,
                quantity: item.quantity,
                isManual: item.isManual || false
            })),
            comment: comment,
            photo: takeData.photo,
            timestamp: new Date().toISOString(),
            transactionType: 'collection'
        };
        
        console.log('📥 Submitting taking:', submissionData);
        
        // TODO: Call actual API
        await submitTakingToAPI(submissionData);
        
        // Show success
        showTakeSuccess();
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('❌ Error submitting taking:', error);
        showCustomModal('Submission Error', 'Failed to submit taking. Please try again.');
        
        const submitBtn = document.getElementById('takeSubmitBtn');
        submitBtn.textContent = 'Submit Taking';
        submitBtn.disabled = false;
    }
}

async function submitTakingToAPI(data) {
    // Simulate API call for now
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // TODO: Replace with actual API call to submitTaking endpoint
    /*
    const formData = new FormData();
    formData.append('patakaId', data.patakaId);
    formData.append('items', JSON.stringify(data.items));
    formData.append('comment', data.comment);
    formData.append('timestamp', data.timestamp);
    if (data.photo) {
        formData.append('photo', data.photo);
    }
    
    const response = await fetch(`${API_BASE_URL}/submitTaking`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
    */
}

function showTakeSuccess() {
    // Hide current section
    document.getElementById('takeSection4').classList.remove('active');
    
    // Show success section
    const successSection = document.getElementById('takeSection5');
    if (successSection) {
        successSection.classList.add('active');
    } else {
        // Create success section if it doesn't exist
        const takeView = document.getElementById('takeView');
        const successHTML = `
            <div id="takeSection5" class="action-section active">
                <div class="section-content">
                    <div class="success-message">
                        <h3>✅ Taking Recorded!</h3>
                        <p>Thank you for updating the inventory at ${selectedPataka?.name}!</p>
                        <p>Enjoy your food and stay well.</p>
                    </div>
                    <div class="action-buttons">
                        <button id="takeBackToMapBtn" class="btn btn-primary">Back to Map</button>
                        <button onclick="setActiveTab('take')" class="btn btn-secondary">Take Again</button>
                    </div>
                </div>
            </div>
        `;
        takeView.insertAdjacentHTML('beforeend', successHTML);
        
        // Add event listener for back button
        document.getElementById('takeBackToMapBtn').addEventListener('click', () => {
            setActiveTab('find');
            switchToMap();
        });
    }
    
    // Update step indicator
    document.getElementById('takeStep4')?.classList.add('completed');
    
    // Reset taking data
    resetTakeData();
}

function resetTakeData() {
    takeData = {
        pataka: null,
        photo: null,
        selectedItems: [],
        comment: ''
    };
    
    // Clear photo preview
    const preview = document.getElementById('takePhotoPreview');
    const container = document.getElementById('takePhotoPreviewContainer');
    if (preview && container) {
        preview.src = '';
        container.classList.add('hidden');
    }
    
    // Clear form inputs
    document.getElementById('takeManualItemName').value = '';
    document.getElementById('takeManualItemQty').value = '1';
    document.getElementById('takeCommentInput').value = '';
    
    // Reset item selection UI
    document.querySelectorAll('.take-btn.selected').forEach(btn => {
        btn.classList.remove('selected');
        btn.textContent = 'Take';
    });
    
    document.querySelectorAll('[id^="take-qty-"]').forEach(display => {
        display.textContent = '0';
    });
}
