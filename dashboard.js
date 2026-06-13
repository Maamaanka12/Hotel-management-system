// dashboard.js - Dashboard Statistics and Data Loading

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

// Load dashboard statistics
function loadDashboardStats() {
    const rooms = Database.getAll('hotel_rooms');
    const customers = Database.getAll('hotel_customers');
    const bookings = Database.getAll('hotel_bookings');

    // Calculate statistics
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(room => room.status === 'Available').length;
    const bookedRooms = rooms.filter(room => room.status === 'Booked').length;
    const totalCustomers = customers.length;

    // Update DOM elements
    document.getElementById('totalRooms').textContent = totalRooms;
    document.getElementById('availableRooms').textContent = availableRooms;
    document.getElementById('bookedRooms').textContent = bookedRooms;
    document.getElementById('totalCustomers').textContent = totalCustomers;

    // Load recent bookings
    loadRecentBookings(bookings, customers, rooms);
}

// Load 5 most recent bookings
function loadRecentBookings(bookings, customers, rooms) {
    const tableBody = document.getElementById('recentBookingsTableBody');
    
    if (bookings.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-8 text-gray-500">No bookings yet</td>
            </tr>`;
        return;
    }

    // Sort bookings by creation date (newest first) and take first 5
    const recentBookings = bookings
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    tableBody.innerHTML = recentBookings.map(booking => {
        const customer = customers.find(c => c.id === booking.customerId);
        const room = rooms.find(r => r.id === booking.roomId);
        
        const customerName = customer ? customer.name : 'Unknown';
        const roomNumber = room ? room.roomNumber : 'Unknown';
        
        const statusClass = getStatusClass(booking.status);

        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition duration-150">
                <td class="py-3 text-gray-800">${customerName}</td>
                <td class="py-3 text-gray-600">Room ${roomNumber}</td>
                <td class="py-3 text-gray-600">${formatDate(booking.checkInDate)}</td>
                <td class="py-3 text-gray-600">${formatDate(booking.checkOutDate)}</td>
                <td class="py-3">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">
                        ${booking.status}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// Get CSS class based on booking status
function getStatusClass(status) {
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

// Load dashboard on page load
document.addEventListener('DOMContentLoaded', loadDashboardStats);

// Refresh data when page becomes visible (in case data changed in other tabs)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        loadDashboardStats();
    }
});