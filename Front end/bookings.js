let allBookings = [];
let allGuestsForBooking = [];
let allRoomsForBooking = [];
let activeStatusFilter = 'All';
let editingBookingId = null;
let deletingBookingId = null;

const BOOKING_STATUS_LABELS = {
  1: 'Pending',
  2: 'Confirmed',
  3: 'Checked-In',
  4: 'Checked-Out',
  5: 'Cancelled'
};

const BOOKING_STATUS_IDS = {
  'Pending':     1,
  'Confirmed':   2,
  'Checked-In':  3,
  'Checked-Out': 4,
  'Cancelled':   5
};


const ACTIVE_STATUS_IDS = new Set([1, 2, 3]); 

document.addEventListener('DOMContentLoaded', function () {
  requireAuthentication();
  setMinimumCheckInDate();
  setupDurationPreview();
  renderBookingsTable();
});

function setMinimumCheckInDate() {
  const checkInInput = document.getElementById('inputCheckIn');
  if (checkInInput) checkInInput.min = getTodayDateString();
}

function getTodayDateString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function setupDurationPreview() {
  const checkInInput = document.getElementById('inputCheckIn');
  const checkOutInput = document.getElementById('inputCheckOut');
  if (!checkInInput || !checkOutInput) return;

  function update() {
    const nights = calculateNights(checkInInput.value, checkOutInput.value);
    const preview = document.getElementById('durationPreview');
    const text = document.getElementById('durationText');
    if (nights > 0) {
      text.textContent = `${nights} night${nights === 1 ? '' : 's'}`;
      preview.classList.remove('hidden');
    } else {
      preview.classList.add('hidden');
    }
  }

  checkInInput.addEventListener('change', update);
  checkOutInput.addEventListener('change', update);
}

function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const diffMs = new Date(checkOut) - new Date(checkIn);
  if (Number.isNaN(diffMs) || diffMs <= 0) return 0;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

async function renderBookingsTable() {
  try {
    const result = await API.get('/bookings');
    allBookings = result.data || [];
    applyStatusFilter();
  } catch (error) {
    console.error('Failed to load bookings:', error);
    showAlertIn('modalAlert', error.message || 'Failed to load bookings.', 'error');
  }
}

function getStatusLabel(booking) {
  return BOOKING_STATUS_LABELS[booking.Booking_Status_ID] || '—';
}

function applyStatusFilter() {
  const filtered =
    activeStatusFilter === 'All'
      ? allBookings
      : allBookings.filter((b) => getStatusLabel(b) === activeStatusFilter);
  renderBookingRows(filtered);
}

function setStatusFilter(status) {
  activeStatusFilter = status;
  const filterButtonIds = {
    'All':          'filterAll',
    'Confirmed':    'filterActive',
    'Checked-Out':  'filterCheckedOut',
    'Cancelled':    'filterCancelled'
  };
  Object.entries(filterButtonIds).forEach(([filterStatus, buttonId]) => {
    const button = document.getElementById(buttonId);
    if (!button) return;
    if (filterStatus === status) {
      button.classList.add('active-filter');
      button.classList.remove('text-slate-400');
    } else {
      button.classList.remove('active-filter');
      button.classList.add('text-slate-400');
    }
  });
  applyStatusFilter();
}

function renderBookingRows(bookings) {
  const tableBody = document.getElementById('bookingsTableBody');
  const emptyState = document.getElementById('bookingsEmptyState');
  const countDisplay = document.getElementById('bookingCountDisplay');

  if (countDisplay) countDisplay.textContent = allBookings.length;

  if (bookings.length === 0) {
    tableBody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');

  tableBody.innerHTML = bookings.map((booking) => {
    const nights = calculateNights(booking.Check_In_Date, booking.Check_Out_Date);
    const statusLabel = getStatusLabel(booking);
    const roomDisplay = booking.Room_Type
      ? `${escapeHtml(String(booking.Room_Number))} <span class="text-slate-500 text-xs">(${escapeHtml(booking.Room_Type)})</span>`
      : escapeHtml(String(booking.Room_Number));

    return `
      <tr class="table-row-hover" style="border-bottom: 1px solid rgba(255,255,255,0.04);">
        <td class="px-5 py-3 text-slate-200">${escapeHtml(booking.Full_Name)}</td>
        <td class="px-5 py-3 text-slate-200">${roomDisplay}</td>
        <td class="px-5 py-3 text-slate-400 hidden sm:table-cell">${formatDate(booking.Check_In_Date)}</td>
        <td class="px-5 py-3 text-slate-400 hidden md:table-cell">${formatDate(booking.Check_Out_Date)}</td>
        <td class="px-5 py-3 text-slate-400 hidden lg:table-cell">${nights}</td>
        <td class="px-5 py-3">${bookingStatusBadge(statusLabel)}</td>
        <td class="px-5 py-3 text-right space-x-2">
          <button onclick="openEditModal(${booking.Booking_ID})" class="text-slate-400 hover:text-gold text-xs font-medium">Edit</button>
          <button onclick="openDeleteModal(${booking.Booking_ID})" class="text-slate-400 hover:text-red-400 text-xs font-medium">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function bookingStatusBadge(statusLabel) {
  const colors = {
    'Pending':     'bg-amber-500/15 text-amber-400',
    'Confirmed':   'bg-blue-500/15 text-blue-400',
    'Checked-In':  'bg-emerald-500/15 text-emerald-400',
    'Checked-Out': 'bg-slate-500/15 text-slate-400',
    'Cancelled':   'bg-red-500/15 text-red-400'
  };
  const classes = colors[statusLabel] || 'bg-slate-500/15 text-slate-400';
  return `<span class="px-2 py-1 rounded-full text-xs font-medium ${classes}">${escapeHtml(statusLabel)}</span>`;
}

async function loadBookingDropdownOptions(currentRoomId) {
  const customerSelect = document.getElementById('inputBookingCustomer');
  const roomSelect = document.getElementById('inputBookingRoom');

  try {
    const [guestsResult, roomsResult] = await Promise.all([API.get('/guests'), API.get('/rooms')]);
    allGuestsForBooking = guestsResult.data || [];
    allRoomsForBooking = roomsResult.data || [];
  } catch (error) {
    console.error('Failed to load customers/rooms for booking form:', error);
    return;
  }

  customerSelect.innerHTML =
    '<option value="">Select a customer...</option>' +
    allGuestsForBooking
      .map((guest) => `<option value="${guest.Guest_ID}">${escapeHtml(guest.Full_Name)}</option>`)
      .join('');

  roomSelect.innerHTML =
    '<option value="">Select a room...</option>' +
    allRoomsForBooking
      .filter((room) => room.Status_ID === 1 || room.Room_ID === currentRoomId)
      .map((room) =>
        `<option value="${room.Room_ID}" data-price="${room.Price_Per_Night}">` +
        `Room ${escapeHtml(String(room.Room_Number))} — ${escapeHtml(room.Room_Type)} ` +
        `($${Number(room.Price_Per_Night).toFixed(2)}/night)</option>`
      )
      .join('');
}

async function openAddModal() {
  editingBookingId = null;
  document.getElementById('modalTitle').textContent = 'New Booking';
  await loadBookingDropdownOptions(null);
  document.getElementById('inputBookingCustomer').value = '';
  document.getElementById('inputBookingRoom').value = '';
  document.getElementById('inputCheckIn').value = '';
  document.getElementById('inputCheckOut').value = '';
  document.getElementById('inputBookingStatus').value = 'Confirmed';
  document.getElementById('durationPreview').classList.add('hidden');
  hideAlertIn('modalAlert');
  document.getElementById('bookingModal').classList.add('open');
}

async function openEditModal(bookingId) {
  const booking = allBookings.find((b) => b.Booking_ID === bookingId);
  if (!booking) return;

  editingBookingId = bookingId;
  document.getElementById('modalTitle').textContent = 'Edit Booking';
  await loadBookingDropdownOptions(booking.Room_ID);
  document.getElementById('inputBookingCustomer').value = booking.Guest_ID;
  document.getElementById('inputBookingRoom').value = booking.Room_ID;
  document.getElementById('inputCheckIn').value = toDateInputValue(booking.Check_In_Date);
  document.getElementById('inputCheckOut').value = toDateInputValue(booking.Check_Out_Date);
  document.getElementById('inputBookingStatus').value = getStatusLabel(booking);

  const nights = calculateNights(booking.Check_In_Date, booking.Check_Out_Date);
  if (nights > 0) {
    document.getElementById('durationText').textContent = `${nights} night${nights === 1 ? '' : 's'}`;
    document.getElementById('durationPreview').classList.remove('hidden');
  }

  hideAlertIn('modalAlert');
  document.getElementById('bookingModal').classList.add('open');
}

function toDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function closeModal() {
  document.getElementById('bookingModal').classList.remove('open');
}

function handleModalBackdropClick(event) {
  if (event.target.id === 'bookingModal') closeModal();
}

async function handleSaveBooking() {
  const guestId = Number(document.getElementById('inputBookingCustomer').value);
  const roomSelect = document.getElementById('inputBookingRoom');
  const roomId = Number(roomSelect.value);
  const checkIn = document.getElementById('inputCheckIn').value;
  const checkOut = document.getElementById('inputCheckOut').value;
  const statusLabel = document.getElementById('inputBookingStatus').value;

  if (!guestId || !roomId || !checkIn || !checkOut) {
    showAlertIn('modalAlert', 'Please fill in all required fields.', 'error');
    return;
  }

  const nights = calculateNights(checkIn, checkOut);
  if (nights <= 0) {
    showAlertIn('modalAlert', 'Check-out date must be after check-in date.', 'error');
    return;
  }

  //no DOUBLE BOOKING 

  if (!editingBookingId) {
    const guestActiveBooking = allBookings.find(
      (b) => b.Guest_ID === guestId && ACTIVE_STATUS_IDS.has(b.Booking_Status_ID)
    );
    if (guestActiveBooking) {
      const guestName = allGuestsForBooking.find((g) => g.Guest_ID === guestId)?.Full_Name || 'This customer';
      showAlertIn(
        'modalAlert',
        `${guestName} already has an active booking (Booking #${guestActiveBooking.Booking_ID}). ` +
        `Check out or cancel that booking before creating a new one.`,
        'error'
      );
      return;
    }
  }

  const selectedOption = roomSelect.options[roomSelect.selectedIndex];
  const nightlyPrice = Number(selectedOption ? selectedOption.dataset.price : 0) || 0;
  const totalPrice = nights * nightlyPrice;

  const payload = { guestId, roomId, checkIn, checkOut, totalPrice, status: statusLabel };

  try {
    if (editingBookingId) {
      await API.put(`/bookings/${editingBookingId}`, payload);
    } else {
      await API.post('/bookings', payload);
    }
    closeModal();
    renderBookingsTable();
  } catch (error) {
    showAlertIn('modalAlert', error.message || 'Failed to save booking.', 'error');
  }
}

function openDeleteModal(bookingId) {
  deletingBookingId = bookingId;
  document.getElementById('deleteModal').classList.add('open');
}

function closeDeleteModal() {
  deletingBookingId = null;
  document.getElementById('deleteModal').classList.remove('open');
}

function handleDeleteBackdropClick(event) {
  if (event.target.id === 'deleteModal') closeDeleteModal();
}

async function confirmDeleteBooking() {
  if (!deletingBookingId) return;
  try {
    await API.delete(`/bookings/${deletingBookingId}`);
    closeDeleteModal();
    renderBookingsTable();
  } catch (error) {
    closeDeleteModal();
    console.error('Failed to delete booking:', error);
  }
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