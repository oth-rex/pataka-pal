// Flow reset functions
function resetDonateFlow() {
    document.querySelectorAll('#donateView .action-section').forEach(section => section.classList.remove('active'));
    document.getElementById('donateSection1').classList.add('active');
    
    document.querySelectorAll('#donateView .step').forEach(step => step.classList.remove('active', 'completed'));
    document.getElementById('donateStep1').classList.add('active');
    
    selectedPataka = null;
    actionData = {};
}
// --- Donate: Step 1 (scan) & manual select wiring ---
(function wireDonateStep1() {
  const scanSection = document.getElementById('donateSection1');
  const manualSection = document.getElementById('donateSection1b');

  // 1) Unable to scan → show manual select
  const unableBtn = document.getElementById('donateUnableToScanBtn');
  if (unableBtn && !unableBtn.__bound) {
    unableBtn.addEventListener('click', async () => {
      try {
        if (typeof stopQRScanner === 'function') stopQRScanner();
        scanSection?.classList.remove('active');
        manualSection?.classList.add('active');

        // populate dropdown
        if (typeof populatePatakaDropdown === 'function') {
          await populatePatakaDropdown('donatePatakaSelect');
        }

        // stepper: 1 completed, 2 active
        document.getElementById('donateStep1')?.classList.remove('active');
        document.getElementById('donateStep1')?.classList.add('completed');
        document.getElementById('donateStep2')?.classList.add('active');
      } catch (e) { console.warn('[donate] unable-to-scan failed', e); }
    });
    unableBtn.__bound = true;
  }

  // 2) Cancel → back to map
  const cancelBtn = document.getElementById('cancelDonateBtn');
  if (cancelBtn && !cancelBtn.__bound) {
    cancelBtn.addEventListener('click', () => {
      try { if (typeof stopQRScanner === 'function') stopQRScanner(); } catch {}
      if (typeof switchToMap === 'function') switchToMap();
    });
    cancelBtn.__bound = true;
  }

  // 3) Manual select: enable Continue when a pataka is chosen
  const select = document.getElementById('donatePatakaSelect');
  const cont   = document.getElementById('donatePatakaContinueBtn'); // v31-style id
  if (select && cont && !select.__bound) {
    select.addEventListener('change', () => {
      cont.disabled = !select.value;
    });
    cont.addEventListener('click', () => {
      const id = select.value;
      if (!id) return;
      const pataka = (window.cupboards || []).find(p => String(p.id) === String(id));
      if (pataka) {
        window.selectedPataka = pataka;
        proceedToDonatePhoto();
      }
    });
    select.__bound = true;
  }
})();
// Donate: Back to QR in Step 1b
(function wireDonateBackToQR(){
  // We’ll try a few common button IDs; we bind the first one found.
  const candidates = [
    'donateBackToQRBtn',
    'donateBackToScanBtn',
    'donateBackToQRScanBtn',
    'backToDonateQRBtn'
  ];
  let btn = null;
  for (const id of candidates) {
    btn = document.getElementById(id);
    if (btn) break;
  }
  if (!btn) {
    // Fallback: find a button in the manual section whose text includes “Back to QR”
    const wrap = document.getElementById('donateSection1b');
    if (wrap) {
      btn = Array.from(wrap.querySelectorAll('button'))
        .find(b => (b.textContent || '').toLowerCase().includes('back to qr'));
    }
  }
  if (btn && !btn.__bound) {
    btn.addEventListener('click', () => {
      try { if (typeof startQRScanner === 'function') startQRScanner('donate-qr-scanner', 'donate'); } catch {}
      document.getElementById('donateSection1b')?.classList.remove('active');
      document.getElementById('donateSection1')?.classList.add('active');
      document.getElementById('donateStep2')?.classList.remove('active');
      document.getElementById('donateStep1')?.classList.add('active');
    });
    btn.__bound = true;
  }
})();

// --- Donate: Step 2 (photo) navigation (Back/Next) ---
(function wireDonateStep2Nav() {
  const backBtn = document.getElementById('donatePhotoBackBtn');
  if (backBtn && !backBtn.__bound) {
    backBtn.addEventListener('click', () => {
      // back to Step 1 (scan/manual)
      document.getElementById('donateSection2')?.classList.remove('active');
      document.getElementById('donateSection1')?.classList.add('active');
      document.getElementById('donateStep2')?.classList.remove('active');
      document.getElementById('donateStep1')?.classList.add('active');
      try { startQRScanner('donate-qr-scanner', 'donate'); } catch {}
    });
    backBtn.__bound = true;
  }

  // Note: photo buttons & #donatePhotoNextBtn already wired by setupDonateEventListeners()
})();

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
  try {
    // Ensure data exists before filling the dropdown
    if (!Array.isArray(window.cupboards) || window.cupboards.length === 0) {
      if (typeof fetchCupboards === 'function') {
        await fetchCupboards(); // loads into global `cupboards`
      }
    }

    const list = Array.isArray(window.cupboards) ? window.cupboards : [];
    const select = document.getElementById(selectId);
    if (!select) return;

    // Fill options
    select.innerHTML = '<option value="">Choose a pataka...</option>';
    for (const p of list) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} - ${p.suburb || p.area || ''}`.trim();
      select.appendChild(opt);
    }
  } catch (e) {
    console.warn('[populatePatakaDropdown] failed:', e);
  }
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

    // 'Unable to scan' -> switch to manual select
    const unableBtn = document.getElementById('donateUnableToScanBtn');
    if (unableBtn && unableBtn._donateBound !== true) {
      unableBtn.addEventListener('click', async () => {
        try {
          if (typeof stopQRScanner === 'function') stopQRScanner();
          document.getElementById('donateSection1').classList.remove('active');
          document.getElementById('donateSection1b').classList.add('active');
          if (typeof populatePatakaDropdown === 'function') {
            await populatePatakaDropdown('donatePatakaSelect');
          }
          document.getElementById('donateStep1').classList.remove('active');
          document.getElementById('donateStep1').classList.add('completed');
          document.getElementById('donateStep2').classList.add('active');
        } catch(e) { console.warn('[donate] unable-to-scan handler failed', e); }
      });
      unableBtn._donateBound = true;
    }

    const root = document;
    // v31 IDs
    const takeBtn   = root.querySelector('#donateTakePhotoBtn');
    const takeInput = root.querySelector('#donateTakePhotoInput');
    const fileBtn   = root.querySelector('#donateSelectPhotoBtn');
    const fileInput = root.querySelector('#donateSelectPhotoInput');
    const previewImg = root.querySelector('#donatePhotoPreview');

    const bindClickToInput = (btn, input) => {
      if (btn && input && btn._donateBound !== input) {
        btn.addEventListener('click', () => input.click());
        btn._donateBound = input;
      }
    };

    bindClickToInput(takeBtn, takeInput);
    bindClickToInput(fileBtn, fileInput);

    const onChange = async (inputEl) => {
      const utils = await import('./photo-utils.js');
      const { file, error } = utils.pickFirstFile(inputEl, { maxBytes: 8_000_000, acceptTypes: ['image/jpeg','image/png','image/webp'] });
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
      window.__donatePhotoBlob = blob;
    };

    if (takeInput && takeInput._donateBound !== true) {
      takeInput.addEventListener('change', () => onChange(takeInput));
      takeInput._donateBound = true;
    }
    if (fileInput && fileInput._donateBound !== true) {
      fileInput.addEventListener('change', () => onChange(fileInput));
      fileInput._donateBound = true;
    }

    const submitBtn = root.querySelector('#donatePhotoNextBtn, #donateSubmitBtn');
    if (submitBtn && submitBtn._donateBound !== true) {
      submitBtn.addEventListener('click', async (e) => {
        try {
          e.preventDefault();
          const photoBlob = window.__donatePhotoBlob || null;
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
