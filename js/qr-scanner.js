// QR Scanner functions
async function startQRScanner(videoElementId, action) {
    try {
        if (qrScanner) await qrScanner.stop();
        
        const videoElement = document.getElementById(videoElementId);
        qrScanner = new QrScanner(
            videoElement,
            result => handleQRScanResult(result, action),
            { preferredCamera: 'environment', highlightScanRegion: false, highlightCodeOutline: false }
        );
        
        await qrScanner.start();
        console.log(`QR scanner started for ${action}`);
    } catch (error) {
        console.error('Error starting QR scanner:', error);
        showCustomModal('Camera Error', 'Unable to access camera. Please use "Unable to scan" option.');
    }
}

async function stopQRScanner() {
    if (qrScanner) {
        await qrScanner.stop();
        qrScanner = null;
    }
}

function handleQRScanResult(result, action) {
    console.log('QR Code scanned:', result.data, 'for action:', action);
    
    const qrText = result.data.trim();
    const patakaMatch = qrText.match(/^Pataka\s+(\d+)$/i);
    
    if (patakaMatch) {
        const cupboardId = parseInt(patakaMatch[1]);
        const pataka = cupboards.find(p => p.id === cupboardId);
        
        if (pataka) {
            selectedPataka = pataka;
            stopQRScanner();
            
            if (action === 'donate') proceedToDonatePhoto();
            else if (action === 'take') proceedToTakePhoto();
            else if (action === 'report') proceedToReportDetails();
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