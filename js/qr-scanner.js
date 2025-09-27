/* ========================================
   QR SCANNER MODULE
   ======================================== */

let qrScanner = null;

/* ========================================
   QR SCANNER FUNCTIONS
   ======================================== */

async function startQRScanner(videoElementId, action) {
    try {
        // Stop any existing scanner
        if (qrScanner) await qrScanner.stop();
        
        const videoElement = document.getElementById(videoElementId);
        if (!videoElement) {
            throw new Error(`Video element ${videoElementId} not found`);
        }
        
        qrScanner = new QrScanner(
            videoElement,
            result => handleQRScanResult(result, action),
            { 
                preferredCamera: 'environment', 
                highlightScanRegion: false, 
                highlightCodeOutline: false 
            }
        );
        
        await qrScanner.start();
        console.log(`✅ QR scanner started for ${action}`);
        
    } catch (error) {
        console.error('❌ Error starting QR scanner:', error);
        showCustomModal('Camera Error', 'Unable to access camera. Please use "Unable to scan" option.');
    }
}

async function stopQRScanner() {
    if (qrScanner) {
        try {
            await qrScanner.stop();
            qrScanner = null;
            console.log('✅ QR scanner stopped');
        } catch (error) {
            console.error('❌ Error stopping QR scanner:', error);
        }
    }
}

function handleQRScanResult(result, action) {
    console.log('📱 QR Code scanned:', result.data, 'for action:', action);
    
    const qrText = result.data.trim();
    const patakaMatch = qrText.match(/^Pataka\s+(\d+)$/i);
    
    if (patakaMatch) {
        const cupboardId = parseInt(patakaMatch[1]);
        const pataka = cupboards.find(p => p.id === cupboardId);
        
        if (pataka) {
            selectedPataka = pataka;
            stopQRScanner();
            
            // Route to appropriate workflow
            switch(action) {
                case 'donate':
                    proceedToDonatePhoto();
                    break;
                case 'take':
                    proceedToTakePhoto();
                    break;
                case 'report':
                    proceedToReportDetails();
                    break;
                default:
                    console.error('Unknown action:', action);
            }
        } else {
            showCustomModal('Invalid QR Code', `Pātaka ${cupboardId} not found. Please try again or use manual selection.`);
        }
    } else {
        showCustomModal('QR Code Error', 'QR code format not recognized. Please scan a valid Pātaka QR code or use manual selection.');
    }
}

/* ========================================
   WORKFLOW NAVIGATION FUNCTIONS
   ======================================== */

function proceedToDonatePhoto() {
    if (!selectedPataka) {
        console.error('No pātaka selected');
        return;
    }
    
    // Update UI with selected pātaka name
    const nameElement = document.getElementById('donateSelectedPatakaName');
    if (nameElement) {
        nameElement.textContent = selectedPataka.name;
    }
    
    // Navigate to photo step
    document.getElementById('donateSection1').classList.remove('active');
    document.getElementById('donateSection1b')?.classList.remove('active');
    document.getElementById('donateSection2')?.classList.add('active');
    
    // Update step indicators
    document.getElementById('donateStep1').classList.remove('active');
    document.getElementById('donateStep1').classList.add('completed');
    document.getElementById('donateStep2')?.classList.add('active');
    
    console.log('✅ Proceeding to donate photo step for:', selectedPataka.name);
}

function proceedToTakePhoto() {
    if (!selectedPataka) {
        console.error('No pātaka selected');
        return;
    }
    
    // Update UI with selected pātaka name
    const nameElement = document.getElementById('takeSelectedPatakaName');
    if (nameElement) {
        nameElement.textContent = selectedPataka.name;
    }
    
    // Navigate to photo step
    document.getElementById('takeSection1').classList.remove('active');
    document.getElementById('takeSection1b')?.classList.remove('active');
    document.getElementById('takeSection2')?.classList.add('active');
    
    // Update step indicators
    document.getElementById('takeStep1').classList.remove('active');
    document.getElementById('takeStep1').classList.add('completed');
    document.getElementById('takeStep2')?.classList.add('active');
    
    console.log('✅ Proceeding to take photo step for:', selectedPataka.name);
}

function proceedToReportDetails() {
    if (!selectedPataka) {
        console.error('No pātaka selected');
        return;
    }
    
    // Update UI with selected pātaka name
    const nameElement = document.getElementById('selectedPatakaName');
    if (nameElement) {
        nameElement.textContent = selectedPataka.name;
    }
    
    // Navigate to details step
    document.getElementById('reportSection1').classList.remove('active');
    document.getElementById('reportSection1b')?.classList.remove('active');
    document.getElementById('reportSection2')?.classList.add('active');
    
    // Update step indicators
    document.getElementById('step1').classList.remove('active');
    document.getElementById('step1').classList.add('completed');
    document.getElementById('step2')?.classList.add('active');
    
    console.log('✅ Proceeding to report details step for:', selectedPataka.name);
}

/* ========================================
   MANUAL SELECTION HANDLERS
   ======================================== */

async function handleManualPatakaSelection(selectId, action) {
    const select = document.getElementById(selectId);
    if (!select || !select.value) {
        showCustomModal('Selection Required', 'Please select a pātaka from the dropdown');
        return;
    }
    
    const cupboardId = parseInt(select.value);
    const pataka = cupboards.find(p => p.id === cupboardId);
    
    if (pataka) {
        selectedPataka = pataka;
        
        // Route to appropriate workflow
        switch(action) {
            case 'donate':
                proceedToDonatePhoto();
                break;
            case 'take':
                proceedToTakePhoto();
                break;
            case 'report':
                proceedToReportDetails();
                break;
            default:
                console.error('Unknown action:', action);
        }
    } else {
        showCustomModal('Error', 'Selected pātaka not found');
    }
}

/* ========================================
   CAMERA PERMISSIONS CHECK
   ======================================== */

async function checkCameraPermissions() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        console.warn('Camera permissions not granted:', error);
        return false;
    }
}

/* ========================================
   QR SCANNER INITIALIZATION
   ======================================== */

function initializeQRScanners() {
    // Check if QrScanner is available
    if (typeof QrScanner === 'undefined') {
        console.warn('QrScanner library not loaded');
        return;
    }
    
    // Set QR scanner worker path
    QrScanner.WORKER_PATH = 'https://cdnjs.cloudflare.com/ajax/libs/qr-scanner/1.4.2/qr-scanner-worker.min.js';
    
    console.log('✅ QR Scanner initialized');
}
