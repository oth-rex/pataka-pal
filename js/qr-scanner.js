// Import from config.js
import { state } from './config.js';

// Import from app-core.js
import { showCustomModal } from './app-core.js';

// QR Scanner functions
async function startQRScanner(videoElementId, action) {
    try {
        if (state.qrScanner) await state.qrScanner.stop();
        
        const videoElement = document.getElementById(videoElementId);
        state.qrScanner = new QrScanner(
            videoElement,
            result => handleQRScanResult(result, action),
            { preferredCamera: 'environment', highlightScanRegion: false, highlightCodeOutline: false }
        );
        
        await state.qrScanner.start();
        console.log(`QR scanner started for ${action}`);
    } catch (error) {
        console.error('Error starting QR scanner:', error);
        showCustomModal('Camera Error', 'Unable to access camera. Please use "Unable to scan" option.');
    }
}

async function stopQRScanner() {
    if (state.qrScanner) {
        await state.qrScanner.stop();
        state.qrScanner = null;
    }
}

function handleQRScanResult(result, action) {
    console.log('QR Code scanned:', result.data, 'for action:', action);
    
    const qrText = result.data.trim();
    const patakaMatch = qrText.match(/^Pataka\s+(\d+)$/i);
    
    if (patakaMatch) {
        const cupboardId = parseInt(patakaMatch[1]);
        const pataka = state.cupboards.find(p => p.id === cupboardId);
        
        if (pataka) {
            state.selectedPataka = pataka;
            stopQRScanner();
            
            // Call appropriate navigation function based on action
            // These functions are defined in workflow files
            if (action === 'donate' && typeof window.proceedToDonatePhoto === 'function') {
                window.proceedToDonatePhoto();
            } else if (action === 'take' && typeof window.proceedToTakePhoto === 'function') {
                window.proceedToTakePhoto();
            } else if (action === 'report' && typeof window.proceedToReportDetails === 'function') {
                window.proceedToReportDetails();
            }
        } else {
            showCustomModal('Invalid QR Code', `Pataka ${cupboardId} not found. Please try again or use manual selection.`);
        }
    } else {
        showCustomModal('QR Code Error', 'QR code format not recognized. Please scan a valid Pataka QR code or use manual selection.');
    }
}

// Export for ES6 modules
export {
    startQRScanner,
    stopQRScanner,
    handleQRScanResult
};