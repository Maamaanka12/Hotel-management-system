// faceid.js - Face ID Enrollment Simulation

// Check authentication
const currentUser = JSON.parse(localStorage.getItem('hotel_currentUser'));
if (!currentUser) {
    window.location.href = 'index.html';
}

// Display current user name
document.getElementById('currentUserName').textContent = `👤 ${currentUser.name}`;

// Global variables for scan simulation
let scanInterval = null;
let scanProgress = 0;
let selectedCustomerId = null;

// Logout function
function handleLogout() {
    localStorage.removeItem('hotel_currentUser');
    window.location.href = 'index.html';
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    populateCustomerDropdown();
    loadEnrolledCustomers();
});

// Populate customer dropdown
function populateCustomerDropdown() {
    const customers = Database.getAll('hotel_customers');
    const customerSelect = document.getElementById('faceIdCustomerSelect');
    
    customerSelect.innerHTML = '<option value="">Choose a customer</option>' +
        customers.map(customer => {
            const enrolledBadge = customer.faceEnrolled ? ' ✅' : '';
            return `<option value="${customer.id}">${customer.name}${enrolledBadge}</option>`;
        }).join('');
}

// Handle customer selection
function onCustomerSelect() {
    const customerId = document.getElementById('faceIdCustomerSelect').value;
    const customerDetails = document.getElementById('customerDetails');
    const startScanBtn = document.getElementById('startScanBtn');
    
    if (!customerId) {
        customerDetails.classList.add('hidden');
        startScanBtn.disabled = true;
        selectedCustomerId = null;
        resetScanner();
        return;
    }
    
    const customer = Database.getById('hotel_customers', customerId);
    if (!customer) return;
    
    selectedCustomerId = customerId;
    
    // Update customer details
    document.getElementById('customerAvatar').textContent = customer.name.charAt(0).toUpperCase();
    document.getElementById('customerDetailName').textContent = customer.name;
    document.getElementById('customerDetailEmail').textContent = customer.email;
    document.getElementById('customerDetailPhone').textContent = customer.phone;
    document.getElementById('customerDetailId').textContent = customer.nationalId;
    
    const faceStatus = customer.faceEnrolled ? 
        '<span class="text-green-600">✅ Enrolled</span>' : 
        '<span class="text-red-600">❌ Not Enrolled</span>';
    document.getElementById('customerDetailFaceStatus').innerHTML = faceStatus;
    
    customerDetails.classList.remove('hidden');
    
    // Enable/disable scan button based on enrollment status
    if (customer.faceEnrolled) {
        startScanBtn.disabled = true;
        startScanBtn.textContent = '🔍 Already Enrolled';
    } else {
        startScanBtn.disabled = false;
        startScanBtn.textContent = '🔍 Start Face Scan';
    }
    
    resetScanner();
}

// Load enrolled customers list
function loadEnrolledCustomers() {
    const customers = Database.getAll('hotel_customers');
    const enrolledCustomers = customers.filter(customer => customer.faceEnrolled);
    const enrolledList = document.getElementById('enrolledCustomersList');
    
    if (enrolledCustomers.length === 0) {
        enrolledList.innerHTML = '<p class="text-gray-500 text-center py-4">No customers enrolled yet</p>';
        return;
    }
    
    enrolledList.innerHTML = enrolledCustomers.map(customer => `
        <div class="flex items-center justify-between bg-green-50 rounded-lg p-3">
            <div class="flex items-center">
                <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    ${customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p class="font-semibold text-gray-800">${customer.name}</p>
                    <p class="text-xs text-gray-600">${customer.email}</p>
                </div>
            </div>
            <span class="text-green-600 text-sm font-semibold">✅ Enrolled</span>
        </div>
    `).join('');
}

// Start face scanning simulation
function startFaceScan() {
    if (!selectedCustomerId) {
        alert('Please select a customer first.');
        return;
    }
    
    const customer = Database.getById('hotel_customers', selectedCustomerId);
    if (!customer) return;
    
    if (customer.faceEnrolled) {
        alert('This customer is already enrolled in Face ID.');
        return;
    }
    
    // Reset previous state
    resetScanner();
    
    // Show scanning overlay
    const scanningOverlay = document.getElementById('scanningOverlay');
    const cameraFeed = document.getElementById('cameraFeed');
    const startScanBtn = document.getElementById('startScanBtn');
    const resetScanBtn = document.getElementById('resetScanBtn');
    
    scanningOverlay.classList.remove('hidden');
    cameraFeed.style.opacity = '0.5';
    startScanBtn.disabled = true;
    resetScanBtn.disabled = false;
    
    // Update camera feed to show face outline
    document.getElementById('cameraFeed').innerHTML = `
        <div class="text-center">
            <div class="text-8xl mb-4">👤</div>
            <p class="text-gray-400 text-lg">Face Detected</p>
            <p class="text-gray-500 text-sm">Scanning in progress...</p>
        </div>
    `;
    
    // Start progress simulation
    scanProgress = 0;
    updateScanProgress();
    
    scanInterval = setInterval(() => {
        scanProgress += 10;
        updateScanProgress();
        
        if (scanProgress >= 100) {
            completeFaceEnrollment();
        }
    }, 300);
}

// Update scan progress bar
function updateScanProgress() {
    const progressBar = document.getElementById('scanProgressBar');
    const scanPercentage = document.getElementById('scanPercentage');
    const scanningStatus = document.getElementById('scanningStatus');
    
    progressBar.style.width = scanProgress + '%';
    scanPercentage.textContent = scanProgress + '%';
    
    if (scanProgress < 30) {
        scanningStatus.textContent = 'Detecting face...';
    } else if (scanProgress < 60) {
        scanningStatus.textContent = 'Mapping features...';
    } else if (scanProgress < 90) {
        scanningStatus.textContent = 'Creating profile...';
    } else {
        scanningStatus.textContent = 'Finalizing...';
    }
}

// Complete face enrollment
function completeFaceEnrollment() {
    // Stop the interval
    clearInterval(scanInterval);
    scanInterval = null;
    
    // Update customer in database
    Database.update('hotel_customers', selectedCustomerId, { faceEnrolled: true });
    
    // Hide scanning overlay and show success
    document.getElementById('scanningOverlay').classList.add('hidden');
    document.getElementById('successOverlay').classList.remove('hidden');
    
    // Update UI
    setTimeout(() => {
        document.getElementById('successOverlay').classList.add('hidden');
        resetScanner();
        populateCustomerDropdown();
        onCustomerSelect(); // Refresh details
        loadEnrolledCustomers();
        
        // Reset buttons
        document.getElementById('startScanBtn').disabled = true;
        document.getElementById('startScanBtn').textContent = '🔍 Already Enrolled';
        document.getElementById('resetScanBtn').disabled = true;
    }, 2000);
}

// Reset scanner to initial state
function resetScanner() {
    // Stop any ongoing scan
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
    
    scanProgress = 0;
    
    // Hide overlays
    document.getElementById('scanningOverlay').classList.add('hidden');
    document.getElementById('successOverlay').classList.add('hidden');
    
    // Reset camera feed
    document.getElementById('cameraFeed').style.opacity = '1';
    document.getElementById('cameraFeed').innerHTML = `
        <div class="text-center text-gray-400">
            <div class="text-8xl mb-4">📷</div>
            <p class="text-lg">Camera Feed</p>
            <p class="text-sm">Select a customer to begin enrollment</p>
        </div>
    `;
    
    // Reset progress bar
    document.getElementById('scanProgressBar').style.width = '0%';
    document.getElementById('scanPercentage').textContent = '0%';
    document.getElementById('scanningStatus').textContent = 'Scanning...';
    
    // Reset buttons
    const resetScanBtn = document.getElementById('resetScanBtn');
    resetScanBtn.disabled = true;
    
    if (selectedCustomerId) {
        const customer = Database.getById('hotel_customers', selectedCustomerId);
        if (customer && !customer.faceEnrolled) {
            document.getElementById('startScanBtn').disabled = false;
            document.getElementById('startScanBtn').textContent = '🔍 Start Face Scan';
        }
    }
}