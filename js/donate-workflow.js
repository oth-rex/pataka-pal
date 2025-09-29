// Flow reset functions
function resetDonateFlow() {
    document.querySelectorAll('#donateView .action-section').forEach(section => section.classList.remove('active'));
    document.getElementById('donateSection1').classList.add('active');
    
    document.querySelectorAll('#donateView .step').forEach(step => step.classList.remove('active', 'completed'));
    document.getElementById('donateStep1').classList.add('active');
    
    selectedPataka = null;
    actionData = {};
}

// Navigation functions
function proceedToDonatePhoto() {
    document.getElementById('donateSelectedPatakaName').textContent = selectedPataka.name;
    
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
    
    if (actionData.photo) {
        const aiResult = await analyzeImageWithAI(actionData.photo);
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
    
    actionData.detectedItems = detectedItems;
}

function showDonateSuccess() {
    document.getElementById('donateSection4').classList.remove('active');
    document.getElementById('donateSuccess').classList.add('active');
    document.getElementById('donateStep4').classList.remove('active');
    document.getElementById('donateStep4').classList.add('completed');
}

// Helper functions
async function populatePatakaDropdown(selectId) {
    await fetchCupboards();
    const select = document.getElementById(selectId);
    
    select.innerHTML = '<option value="">Choose a pataka...</option>';
    
    cupboards.forEach(pataka => {
        const option = document.createElement('option');
        option.value = pataka.id;
        option.textContent = `${pataka.name} - ${pataka.address}`;
        select.appendChild(option);
    });
}

function addManualItem(name, quantity, actionType) {
    if (!actionData.detectedItems) actionData.detectedItems = [];
    
    const newItem = {
        name: name,
        quantity: quantity,
        emoji: getItemEmoji(name),
        confidence: 1.0,
        manual: true
    };
    
    actionData.detectedItems.push(newItem);
    displayAIResults(actionData.detectedItems, actionType);
}

function setupDonateEventListeners() {
    document.getElementById('donateUnableToScanBtn').addEventListener('click', async () => {
        await stopQRScanner();
        await populatePatakaDropdown('donatePatakaSelect');
        document.getElementById('donateSection1').classList.remove('active');
        document.getElementById('donateSection1b').classList.add('active');
    });

    document.getElementById('cancelDonateBtn').addEventListener('click', async () => {
        await stopQRScanner();
        setActiveTab('find');
        switchToMap();
    });

    document.getElementById('backToDonateQRBtn').addEventListener('click', () => {
        document.getElementById('donateSection1b').classList.remove('active');
        document.getElementById('donateSection1').classList.add('active');
        startQRScanner('donate-qr-scanner', 'donate');
    });

    document.getElementById('donatePatakaSelect').addEventListener('change', (e) => {
        const cupboardId = parseInt(e.target.value);
        const confirmBtn = document.getElementById('confirmDonatePatakaBtn');
        
        if (cupboardId) {
            selectedPataka = cupboards.find(p => p.id === cupboardId);
            confirmBtn.disabled = false;
        } else {
            selectedPataka = null;
            confirmBtn.disabled = true;
        }
    });

    document.getElementById('confirmDonatePatakaBtn').addEventListener('click', () => {
        proceedToDonatePhoto();
    });

    document.getElementById('donatePhotoNextBtn').addEventListener('click', () => {
        document.getElementById('donateSection2').classList.remove('active');
        document.getElementById('donateSection3').classList.add('active');
        document.getElementById('donateStep2').classList.remove('active');
        document.getElementById('donateStep2').classList.add('completed');
        document.getElementById('donateStep3').classList.add('active');
        
        processAIAnalysis('donate');
    });

    document.getElementById('donatePhotoBackBtn').addEventListener('click', () => {
        document.getElementById('donateSection2').classList.remove('active');
        document.getElementById('donateSection1').classList.add('active');
        
        document.getElementById('donateStep2').classList.remove('active');
        document.getElementById('donateStep1').classList.add('active');
        document.getElementById('donateStep1').classList.remove('completed');
        
        startQRScanner('donate-qr-scanner', 'donate');
    });

    document.getElementById('donateAINextBtn').addEventListener('click', () => {
        document.getElementById('donateSection3').classList.remove('active');
        document.getElementById('donateSection4').classList.add('active');
        
        document.getElementById('donateStep3').classList.remove('active');
        document.getElementById('donateStep3').classList.add('completed');
        document.getElementById('donateStep4').classList.add('active');
    });

    document.getElementById('donateAIBackBtn').addEventListener('click', () => {
        document.getElementById('donateSection3').classList.remove('active');
        document.getElementById('donateSection2').classList.add('active');
        
        document.getElementById('donateStep3').classList.remove('active');
        document.getElementById('donateStep2').classList.add('active');
        document.getElementById('donateStep2').classList.remove('completed');
    });

    document.getElementById('donateAddManualBtn').addEventListener('click', () => {
        const name = document.getElementById('donateManualItemName').value.trim();
        const qty = parseInt(document.getElementById('donateManualItemQty').value);
        
        if (name && qty > 0) {
            addManualItem(name, qty, 'donate');
            document.getElementById('donateManualItemName').value = '';
            document.getElementById('donateManualItemQty').value = '1';
        }
    });

    document.getElementById('donateSubmitBtn').addEventListener('click', () => {
        console.log('Donation submitted');
        showDonateSuccess();
    });

    document.getElementById('donateCommentBackBtn').addEventListener('click', () => {
        document.getElementById('donateSection4').classList.remove('active');
        document.getElementById('donateSection3').classList.add('active');
        
        document.getElementById('donateStep4').classList.remove('active');
        document.getElementById('donateStep3').classList.add('active');
        document.getElementById('donateStep3').classList.remove('completed');
    });

    document.getElementById('donateBackToMapBtn').addEventListener('click', () => {
        setActiveTab('find');
        switchToMap();
    });
}

/** Option B encapsulation for Donate flow **/
(function(){
  // Expose on window for app-core.js
  window.setupDonateEventListeners = function setupDonateEventListeners() {
    const root = document.querySelector('#donateView') || document;
    // Prefer namespaced IDs; also support data-attrs fallback
    const takeBtn = root.querySelector('#donateTakePhotoBtn, [data-action="donate-take-photo"]');
    const fileBtn = root.querySelector('#donateSelectPhotoBtn, [data-action="donate-select-photo"]');
    const fileInput = root.querySelector('#donatePhotoInput, input[data-role="donate-photo-input"]');
    const previewImg = root.querySelector('#donateImagePreview, img[data-role="donate-image-preview"]');

    if (!fileInput) {
      console.warn('[donate] photo input not found');
    }

    // Clean previous listeners (idempotent)
    if (takeBtn && takeBtn._donateBound !== true) {
      takeBtn.addEventListener('click', () => {
        // Mobile browsers often need an <input capture>. If present, click it.
        if (fileInput) fileInput.click();
      });
      takeBtn._donateBound = true;
    }

    if (fileBtn && fileBtn._donateBound !== true) {
      fileBtn.addEventListener('click', () => {
        if (fileInput) fileInput.click();
      });
      fileBtn._donateBound = true;
    }

    if (fileInput && fileInput._donateBound !== true) {
      fileInput.addEventListener('change', async () => {
        try {
          // Lazy import to avoid bundling if not needed
          const utils = await import('./photo-utils.js');
          const { file, error } = utils.pickFirstFile(fileInput, { maxBytes: 8_000_000, acceptTypes: ['image/jpeg','image/png','image/webp'] });
          if (error) {
            console.warn('[donate] ' + error);
            return;
          }
          const dataURL = await utils.fileToDataURL(file);
          const blob = await utils.resizeDataURL(dataURL, { maxW: 1600, maxH: 1600, quality: 0.85, type: 'image/jpeg' });
          const previewURL = await utils.blobToDataURL(blob);

          if (previewImg) {
            previewImg.src = previewURL;
            previewImg.dataset.hasImage = "1";
          }
          // store for submit
          window.__donatePhotoBlob = blob;
        } catch (e) {
          console.error('[donate] file handling failed', e);
        }
      });
      fileInput._donateBound = true;
    }

    // Hook submit if present
    const submitBtn = root.querySelector('#donateSubmitBtn, [data-action="donate-submit"]');
    if (submitBtn && submitBtn._donateBound !== true) {
      submitBtn.addEventListener('click', async (e) => {
        try {
          e.preventDefault();
          const photoBlob = window.__donatePhotoBlob || null;
          // If donate module already had a specific proceed function, call it.
          if (typeof window.proceedToDonatePhoto === 'function') {
            await window.proceedToDonatePhoto(photoBlob);
          } else {
            console.warn('[donate] proceedToDonatePhoto not found; skipped.');
          }
        } catch (err) {
          console.error('[donate] submit failed', err);
        }
      });
      submitBtn._donateBound = true;
    }
  };
})();
