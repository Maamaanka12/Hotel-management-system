// bookings.js - Booking Management CRUD Operations with Validations

// Check authentication
const currentUser = JSON.parse(localStorage.getItem('hotel_currentUser'));
if (!currentUser) {
    window.location.href = 'index.html';
}

// Display current user name
document.getElementById('currentUserName').textContent = `👤 ${currentUser.name}`;

// Current active filter
let currentFilter = 'All';

// Logout function
function handleLogout() {
    localStorage.removeItem('hotel_currentUser');
    window.location.href = 'index.html';
}

// Load bookings on page load
document.addEventListener('DOMContentLoaded', () => {
    loadBookings();
    populateCustomerDropdown();
    populateRoomDropdown();
});

// Populate customer dropdown
function populateCustomerDropdown() {
    const customers = Database.getAll('hotel_customers');
    const customerSelect = document.getElementById('bookingCustomer');
    
    customerSelect.innerHTML = '<option value="">Choose a customer</option>' +
        customers.map(customer => 
            `<option value="${customer.id}">${customer.name} (${customer.email})</option>`
        ).join('');
}

// Populate room dropdown
function populateRoomDropdown() {
    const rooms = Database.getAll('hotel_rooms');
    const roomSelect = document.getElementById('bookingRoom');
    
    roomSelect.innerHTML = '<option value="">Choose a room</option>' +
        rooms.map(room => 
            `<option value="${room.id}">Room ${room.roomNumber} - ${room.roomType} (${room.status})</option>`
        ).join('');
}

// Load and display bookings
function loadBookings() {
    const bookings = Database.getAll('hotel_bookings');
    const customers = Database.getAll('hotel_customers');
    const rooms = Database.getAll('hotel_rooms');
    const tableBody = document.getElementById('bookingsTableBody');

    // Apply filter
    let filteredBookings = bookings;
    if (currentFilter !== 'All') {
        filteredBookings = bookings.filter(booking => booking.status === currentFilter);
    }

    // Sort by creation date (newest first)
    filteredBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (filteredBookings.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-gray-500">
                    No ${currentFilter !== 'All' ? currentFilter.toLowerCase() : ''} bookings found.
                </td>
            </tr>`;
        return;
    }

    tableBody.innerHTML = filteredBookings.map(booking => {
        const customer = customers.find(c => c.id === booking.customerId);
        const room = rooms.find(r => r.id === booking.roomId);
        
        const customerName = customer ? customer.name : 'Unknown Customer';
        const roomNumber = room ? room.roomNumber : 'Unknown Room';
        const statusClass = getBookingStatusClass(booking.status);

        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition duration-150">
                <td class="px-6 py-4 text-gray-800 font-semibold">${customerName}</td>
                <td class="px-6 py-4 text-gray-600">Room ${roomNumber}</td>
                <td class="px-6 py-4 text-gray-600">${formatDate(booking.checkInDate)}</td>
                <td class="px-6 py-4 text-gray-600">${formatDate(booking.checkOutDate)}</td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">
                        ${booking.status}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex space-x-2">
                        <button onclick="openEditBookingModal('${booking.id}')" 
                                class="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition duration-200 text-sm">
                            ✏️
                        </button>
                        <button onclick="openDeleteBookingModal('${booking.id}')" 
                                class="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition duration-200 text-sm">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filter bookings by status
function filterBookingsByStatus(status) {
    currentFilter = status;
    
    // Update filter button styles
    const filterButtons = ['All', 'Active', 'Pending', 'Completed', 'Cancelled'];
    filterButtons.forEach(filter => {
        const button = document.getElementById(`filter${filter}`);
        if (filter === status) {
            button.classList.remove('bg-white', 'text-gray-600', 'hover:bg-gray-100');
            button.classList.add('bg-hotel-primary', 'text-white');
        } else {
            button.classList.remove('bg-hotel-primary', 'text-white');
            button.classList.add('bg-white', 'text-gray-600', 'hover:bg-gray-100');
        }
    });
    
    loadBookings();
}

// Get booking status CSS class
function getBookingStatusClass(status) {
    switch(status) {
        case 'Active':
            return 'bg-green-100 text-green-700';
        case 'Completed':
            return 'bg-blue-100 text-blue-700';
        case 'Cancelled':
            return 'bg-red-100 text-red-700';
        case 'Pending':
            return 'bg-yellow-100 text-yellow-700';
        default:
            return 'bg-gray-100 text-gray-700';
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Open Add Booking Modal
function openAddBookingModal() {
    document.getElementById('modalTitle').textContent = 'New Booking';
    document.getElementById('bookingId').value = '';
    document.getElementById('bookingForm').reset();
    populateCustomerDropdown();
    populateRoomDropdown();
    document.getElementById('bookingModal').classList.remove('hidden');
    document.getElementById('bookingModal').classList.add('flex');
}

// Open Edit Booking Modal
function openEditBookingModal(bookingId) {
    const booking = Database.getById('hotel_bookings', bookingId);
    if (!booking) return;

    document.getElementById('modalTitle').textContent = 'Edit Booking';
    document.getElementById('bookingId').value = booking.id;
    
    populateCustomerDropdown();
    populateRoomDropdown();
    
    document.getElementById('bookingCustomer').value = booking.customerId;
    document.getElementById('bookingRoom').value = booking.roomId;
    document.getElementById('bookingCheckIn').value = booking.checkInDate;
    document.getElementById('bookingCheckOut').value = booking.checkOutDate;
    document.getElementById('bookingStatus').value = booking.status;
    
    document.getElementById('bookingModal').classList.remove('hidden');
    document.getElementById('bookingModal').classList.add('flex');
}

// Close Booking Modal
function closeBookingModal() {
    document.getElementById('bookingModal').classList.add('hidden');
    document.getElementById('bookingModal').classList.remove('flex');
    document.getElementById('bookingForm').reset();
}

// Validate booking dates
function validateBookingDates(checkInDate, checkOutDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkIn = new Date(checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    
    const checkOut = new Date(checkOutDate);
    checkOut.setHours(0, 0, 0, 0);

    // Check-in date cannot be in the past
    if (checkIn < today) {
        return { valid: false, message: 'Check-In date cannot be in the past.' };
    }

    // Check-Out date must be strictly after Check-In date
    if (checkOut <= checkIn) {
        return { valid: false, message: 'Check-Out date must be after Check-In date.' };
    }

    return { valid: true };
}

// Check if customer already has an active booking
function hasActiveBooking(customerId, excludeBookingId = null) {
    const bookings = Database.getAll('hotel_bookings');
    return bookings.some(booking => 
        booking.customerId === customerId && 
        booking.status === 'Active' && 
        booking.id !== excludeBookingId
    );
}

// Handle Save Booking (Add or Edit)
function handleSaveBooking(event) {
    event.preventDefault();

    const bookingId = document.getElementById('bookingId').value;
    const customerId = document.getElementById('bookingCustomer').value;
    const roomId = document.getElementById('bookingRoom').value;
    const checkInDate = document.getElementById('bookingCheckIn').value;
    const checkOutDate = document.getElementById('bookingCheckOut').value;
    const status = document.getElementById('bookingStatus').value;

    // Validate all required fields
    if (!customerId || !roomId || !checkInDate || !checkOutDate || !status) {
        alert('Please fill in all required fields.');
        return false;
    }

    // Validate dates
    const dateValidation = validateBookingDates(checkInDate, checkOutDate);
    if (!dateValidation.valid) {
        alert(dateValidation.message);
        return false;
    }

    // Check if customer already has an active booking (when creating new or changing status to Active)
    if (status === 'Active' && hasActiveBooking(customerId, bookingId)) {
        alert('This customer already has an active booking. Cannot create another active booking.');
        return false;
    }

    const bookingData = {
        customerId: customerId,
        roomId: roomId,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        status: status
    };

    if (bookingId) {
        // Update existing booking
        Database.update('hotel_bookings', bookingId, bookingData);
    } else {
        // Add new booking
        Database.add('hotel_bookings', bookingData);
    }

    // Update room status based on booking status
    updateRoomStatus(roomId, status);

    closeBookingModal();
    loadBookings();
    return false;
}

// Update room status when booking status changes
function updateRoomStatus(roomId, bookingStatus) {
    if (bookingStatus === 'Active') {
        // Set room to Booked
        Database.update('hotel_rooms', roomId, { status: 'Booked' });
    } else if (bookingStatus === 'Completed' || bookingStatus === 'Cancelled') {
        // Check if room has other active bookings
        const bookings = Database.getAll('hotel_bookings');
        const hasOtherActiveBooking = bookings.some(booking => 
            booking.roomId === roomId && 
            booking.status === 'Active'
        );
        
        if (!hasOtherActiveBooking) {
            // Set room back to Available
            Database.update('hotel_rooms', roomId, { status: 'Available' });
        }
    }
}

// Open Delete Confirmation Modal
function openDeleteBookingModal(bookingId) {
    document.getElementById('deleteBookingId').value = bookingId;
    document.getElementById('deleteModal').classList.remove('hidden');
    document.getElementById('deleteModal').classList.add('flex');
}

// Close Delete Modal
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    document.getElementById('deleteModal').classList.remove('flex');
    document.getElementById('deleteBookingId').value = '';
}

// Confirm Delete Booking
function confirmDeleteBooking() {
    const bookingId = document.getElementById('deleteBookingId').value;
    
    if (bookingId) {
        const booking = Database.getById('hotel_bookings', bookingId);
        
        // If booking was active, release the room
        if (booking && booking.status === 'Active') {
            updateRoomStatus(booking.roomId, 'Cancelled');
        }
        
        Database.delete('hotel_bookings', bookingId);
        loadBookings();
    }
    
    closeDeleteModal();
}

// Close modals when clicking outside
document.getElementById('bookingModal').addEventListener('click', function(event) {
    if (event.target === this) {
        closeBookingModal();
    }
});

document.getElementById('deleteModal').addEventListener('click', function(event) {
    if (event.target === this) {
        closeDeleteModal();
    }
});