// controls.js - Smart Room Controls

// Check authentication
const currentUser = JSON.parse(localStorage.getItem('hotel_currentUser'));
if (!currentUser) {
    window.location.href = 'index.html';
}

// Display current user name
document.getElementById('currentUserName').textContent = `👤 ${currentUser.name}`;

// Current room control state
let currentRoomId = null;
let roomControls = {
    lights: false,
    lightsIntensity: 0,
    ac: false,
    temperature: 22,
    doorLocked: true
};

// Logout function
function handleLogout() {
    localStorage.removeItem('hotel_currentUser');
    window.location.href = 'index.html';
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    populateBookedRoomsDropdown();
    initializeControlsFromStorage();
});

// Populate booked rooms dropdown
function populateBookedRoomsDropdown() {
    const rooms = Database.getAll('hotel_rooms');
    const bookings = Database.getAll('hotel_bookings');
    const customers = Database.getAll('hotel_customers');
    const roomSelect = document.getElementById('controlRoomSelect');
    
    // Get only booked rooms with active bookings
    const bookedRooms = rooms.filter(room => room.status === 'Booked');
    
    if (bookedRooms.length === 0) {
        roomSelect.innerHTML = '<option value="">No booked rooms available</option>';
        return;
    }
    
    roomSelect.innerHTML = '<option value="">Choose a booked room</option>' +
        bookedRooms.map(room => {
            // Find active booking for this room
            const activeBooking = bookings.find(booking => 
                booking.roomId === room.id && booking.status === 'Active'
            );
            
            let guestName = 'No active guest';
            if (activeBooking) {
                const customer = customers.find(c => c.id === activeBooking.customerId);
                guestName = customer ? customer.name : 'Unknown guest';
            }
            
            return `<option value="${room.id}">Room ${room.roomNumber} - ${guestName}</option>`;
        }).join('');
}

// Initialize controls from localStorage
function initializeControlsFromStorage() {
    const savedControls = Database.getAll('hotel_room_controls');
    // Controls are loaded when a room is selected
}

// Handle room selection
function onControlRoomSelect() {
    const roomId = document.getElementById('controlRoomSelect').value;
    const controlRoomInfo = document.getElementById('controlRoomInfo');
    
    if (!roomId) {
        controlRoomInfo.classList.add('hidden');
        disableAllControls();
        clearOverview();
        currentRoomId = null;
        return;
    }
    
    currentRoomId = roomId;
    
    // Get room details
    const room = Database.getById('hotel_rooms', roomId);
    if (!room) return;
    
    // Get active booking for this room
    const bookings = Database.getAll('hotel_bookings');
    const customers = Database.getAll('hotel_customers');
    const activeBooking = bookings.find(booking => 
        booking.roomId === roomId && booking.status === 'Active'
    );
    
    let guestName = 'No guest assigned';
    let checkOutDate = 'N/A';
    
    if (activeBooking) {
        const customer = customers.find(c => c.id === activeBooking.customerId);
        guestName = customer ? customer.name : 'Unknown';
        checkOutDate = formatDate(activeBooking.checkOutDate);
    }
    
    // Update room info
    document.getElementById('controlRoomNumber').textContent = `Room ${room.roomNumber}`;
    document.getElementById('controlRoomType').textContent = room.roomType;
    document.getElementById('controlRoomGuest').textContent = guestName;
    document.getElementById('controlRoomStatus').innerHTML = '<span class="text-green-600">Occupied</span>';
    document.getElementById('controlRoomCheckOut').textContent = checkOutDate;
    
    controlRoomInfo.classList.remove('hidden');
    
    // Load room controls
    loadRoomControls(roomId);
}

// Load room controls from localStorage
function loadRoomControls(roomId) {
    const allControls = Database.getAll('hotel_room_controls');
    const existingControls = allControls.find(control => control.roomId === roomId);
    
    if (existingControls) {
        roomControls = { ...existingControls.controls };
    } else {
        // Default controls
        roomControls = {
            lights: false,
            lightsIntensity: 0,
            ac: false,
            temperature: 22,
            doorLocked: true
        };
    }
    
    updateAllControlUI();
    enableAllControls();
}

// Save room controls to localStorage
function saveRoomControls() {
    if (!currentRoomId) return;
    
    const allControls = Database.getAll('hotel_room_controls');
    const existingIndex = allControls.findIndex(control => control.roomId === currentRoomId);
    
    const controlData = {
        roomId: currentRoomId,
        controls: { ...roomControls },
        lastUpdated: new Date().toISOString()
    };
    
    if (existingIndex !== -1) {
        // Update existing
        allControls[existingIndex] = controlData;
        localStorage.setItem('hotel_room_controls', JSON.stringify(allControls));
    } else {
        // Add new
        Database.add('hotel_room_controls', controlData);
    }
    
    updateOverview();
}

// Toggle Lights
function toggleLights(turnOn) {
    roomControls.lights = turnOn;
    if (turnOn && roomControls.lightsIntensity === 0) {
        roomControls.lightsIntensity = 50; // Default to 50% when turned on
    } else if (!turnOn) {
        roomControls.lightsIntensity = 0;
    }
    
    updateAllControlUI();
    saveRoomControls();
}

// Update lights intensity
function updateLightsIntensity(value) {
    roomControls.lightsIntensity = parseInt(value);
    
    if (roomControls.lightsIntensity > 0) {
        roomControls.lights = true;
    } else {
        roomControls.lights = false;
    }
    
    updateAllControlUI();
    saveRoomControls();
}

// Toggle Air Conditioning
function toggleAC(turnOn) {
    roomControls.ac = turnOn;
    updateAllControlUI();
    saveRoomControls();
}

// Adjust temperature
function adjustTemperature(change) {
    let newTemp = roomControls.temperature + change;
    
    // Limit temperature range between 16°C and 30°C
    if (newTemp < 16) newTemp = 16;
    if (newTemp > 30) newTemp = 30;
    
    roomControls.temperature = newTemp;
    updateAllControlUI();
    saveRoomControls();
}

// Toggle Door Lock
function toggleDoorLock(lock) {
    roomControls.doorLocked = lock;
    updateAllControlUI();
    saveRoomControls();
}

// Update all control UI elements
function updateAllControlUI() {
    updateLightsUI();
    updateACUI();
    updateDoorUI();
    updateOverview();
}

// Update Lights UI
function updateLightsUI() {
    const lightsOnBtn = document.getElementById('lightsOnBtn');
    const lightsOffBtn = document.getElementById('lightsOffBtn');
    const lightsStatusText = document.getElementById('lightsStatusText');
    const lightsIntensity = document.getElementById('lightsIntensity');
    const lightsIntensityValue = document.getElementById('lightsIntensityValue');
    
    lightsIntensity.value = roomControls.lightsIntensity;
    lightsIntensityValue.textContent = roomControls.lightsIntensity + '%';
    
    if (roomControls.lights) {
        lightsStatusText.textContent = `Status: ON (${roomControls.lightsIntensity}%)`;
        lightsStatusText.className = 'text-yellow-600 text-sm font-semibold';
        lightsOnBtn.className = 'px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold ring-2 ring-yellow-300';
        lightsOffBtn.className = 'px-4 py-2 bg-gray-300 text-gray-600 rounded-lg hover:bg-gray-400 transition duration-200 font-semibold';
    } else {
        lightsStatusText.textContent = 'Status: OFF';
        lightsStatusText.className = 'text-gray-600 text-sm';
        lightsOnBtn.className = 'px-4 py-2 bg-gray-300 text-gray-600 rounded-lg hover:bg-gray-400 transition duration-200 font-semibold';
        lightsOffBtn.className = 'px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold ring-2 ring-gray-300';
    }
}

// Update AC UI
function updateACUI() {
    const acOnBtn = document.getElementById('acOnBtn');
    const acOffBtn = document.getElementById('acOffBtn');
    const acStatusText = document.getElementById('acStatusText');
    const temperatureDisplay = document.getElementById('temperatureDisplay');
    
    temperatureDisplay.textContent = roomControls.temperature + '°C';
    
    if (roomControls.ac) {
        acStatusText.textContent = `Status: Running (${roomControls.temperature}°C)`;
        acStatusText.className = 'text-blue-600 text-sm font-semibold';
        acOnBtn.className = 'px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold ring-2 ring-blue-300';
        acOffBtn.className = 'px-4 py-2 bg-gray-300 text-gray-600 rounded-lg hover:bg-gray-400 transition duration-200 font-semibold';
    } else {
        acStatusText.textContent = 'Status: OFF';
        acStatusText.className = 'text-gray-600 text-sm';
        acOnBtn.className = 'px-4 py-2 bg-gray-300 text-gray-600 rounded-lg hover:bg-gray-400 transition duration-200 font-semibold';
        acOffBtn.className = 'px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold ring-2 ring-gray-300';
    }
}

// Update Door UI
function updateDoorUI() {
    const doorLockBtn = document.getElementById('doorLockBtn');
    const doorUnlockBtn = document.getElementById('doorUnlockBtn');
    const doorStatusText = document.getElementById('doorStatusText');
    const doorIndicatorLight = document.getElementById('doorIndicatorLight');
    const doorIndicatorText = document.getElementById('doorIndicatorText');
    
    if (roomControls.doorLocked) {
        doorStatusText.textContent = 'Status: LOCKED';
        doorStatusText.className = 'text-red-600 text-sm font-semibold';
        doorLockBtn.className = 'px-6 py-3 bg-red-500 text-white rounded-lg font-semibold ring-2 ring-red-300';
        doorUnlockBtn.className = 'px-6 py-3 bg-gray-300 text-gray-600 rounded-lg hover:bg-gray-400 transition duration-200 font-semibold';
        doorIndicatorLight.className = 'w-3 h-3 rounded-full bg-red-500';
        doorIndicatorText.textContent = 'Door is locked';
    } else {
        doorStatusText.textContent = 'Status: UNLOCKED';
        doorStatusText.className = 'text-green-600 text-sm font-semibold';
        doorLockBtn.className = 'px-6 py-3 bg-gray-300 text-gray-600 rounded-lg hover:bg-gray-400 transition duration-200 font-semibold';
        doorUnlockBtn.className = 'px-6 py-3 bg-green-500 text-white rounded-lg font-semibold ring-2 ring-green-300';
        doorIndicatorLight.className = 'w-3 h-3 rounded-full bg-green-500';
        doorIndicatorText.textContent = 'Door is unlocked';
    }
}

// Update overview panel
function updateOverview() {
    const overviewLights = document.getElementById('overviewLights');
    const overviewAC = document.getElementById('overviewAC');
    const overviewDoor = document.getElementById('overviewDoor');
    
    if (!currentRoomId) {
        clearOverview();
        return;
    }
    
    overviewLights.textContent = roomControls.lights ? `ON (${roomControls.lightsIntensity}%)` : 'OFF';
    overviewLights.className = roomControls.lights ? 'font-semibold text-yellow-600' : 'font-semibold text-gray-600';
    
    overviewAC.textContent = roomControls.ac ? `Running (${roomControls.temperature}°C)` : 'OFF';
    overviewAC.className = roomControls.ac ? 'font-semibold text-blue-600' : 'font-semibold text-gray-600';
    
    overviewDoor.textContent = roomControls.doorLocked ? 'LOCKED' : 'UNLOCKED';
    overviewDoor.className = roomControls.doorLocked ? 'font-semibold text-red-600' : 'font-semibold text-green-600';
}

// Clear overview panel
function clearOverview() {
    document.getElementById('overviewLights').textContent = '—';
    document.getElementById('overviewLights').className = 'font-semibold';
    document.getElementById('overviewAC').textContent = '—';
    document.getElementById('overviewAC').className = 'font-semibold';
    document.getElementById('overviewDoor').textContent = '—';
    document.getElementById('overviewDoor').className = 'font-semibold';
}

// Enable all controls
function enableAllControls() {
    document.getElementById('lightsOnBtn').disabled = false;
    document.getElementById('lightsOffBtn').disabled = false;
    document.getElementById('lightsIntensity').disabled = false;
    document.getElementById('acOnBtn').disabled = false;
    document.getElementById('acOffBtn').disabled = false;
    document.getElementById('tempUpBtn').disabled = false;
    document.getElementById('tempDownBtn').disabled = false;
    document.getElementById('doorLockBtn').disabled = false;
    document.getElementById('doorUnlockBtn').disabled = false;
}

// Disable all controls
function disableAllControls() {
    document.getElementById('lightsOnBtn').disabled = true;
    document.getElementById('lightsOffBtn').disabled = true;
    document.getElementById('lightsIntensity').disabled = true;
    document.getElementById('acOnBtn').disabled = true;
    document.getElementById('acOffBtn').disabled = true;
    document.getElementById('tempUpBtn').disabled = true;
    document.getElementById('tempDownBtn').disabled = true;
    document.getElementById('doorLockBtn').disabled = true;
    document.getElementById('doorUnlockBtn').disabled = true;
    
    // Reset UI
    document.getElementById('lightsIntensity').value = 0;
    document.getElementById('lightsIntensityValue').textContent = '0%';
    document.getElementById('temperatureDisplay').textContent = '—';
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}