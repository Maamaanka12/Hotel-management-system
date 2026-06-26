document.addEventListener('DOMContentLoaded', function () {
  requireAuthentication();
  displayCurrentDate();
  loadDashboardStatistics();
  loadRecentBookings();
});

function displayCurrentDate() {
  const dateElement = document.getElementById('currentDateDisplay');
  if (!dateElement) return;
  const today = new Date();
  dateElement.textContent = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

async function loadDashboardStatistics() {
  try {

    const [
      roomsResult,
      guestsResult,
      bookingsResult,
      paymentsResult
    ] = await Promise.all([
      API.get('/rooms'),
      API.get('/guests'),
      API.get('/bookings'),
      API.get('/payments')
    ]);

    const rooms = roomsResult.data || [];
    const guests = guestsResult.data || [];
    const bookings = bookingsResult.data || [];
    const payments = paymentsResult.data || [];

    const totalRooms = rooms.length;
    const totalCustomers = guests.length;


    const availableRooms =
      rooms.filter(
        room => Number(room.Status_ID) === 1
      ).length;

    const bookedRooms =
      rooms.filter(
        room => Number(room.Status_ID) === 2
      ).length;

    const activeBookings =
      bookings.filter(
        booking =>
          Number(booking.Booking_Status_ID) === 2 ||
          Number(booking.Booking_Status_ID) === 3
      ).length;

    const totalRevenue =
      payments.reduce(
        (sum, payment) =>
          sum + Number(payment.Amount || 0),
        0
      );

    setText('statTotalRooms', totalRooms);
    setText('statAvailableRooms', availableRooms);
    setText('statBookedRooms', bookedRooms);
    setText('statTotalCustomers', totalCustomers);
    setText('statActiveBookings', activeBookings);
    setText(
      'statTotalRevenue',
      `$${totalRevenue.toFixed(2)}`
    );

  } catch (error) {

    console.error(
      'Failed to load dashboard statistics:',
      error
    );

  }
}


const BOOKING_STATUS_LABELS = {
  1: 'Pending',
  2: 'Confirmed',
  3: 'Checked-In',
  4: 'Checked-Out',
  5: 'Cancelled'
};

async function loadRecentBookings() {
  const tableBody = document.getElementById('recentBookingsTableBody');
  const emptyState = document.getElementById('recentBookingsEmptyState');
  if (!tableBody) return;

  try {
    const result = await API.get('/bookings');
    const bookings = (result.data || []).slice(0, 5);

    if (bookings.length === 0) {
      tableBody.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    tableBody.innerHTML = bookings
      .map((booking) => {
        const statusLabel = BOOKING_STATUS_LABELS[booking.Booking_Status_ID] || '—';
        return `
        <tr class="table-row-hover" style="border-bottom: 1px solid rgba(255,255,255,0.04);">
          <td class="px-5 py-3 text-slate-200">${escapeHtml(booking.Full_Name)}</td>
          <td class="px-5 py-3 text-slate-200">${escapeHtml(booking.Room_Number)}</td>
          <td class="px-5 py-3 text-slate-400 hidden sm:table-cell">${formatDate(booking.Check_In_Date)}</td>
          <td class="px-5 py-3 text-slate-400 hidden md:table-cell">${formatDate(booking.Check_Out_Date)}</td>
          <td class="px-5 py-3">${statusBadge(statusLabel)}</td>
        </tr>
      `;
      })
      .join('');
  } catch (error) {
    console.error('Failed to load recent bookings:', error);
  }
}

function statusBadge(status) {
  const colors = {
    Pending:      'bg-amber-500/15 text-amber-400',
    Confirmed:    'bg-blue-500/15 text-blue-400',
    'Checked-In': 'bg-emerald-500/15 text-emerald-400',
    'Checked-Out':'bg-slate-500/15 text-slate-400',
    Cancelled:    'bg-red-500/15 text-red-400'
  };
  const classes = colors[status] || 'bg-slate-500/15 text-slate-400';
  return `<span class="px-2 py-1 rounded-full text-xs font-medium ${classes}">${escapeHtml(status)}</span>`;
}

function setText(elementId, value) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = value;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}