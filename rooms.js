// rooms.js - Room Management CRUD Operations

// Check authentication
const currentUser = JSON.parse(localStorage.getItem('hotel_currentUser'));
if (!currentUser) {
    window.location.href = 'index.html';
}

// Display current user name
document.getElementById('currentUserName').textContent = `👤 ${currentUser.name}`;

// Logout function
function handleLogout() {
    localStorage.removeItem('hotel_currentUser');
    window.location.href = 'index.html';
}

// Load all rooms on page load
document.addEventListener('DOMContentLoaded', loadRooms);

// Load and display all rooms
function loadRooms() {
    const rooms = Database.getAll('hotel_rooms');
    const roomsGrid = document.getElementById('roomsGrid');
    const emptyState = document.getElementById('emptyState');

    if (rooms.length === 0) {
        roomsGrid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    roomsGrid.innerHTML = rooms.map(room => createRoomCard(room)).join('');
}

// Create room card HTML
function createRoomCard(room) {
    const statusStyles = getRoomStatusStyles(room.status);
    const roomIcon = getRoomTypeIcon(room.roomType);

    return `
        <div class="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center space-x-3">
                    <span class="text-3xl">${roomIcon}</span>
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">Room ${room.roomNumber}</h3>
                        <p class="text-gray-500 text-sm">${room.roomType}</p>
                    </div>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusStyles}">
                    ${room.status}
                </span>
            </div>
            
            <div class="border-t border-gray-100 pt-4 mb-4">
                <div class="flex justify-between items-center">
                    <span class="text-gray-600 text-sm">Price per night</span>
                    <span class="text-2xl font-bold text-hotel-primary">$${parseFloat(room.price).toFixed(2)}</span>
                </div>
            </div>

            <div class="flex space-x-2">
                <button onclick="openEditRoomModal('${room.id}')" 
                        class="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-200 text-sm font-semibold">
                    ✏️ Edit
                </button>
                <button onclick="openDeleteRoomModal('${room.id}')" 
                        class="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition duration-200 text-sm font-semibold">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `;
}

// Get room type icon
function getRoomTypeIcon(roomType) {
    const icons = {
        'Single': '🛏️',
        'Double': '🛏️',
        'Suite': '🛋️',
        'Deluxe': '👑',
        'Penthouse': '🏰'
    };
    return icons[roomType] || '🚪';
}

// Get room status styles
function getRoomStatusStyles(status) {
    switch(status) {
        case 'Available':
            return 'bg-green-100 text-green-700';
        case 'Booked':
            return 'bg-red-100 text-red-700';
        case 'Maintenance':
            return 'bg-yellow-100 text-yellow-700';
        default:
            return 'bg-gray-100 text-gray-700';
    }
}

// Open Add Room Modal
function openAddRoomModal() {
    document.getElementById('modalTitle').textContent = 'Add New Room';
    document.getElementById('roomId').value = '';
    document.getElementById('roomForm').reset();
    document.getElementById('roomModal').classList.remove('hidden');
    document.getElementById('roomModal').classList.add('flex');
}

// Open Edit Room Modal
function openEditRoomModal(roomId) {
    const room = Database.getById('hotel_rooms', roomId);
    if (!room) return;

    document.getElementById('modalTitle').textContent = 'Edit Room';
    document.getElementById('roomId').value = room.id;
    document.getElementById('roomNumber').value = room.roomNumber;
    document.getElementById('roomType').value = room.roomType;
    document.getElementById('roomPrice').value = room.price;
    document.getElementById('roomStatus').value = room.status;
    
    document.getElementById('roomModal').classList.remove('hidden');
    document.getElementById('roomModal').classList.add('flex');
}

// Close Room Modal
function closeRoomModal() {
    document.getElementById('roomModal').classList.add('hidden');
    document.getElementById('roomModal').classList.remove('flex');
    document.getElementById('roomForm').reset();
}

// Handle Save Room (Add or Edit)
function handleSaveRoom(event) {
    event.preventDefault();

    const roomId = document.getElementById('roomId').value;
    const roomNumber = document.getElementById('roomNumber').value.trim();
    const roomType = document.getElementById('roomType').value;
    const roomPrice = document.getElementById('roomPrice').value;
    const roomStatus = document.getElementById('roomStatus').value;

    // Validate all required fields
    if (!roomNumber || !roomType || !roomPrice || !roomStatus) {
        alert('Please fill in all required fields.');
        return false;
    }

    // Validate price is positive
    if (parseFloat(roomPrice) <= 0) {
        alert('Price must be greater than 0.');
        return false;
    }

    // Check for duplicate room number (exclude current room when editing)
    const existingRooms = Database.getAll('hotel_rooms');
    const duplicateRoom = existingRooms.find(room => 
        room.roomNumber.toLowerCase() === roomNumber.toLowerCase() && room.id !== roomId
    );

    if (duplicateRoom) {
        alert('A room with this number already exists.');
        return false;
    }

    const roomData = {
        roomNumber: roomNumber,
        roomType: roomType,
        price: parseFloat(roomPrice),
        status: roomStatus
    };

    if (roomId) {
        // Update existing room
        Database.update('hotel_rooms', roomId, roomData);
    } else {
        // Add new room
        Database.add('hotel_rooms', roomData);
    }

    closeRoomModal();
    loadRooms();
    return false;
}

// Open Delete Confirmation Modal
function openDeleteRoomModal(roomId) {
    document.getElementById('deleteRoomId').value = roomId;
    document.getElementById('deleteModal').classList.remove('hidden');
    document.getElementById('deleteModal').classList.add('flex');
}

// Close Delete Modal
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    document.getElementById('deleteModal').classList.remove('flex');
    document.getElementById('deleteRoomId').value = '';
}

// Confirm Delete Room
function confirmDeleteRoom() {
    const roomId = document.getElementById('deleteRoomId').value;
    
    if (roomId) {
        Database.delete('hotel_rooms', roomId);
        loadRooms();
    }
    
    closeDeleteModal();
}

// Close modals when clicking outside
document.getElementById('roomModal').addEventListener('click', function(event) {
    if (event.target === this) {
        closeRoomModal();
    }
});

document.getElementById('deleteModal').addEventListener('click', function(event) {
    if (event.target === this) {
        closeDeleteModal();
    }
});