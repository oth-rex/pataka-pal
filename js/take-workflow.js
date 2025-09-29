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
    const root = document.querySelector('#takeView') || document;
    const takeBtn = root.querySelector('#takeTakePhotoBtn, [data-action="take-take-photo"]');
    const fileBtn = root.querySelector('#takeSelectPhotoBtn, [data-action="take-select-photo"]');
    const fileInput = root.querySelector('#takePhotoInput, input[data-role="take-photo-input"]');
    const previewImg = root.querySelector('#takeImagePreview, img[data-role="take-image-preview"]');

    if (!fileInput) {
      console.warn('[take] photo input not found');
    }

    if (takeBtn && takeBtn._takeBound !== true) {
      takeBtn.addEventListener('click', () => {
        if (fileInput) fileInput.click();
      });
      takeBtn._takeBound = true;
    }

    if (fileBtn && fileBtn._takeBound !== true) {
      fileBtn.addEventListener('click', () => {
        if (fileInput) fileInput.click();
      });
      fileBtn._takeBound = true;
    }

    if (fileInput && fileInput._takeBound !== true) {
      fileInput.addEventListener('change', async () => {
        try {
          const utils = await import('./photo-utils.js');
          const { file, error } = utils.pickFirstFile(fileInput, { maxBytes: 8_000_000, acceptTypes: ['image/jpeg','image/png','image/webp'] });
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
        } catch (e) {
          console.error('[take] file handling failed', e);
        }
      });
      fileInput._takeBound = true;
    }

    const submitBtn = root.querySelector('#takeSubmitBtn, [data-action="take-submit"]');
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
