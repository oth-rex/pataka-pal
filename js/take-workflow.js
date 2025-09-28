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
