// Flow reset functions
function resetTakeFlow() {
    document.querySelectorAll('#takeView .action-section').forEach(section => section.classList.remove('active'));
    document.getElementById('takeSection1').classList.add('active');
    
    document.querySelectorAll('#takeView .step').forEach(step => step.classList.remove('active', 'completed'));
    document.getElementById('takeStep1').classList.add('active');
    
    selectedPataka = null;
    actionData = {};
}

// Navigation functions
function proceedToTakePhoto() {
    document.getElementById('takeSelectedPatakaName').textContent = selectedPataka.name;
    
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

function setupTakeEventListeners() {
    document.getElementById('takeUnableToScanBtn').addEventListener('click', async () => {
        await stopQRScanner();
        await populatePatakaDropdown('takePatakaSelect');
        document.getElementById('takeSection1').classList.remove('active');
        document.getElementById('takeSection1b').classList.add('active');
    });

    document.getElementById('cancelTakeBtn').addEventListener('click', async () => {
        await stopQRScanner();
        setActiveTab('find');
        switchToMap();
    });

    document.getElementById('backToTakeQRBtn').addEventListener('click', () => {
        document.getElementById('takeSection1b').classList.remove('active');
        document.getElementById('takeSection1').classList.add('active');
        startQRScanner('take-qr-scanner', 'take');
    });

    document.getElementById('takePatakaSelect').addEventListener('change', (e) => {
        const cupboardId = parseInt(e.target.value);
        const confirmBtn = document.getElementById('confirmTakePatakaBtn');
        
        if (cupboardId) {
            selectedPataka = cupboards.find(p => p.id === cupboardId);
            confirmBtn.disabled = false;
        } else {
            selectedPataka = null;
            confirmBtn.disabled = true;
        }
    });

    document.getElementById('confirmTakePatakaBtn').addEventListener('click', () => {
        proceedToTakePhoto();
    });

    document.getElementById('takePhotoNextBtn').addEventListener('click', () => {
        document.getElementById('takeSection2').classList.remove('active');
        document.getElementById('takeSection3').classList.add('active');
        document.getElementById('takeStep2').classList.remove('active');
        document.getElementById('takeStep2').classList.add('completed');
        document.getElementById('takeStep3').classList.add('active');
    });

    document.getElementById('takePhotoBackBtn').addEventListener('click', () => {
        document.getElementById('takeSection2').classList.remove('active');
        document.getElementById('takeSection1').classList.add('active');
        
        document.getElementById('takeStep2').classList.remove('active');
        document.getElementById('takeStep1').classList.add('active');
        document.getElementById('takeStep1').classList.remove('completed');
        
        startQRScanner('take-qr-scanner', 'take');
    });

    document.getElementById('takeCommentBackBtn').addEventListener('click', () => {
        document.getElementById('takeSection3').classList.remove('active');
        document.getElementById('takeSection2').classList.add('active');
        
        document.getElementById('takeStep3').classList.remove('active');
        document.getElementById('takeStep2').classList.add('active');
        document.getElementById('takeStep2').classList.remove('completed');
    });

    document.getElementById('takeSubmitBtn').addEventListener('click', () => {
        console.log('Taking submitted');
        showTakeSuccess();
    });

    document.getElementById('takeBackToMapBtn').addEventListener('click', () => {
        setActiveTab('find');
        switchToMap();
    });
}

/** Option B encapsulation for Take flow **/
(function(){
  // Expose on window for app-core.js
  window.setupTakeEventListeners = function setupTakeEventListeners() {
    const root = document;
    // v31 IDs
    const takeBtn   = root.querySelector('#takeTakePhotoBtn');
    const takeInput = root.querySelector('#takeTakePhotoInput');
    const fileBtn   = root.querySelector('#takeSelectPhotoBtn');
    const fileInput = root.querySelector('#takeSelectPhotoInput');
    const previewImg = root.querySelector('#takePhotoPreview');

    const bindClickToInput = (btn, input) => {
      if (btn && input && btn._takeBound !== input) {
        btn.addEventListener('click', () => input.click());
        btn._takeBound = input;
      }
    };

    bindClickToInput(takeBtn, takeInput);
    bindClickToInput(fileBtn, fileInput);

    const onChange = async (inputEl) => {
      const utils = await import('./photo-utils.js');
      const { file, error } = utils.pickFirstFile(inputEl, { maxBytes: 8_000_000, acceptTypes: ['image/jpeg','image/png','image/webp'] });
      if (error) {
        console.warn('[take] ' + error);
        return;
      }
      const dataURL = await utils.fileToDataURL(file);
      const blob = await utils.resizeDataURL(dataURL, { maxW: 1600, maxH: 1600, quality: 0.85, type: 'image/jpeg' });
      const previewURL = await utils.blobToDataURL(blob);
      if (previewImg) {
        previewImg.src = previewURL;
        previewImg.dataset.hasImage = "1";
      }
      window.__takePhotoBlob = blob;
    };

    if (takeInput && takeInput._takeBound !== true) {
      takeInput.addEventListener('change', () => onChange(takeInput));
      takeInput._takeBound = true;
    }
    if (fileInput && fileInput._takeBound !== true) {
      fileInput.addEventListener('change', () => onChange(fileInput));
      fileInput._takeBound = true;
    }

    const submitBtn = root.querySelector('#takePhotoNextBtn, #takeSubmitBtn');
    if (submitBtn && submitBtn._takeBound !== true) {
      submitBtn.addEventListener('click', async (e) => {
        try {
          e.preventDefault();
          const photoBlob = window.__takePhotoBlob || null;
          if (typeof window.proceedToTakePhoto === 'function') {
            await window.proceedToTakePhoto(photoBlob);
          } else {
            console.warn('[take] proceedToTakePhoto not found; skipped.');
          }
        } catch (err) {
          console.error('[take] submit failed', err);
        }
      });
      submitBtn._takeBound = true;
    }
  };
})();

// --- Take: Step 1 (scan) & manual select wiring ---
(function wireTakeStep1() {
  const scanSection = document.getElementById('takeSection1');
  const manualSection = document.getElementById('takeSection1b'); // if present

  const unableBtn = document.getElementById('takeUnableToScanBtn');
  if (unableBtn && !unableBtn.__bound) {
    unableBtn.addEventListener('click', async () => {
      try {
        if (typeof stopQRScanner === 'function') stopQRScanner();
        scanSection?.classList.remove('active');
        manualSection?.classList.add('active');

        if (typeof populatePatakaDropdown === 'function') {
          await populatePatakaDropdown('takePatakaSelect');
        }

        document.getElementById('takeStep1')?.classList.remove('active');
        document.getElementById('takeStep1')?.classList.add('completed');
        document.getElementById('takeStep2')?.classList.add('active');
      } catch (e) { console.warn('[take] unable-to-scan failed', e); }
    });
    unableBtn.__bound = true;
  }

  const cancelBtn = document.getElementById('cancelTakeBtn');
  if (cancelBtn && !cancelBtn.__bound) {
    cancelBtn.addEventListener('click', () => {
      try { if (typeof stopQRScanner === 'function') stopQRScanner(); } catch {}
      if (typeof switchToMap === 'function') switchToMap();
    });
    cancelBtn.__bound = true;
  }

  const select = document.getElementById('takePatakaSelect');
  const cont   = document.getElementById('takePatakaContinueBtn');
  if (select && cont && !select.__bound) {
    select.addEventListener('change', () => { cont.disabled = !select.value; });
    cont.addEventListener('click', () => {
      const id = select.value;
      if (!id) return;
      const pataka = (window.cupboards || []).find(p => String(p.id) === String(id));
      if (pataka) {
        window.selectedPataka = pataka;
        proceedToTakePhoto();
      }
    });
    select.__bound = true;
  }
})();

// --- Take: Step 2 navigation (Back/Next) ---
(function wireTakeStep2Nav() {
  const backBtn = document.getElementById('takePhotoBackBtn') || document.getElementById('takeBackBtn');
  if (backBtn && !backBtn.__bound) {
    backBtn.addEventListener('click', () => {
      document.getElementById('takeSection2')?.classList.remove('active');
      document.getElementById('takeSection1')?.classList.add('active');
      document.getElementById('takeStep2')?.classList.remove('active');
      document.getElementById('takeStep1')?.classList.add('active');
      try { startQRScanner('take-qr-scanner', 'take'); } catch {}
    });
    backBtn.__bound = true;
  }

  // Note: photo buttons & #takePhotoNextBtn already wired by setupTakeEventListeners()
})();
