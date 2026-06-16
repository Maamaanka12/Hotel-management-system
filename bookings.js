/**
 * bookings.js
 * Full CRUD for hotel bookings with strict date and uniqueness validations.
 * New bookings redirect to the Payments page for simultaneous payment entry.
 */

document.addEventListener('DOMContentLoaded', function () {
  requireAuthentication();
  renderSidebarNavigation('bookings.html');
  setupMobileSidebarToggle();
  setupBookingModal();
  setupBookingForm();
  setMinimumCheckInDate();
  renderBookingsTable();
});

/**
 * Sets the minimum check-in date to today (prevents past bookings).
 */
function setMinimumCheckInDate() {
  const checkInInput = document.getElementById('booking-check-in');
  if (checkInInput) {
    checkInInput.min = getTodayDateString();
  }
}

/**
 * Sets up modal open/close listeners for the booking form.
 */
function setupBookingModal() {
  const modalElement = document.getElementById('booking-modal');
  const openButton = document.getElementById('open-add-booking-button');
  const closeButton = document.getElementById('close-booking-modal-button');

  openButton.addEventListener('click', function () {
    openBookingModal(null);
  });

  closeButton.addEventListener('click', function () {
    closeBookingModal();
  });

  modalElement.addEventListener('click', function (event) {
    if (event.target === modalElement) {
      closeBookingModal();
    }
  });
}

/**
 * Populates customer and room dropdowns from localStorage.
 */
function populateBookingDropdowns() {
  const customerSelect = document.getElementById('booking-customer');
  const roomSelect = document.getElementById('booking-room');
  const editId = document.getElementById('booking-edit-id').value;

  const customersList = getAllCustomers();
  const roomsList = getAllRooms();

  customerSelect.innerHTML = '<option value="">Choose a customer</option>';
  customersList.forEach(function (customer) {
    customerSelect.innerHTML += `<option value="${customer.id}">${customer.name}</option>`;
  });

  roomSelect.innerHTML = '<option value="">Choose a room</option>';
  roomsList.forEach(function (room) {
    const isAvailable = room.status === 'Available' || room.status === 'Booked';
    const isCurrentlyBookedRoom = editId && findBookingById(editId) && findBookingById(editId).roomId === room.id;

    if (room.status === 'Available' || isCurrentlyBookedRoom) {
      roomSelect.innerHTML += `<option value="${room.id}">Room ${room.roomNumber} — ${room.type} ($${room.price}/night)</option>`;
    } else if (room.status === 'Maintenance') {
      roomSelect.innerHTML += `<option value="${room.id}" disabled>Room ${room.roomNumber} — Maintenance</option>`;
    }
  });

  if (customersList.length === 0) {
    customerSelect.innerHTML += '<option value="" disabled>No customers — add one first</option>';
  }
  if (roomsList.length === 0) {
    roomSelect.innerHTML += '<option value="" disabled>No rooms — add one first</option>';
  }
}

/**
 * Opens the booking modal for a new booking or to edit an existing one.
 */
function openBookingModal(bookingId) {
  const modalElement = document.getElementById('booking-modal');
  const modalTitle = document.getElementById('booking-modal-title');
  const editIdField = document.getElementById('booking-edit-id');
  const saveButton = document.getElementById('save-booking-button');
  const bookingForm = document.getElementById('booking-form');

  bookingForm.reset();
  editIdField.value = '';
  setMinimumCheckInDate();
  populateBookingDropdowns();

  if (bookingId) {
    const booking = findBookingById(bookingId);
    if (booking) {
      modalTitle.textContent = 'Edit Booking';
      editIdField.value = booking.id;
      document.getElementById('booking-customer').value = booking.customerId;
      document.getElementById('booking-room').value = booking.roomId;
      document.getElementById('booking-check-in').value = booking.checkIn;
      document.getElementById('booking-check-out').value = booking.checkOut;
      document.getElementById('booking-status').value = booking.status;
      saveButton.textContent = 'Update Booking';
    }
  } else {
    modalTitle.textContent = 'New Booking';
    document.getElementById('booking-status').value = 'Active';
    saveButton.textContent = 'Save & Go to Payment';
  }

  modalElement.classList.remove('hidden');
  modalElement.classList.add('flex');
}

/**
 * Closes the booking modal.
 */
function closeBookingModal() {
  const modalElement = document.getElementById('booking-modal');
  modalElement.classList.add('hidden');
  modalElement.classList.remove('flex');
  document.getElementById('booking-form').reset();
  document.getElementById('booking-edit-id').value = '';
}

/**
 * Validates booking data before saving to localStorage.
 * Returns an error message string, or null if validation passes.
 */
function validateBookingData(bookingData, editId) {
  if (!bookingData.customerId || !bookingData.roomId || !bookingData.checkIn || !bookingData.checkOut || !bookingData.status) {
    return 'Please fill in all required fields.';
  }

  const todayDate = getTodayDateString();

  if (bookingData.checkIn < todayDate) {
    return 'Check-In date cannot be in the past.';
  }

  if (bookingData.checkOut <= bookingData.checkIn) {
    return 'Check-Out date must be strictly after the Check-In date.';
  }

  if (bookingData.status === 'Active') {
    if (customerHasActiveBooking(bookingData.customerId, editId)) {
      return 'This customer already has an active booking. They cannot book another room.';
    }

    if (roomHasActiveBooking(bookingData.roomId, editId)) {
      return 'This room already has an active booking.';
    }
  }

  const selectedRoom = findRoomById(bookingData.roomId);
  if (selectedRoom && selectedRoom.status === 'Maintenance') {
    return 'This room is under maintenance and cannot be booked.';
  }

  return null;
}

/**
 * Handles booking form submission.
 * New bookings redirect to payments.html with the booking ID.
 */
function setupBookingForm() {
  const bookingForm = document.getElementById('booking-form');

  bookingForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const editId = document.getElementById('booking-edit-id').value;
    const bookingData = {
      customerId: document.getElementById('booking-customer').value,
      roomId: document.getElementById('booking-room').value,
      checkIn: document.getElementById('booking-check-in').value,
      checkOut: document.getElementById('booking-check-out').value,
      status: document.getElementById('booking-status').value
    };

    const validationError = validateBookingData(bookingData, editId || null);
    if (validationError) {
      showAlertMessage(validationError, 'error');
      return;
    }

    const bookingsList = getAllBookings();
    let savedBookingId = editId;
    let previousRoomId = null;

    if (editId) {
      const bookingIndex = bookingsList.findIndex(function (booking) {
        return booking.id === editId;
      });

      if (bookingIndex !== -1) {
        previousRoomId = bookingsList[bookingIndex].roomId;
        bookingsList[bookingIndex] = {
          id: editId,
          customerId: bookingData.customerId,
          roomId: bookingData.roomId,
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          status: bookingData.status,
          reference: bookingsList[bookingIndex].reference,
          createdAt: bookingsList[bookingIndex].createdAt,
          updatedAt: new Date().toISOString()
        };
      }

      saveAllBookings(bookingsList);

      if (bookingData.status === 'Active') {
        syncRoomStatusWithBookings(bookingData.roomId);
      }
      if (previousRoomId && previousRoomId !== bookingData.roomId) {
        syncRoomStatusWithBookings(previousRoomId);
      }

      closeBookingModal();
      renderBookingsTable();
      showAlertMessage('Booking updated successfully.', 'success');
    } else {
      savedBookingId = generateUniqueId();
      const bookingReference = 'BK-' + savedBookingId.slice(-8).toUpperCase();

      bookingsList.push({
        id: savedBookingId,
        reference: bookingReference,
        customerId: bookingData.customerId,
        roomId: bookingData.roomId,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        status: bookingData.status,
        createdAt: new Date().toISOString()
      });

      saveAllBookings(bookingsList);

      if (bookingData.status === 'Active') {
        syncRoomStatusWithBookings(bookingData.roomId);
      }

      closeBookingModal();
      window.location.href = 'payments.html?bookingId=' + savedBookingId + '&newBooking=true';
    }
  });
}

/**
 * Renders all bookings in the table with customer and room details.
 */
function renderBookingsTable() {
  const bookingsList = getAllBookings();
  const tableBody = document.getElementById('bookings-table-body');

  if (bookingsList.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-8 text-center text-slate-400">No bookings yet. Click "New Booking" to get started.</td>
      </tr>
    `;
    return;
  }

  let tableRowsHTML = '';
  bookingsList.forEach(function (booking) {
    const customer = findCustomerById(booking.customerId);
    const room = findRoomById(booking.roomId);
    const customerName = customer ? customer.name : 'Unknown';
    const roomNumber = room ? room.roomNumber : 'Unknown';
    const statusColor = getBookingStatusColor(booking.status);
    const reference = booking.reference || booking.id.slice(-8).toUpperCase();

    tableRowsHTML += `
      <tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="px-6 py-4 font-mono text-xs text-slate-600">${reference}</td>
        <td class="px-6 py-4 font-medium text-slate-800">${customerName}</td>
        <td class="px-6 py-4 text-slate-600">${roomNumber}</td>
        <td class="px-6 py-4 text-slate-600">${booking.checkIn}</td>
        <td class="px-6 py-4 text-slate-600">${booking.checkOut}</td>
        <td class="px-6 py-4">
          <span class="rounded-full px-3 py-1 text-xs font-semibold ${statusColor}">${booking.status}</span>
        </td>
        <td class="px-6 py-4 text-right">
          <button onclick="goToPaymentForBooking('${booking.id}')"
                  class="mr-2 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200">
            Payment
          </button>
          <button onclick="openBookingModal('${booking.id}')"
                  class="mr-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
            Edit
          </button>
          <button onclick="deleteBooking('${booking.id}')"
                  class="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200">
            Delete
          </button>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = tableRowsHTML;
}

/**
 * Navigates to the payments page with a specific booking pre-selected.
 */
function goToPaymentForBooking(bookingId) {
  window.location.href = 'payments.html?bookingId=' + bookingId;
}

/**
 * Deletes a booking and syncs the associated room status.
 */
function deleteBooking(bookingId) {
  if (!confirm('Are you sure you want to delete this booking?')) {
    return;
  }

  const booking = findBookingById(bookingId);
  const bookingsList = getAllBookings().filter(function (item) {
    return item.id !== bookingId;
  });

  saveAllBookings(bookingsList);

  if (booking) {
    syncRoomStatusWithBookings(booking.roomId);
  }

  showAlertMessage('Booking deleted successfully.', 'success');
  renderBookingsTable();
}

/**
 * Returns Tailwind CSS classes for booking status badges.
 */
function getBookingStatusColor(status) {
  const colorMap = {
    Active: 'bg-green-100 text-green-700',
    Completed: 'bg-blue-100 text-blue-700',
    Cancelled: 'bg-red-100 text-red-700'
  };
  return colorMap[status] || 'bg-slate-100 text-slate-700';
}
