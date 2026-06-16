/**
 * dashboard.js
 * Loads live statistics and the 5 most recent bookings on the dashboard.
 */

document.addEventListener('DOMContentLoaded', function () {
  requireAuthentication();
  renderSidebarNavigation('dashboard.html');
  setupMobileSidebarToggle();
  displayCurrentDate();
  loadDashboardStatistics();
  loadRecentBookings();
});

/**
 * Shows today's formatted date in the page header.
 */
function displayCurrentDate() {
  const dateElement = document.getElementById('dashboard-date');
  if (dateElement) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = new Date().toLocaleDateString('en-US', options);
  }
}

/**
 * Calculates and displays room and customer statistics from localStorage.
 */
function loadDashboardStatistics() {
  const roomsList = getAllRooms();
  const customersList = getAllCustomers();

  const totalRooms = roomsList.length;
  const availableRooms = roomsList.filter(function (room) {
    return room.status === 'Available';
  }).length;
  const bookedRooms = roomsList.filter(function (room) {
    return room.status === 'Booked';
  }).length;

  document.getElementById('stat-total-rooms').textContent = totalRooms;
  document.getElementById('stat-available-rooms').textContent = availableRooms;
  document.getElementById('stat-booked-rooms').textContent = bookedRooms;
  document.getElementById('stat-total-customers').textContent = customersList.length;
}

/**
 * Renders the 5 most recently created bookings in the table.
 */
function loadRecentBookings() {
  const bookingsList = getAllBookings();
  const tableBody = document.getElementById('recent-bookings-table');

  if (bookingsList.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-8 text-center text-slate-400">No bookings yet. Create one from the Bookings page.</td>
      </tr>
    `;
    return;
  }

  const sortedBookings = bookingsList.slice().sort(function (firstBooking, secondBooking) {
    return new Date(secondBooking.createdAt) - new Date(firstBooking.createdAt);
  });

  const recentBookings = sortedBookings.slice(0, 5);

  let tableRowsHTML = '';
  recentBookings.forEach(function (booking) {
    const customer = findCustomerById(booking.customerId);
    const room = findRoomById(booking.roomId);
    const customerName = customer ? customer.name : 'Unknown';
    const roomNumber = room ? room.roomNumber : 'Unknown';
    const statusColor = getBookingStatusColor(booking.status);

    tableRowsHTML += `
      <tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="px-6 py-4 font-medium text-slate-800">${customerName}</td>
        <td class="px-6 py-4 text-slate-600">${roomNumber}</td>
        <td class="px-6 py-4 text-slate-600">${booking.checkIn}</td>
        <td class="px-6 py-4 text-slate-600">${booking.checkOut}</td>
        <td class="px-6 py-4">
          <span class="rounded-full px-3 py-1 text-xs font-semibold ${statusColor}">${booking.status}</span>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = tableRowsHTML;
}

/**
 * Returns Tailwind CSS classes for booking status badge colors.
 */
function getBookingStatusColor(status) {
  const colorMap = {
    Active: 'bg-green-100 text-green-700',
    Completed: 'bg-blue-100 text-blue-700',
    Cancelled: 'bg-red-100 text-red-700',
    Pending: 'bg-yellow-100 text-yellow-700'
  };
  return colorMap[status] || 'bg-slate-100 text-slate-700';
}
