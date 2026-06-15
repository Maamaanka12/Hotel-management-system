/**
 * payments.js
 * Full CRUD for hotel payments with duplicate payment prevention.
 * Supports pre-filling from a booking when redirected from bookings.html.
 */

document.addEventListener('DOMContentLoaded', function () {
  requireAuthentication();
  renderSidebarNavigation('payments.html');
  setupMobileSidebarToggle();
  setupPaymentModal();
  setupPaymentForm();
  setupBookingSelectionListener();
  renderPaymentsTable();
  handleBookingRedirectFromUrl();
});

/**
 * Reads URL parameters and opens the payment modal if redirected from a booking.
 */
function handleBookingRedirectFromUrl() {
  const urlParameters = new URLSearchParams(window.location.search);
  const bookingId = urlParameters.get('bookingId');
  const isNewBooking = urlParameters.get('newBooking') === 'true';

  if (isNewBooking) {
    const bannerElement = document.getElementById('new-booking-banner');
    if (bannerElement) {
      bannerElement.classList.remove('hidden');
    }
  }

  if (bookingId) {
    openPaymentModal(null, bookingId);
  }
}

/**
 * Calculates suggested payment amount based on room price and stay duration.
 */
function calculateSuggestedAmount(booking) {
  const room = findRoomById(booking.roomId);
  if (!room) {
    return 0;
  }

  const checkInDate = new Date(booking.checkIn);
  const checkOutDate = new Date(booking.checkOut);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const numberOfNights = Math.ceil((checkOutDate - checkInDate) / millisecondsPerDay);

  return room.price * numberOfNights;
}

/**
 * Populates the booking reference dropdown with available bookings.
 */
function populateBookingDropdown(selectedBookingId) {
  const bookingSelect = document.getElementById('payment-booking');
  const editId = document.getElementById('payment-edit-id').value;
  const bookingsList = getAllBookings();

  bookingSelect.innerHTML = '<option value="">Select a booking</option>';

  bookingsList.forEach(function (booking) {
    const customer = findCustomerById(booking.customerId);
    const room = findRoomById(booking.roomId);
    const customerName = customer ? customer.name : 'Unknown';
    const roomNumber = room ? room.roomNumber : 'Unknown';
    const reference = booking.reference || booking.id.slice(-8).toUpperCase();

    const alreadyPaid = paymentExistsForBooking(booking.id, editId || null);
    const disabledAttribute = alreadyPaid ? 'disabled' : '';
    const paidLabel = alreadyPaid ? ' (Already Paid)' : '';

    bookingSelect.innerHTML += `
      <option value="${booking.id}" ${disabledAttribute}>
        ${reference} — ${customerName} / Room ${roomNumber}${paidLabel}
      </option>
    `;
  });

  if (selectedBookingId) {
    bookingSelect.value = selectedBookingId;
    updateBookingDetailsPanel(selectedBookingId);
  }

  if (bookingsList.length === 0) {
    bookingSelect.innerHTML += '<option value="" disabled>No bookings — create one first</option>';
  }
}

/**
 * Updates the booking details panel when a booking is selected.
 */
function updateBookingDetailsPanel(bookingId) {
  const detailsPanel = document.getElementById('payment-booking-details');
  const booking = findBookingById(bookingId);

  if (!booking) {
    detailsPanel.classList.add('hidden');
    return;
  }

  const customer = findCustomerById(booking.customerId);
  const room = findRoomById(booking.roomId);
  const suggestedAmount = calculateSuggestedAmount(booking);

  document.getElementById('detail-customer-name').textContent = customer ? customer.name : 'Unknown';
  document.getElementById('detail-room-number').textContent = room ? room.roomNumber : 'Unknown';
  document.getElementById('detail-suggested-amount').textContent = suggestedAmount.toFixed(2);

  detailsPanel.classList.remove('hidden');

  const amountInput = document.getElementById('payment-amount');
  if (!amountInput.value) {
    amountInput.value = suggestedAmount.toFixed(2);
  }
}

/**
 * Listens for booking selection changes to update the details panel.
 */
function setupBookingSelectionListener() {
  const bookingSelect = document.getElementById('payment-booking');

  bookingSelect.addEventListener('change', function () {
    if (bookingSelect.value) {
      updateBookingDetailsPanel(bookingSelect.value);
    } else {
      document.getElementById('payment-booking-details').classList.add('hidden');
    }
  });
}

/**
 * Sets up modal open/close event listeners.
 */
function setupPaymentModal() {
  const modalElement = document.getElementById('payment-modal');
  const openButton = document.getElementById('open-add-payment-button');
  const closeButton = document.getElementById('close-payment-modal-button');

  openButton.addEventListener('click', function () {
    openPaymentModal(null, null);
  });

  closeButton.addEventListener('click', function () {
    closePaymentModal();
  });

  modalElement.addEventListener('click', function (event) {
    if (event.target === modalElement) {
      closePaymentModal();
    }
  });
}

/**
 * Opens the payment modal for adding or editing a payment.
 */
function openPaymentModal(paymentId, preselectedBookingId) {
  const modalElement = document.getElementById('payment-modal');
  const modalTitle = document.getElementById('payment-modal-title');
  const editIdField = document.getElementById('payment-edit-id');
  const paymentForm = document.getElementById('payment-form');

  paymentForm.reset();
  editIdField.value = '';
  document.getElementById('payment-booking-details').classList.add('hidden');

  if (paymentId) {
    const paymentsList = getAllPayments();
    const payment = paymentsList.find(function (item) {
      return item.id === paymentId;
    });

    if (payment) {
      modalTitle.textContent = 'Edit Payment';
      editIdField.value = payment.id;
      populateBookingDropdown(payment.bookingId);
      document.getElementById('payment-booking').value = payment.bookingId;
      document.getElementById('payment-amount').value = payment.amount;
      document.getElementById('payment-method').value = payment.method;
      document.getElementById('payment-date').value = payment.date;
      document.getElementById('payment-status').value = payment.status;
      updateBookingDetailsPanel(payment.bookingId);
    }
  } else {
    modalTitle.textContent = 'Add Payment';
    populateBookingDropdown(preselectedBookingId);
    document.getElementById('payment-date').value = getTodayDateString();
    document.getElementById('payment-status').value = 'Paid';

    if (preselectedBookingId) {
      updateBookingDetailsPanel(preselectedBookingId);
    }
  }

  modalElement.classList.remove('hidden');
  modalElement.classList.add('flex');
}

/**
 * Closes the payment modal.
 */
function closePaymentModal() {
  const modalElement = document.getElementById('payment-modal');
  modalElement.classList.add('hidden');
  modalElement.classList.remove('flex');
  document.getElementById('payment-form').reset();
  document.getElementById('payment-edit-id').value = '';
}

/**
 * Validates payment data before saving.
 * Prevents duplicate payments for the same booking or same customer+room.
 */
function validatePaymentData(paymentData, editId) {
  if (!paymentData.bookingId || !paymentData.amount || !paymentData.method || !paymentData.date || !paymentData.status) {
    return 'Please fill in all required fields.';
  }

  if (paymentData.amount <= 0) {
    return 'Payment amount must be greater than zero.';
  }

  const booking = findBookingById(paymentData.bookingId);
  if (!booking) {
    return 'Selected booking was not found.';
  }

  if (paymentExistsForBooking(paymentData.bookingId, editId)) {
    return 'A payment already exists for this booking reference.';
  }

  if (customerAlreadyPaidForRoom(booking.customerId, booking.roomId, editId)) {
    return 'This customer has already paid for this room. Duplicate payments are not allowed.';
  }

  return null;
}

/**
 * Handles payment form submission.
 */
function setupPaymentForm() {
  const paymentForm = document.getElementById('payment-form');

  paymentForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const editId = document.getElementById('payment-edit-id').value;
    const bookingId = document.getElementById('payment-booking').value;
    const booking = findBookingById(bookingId);

    const paymentData = {
      bookingId: bookingId,
      amount: parseFloat(document.getElementById('payment-amount').value),
      method: document.getElementById('payment-method').value,
      date: document.getElementById('payment-date').value,
      status: document.getElementById('payment-status').value,
      customerId: booking ? booking.customerId : '',
      roomId: booking ? booking.roomId : ''
    };

    const validationError = validatePaymentData(paymentData, editId || null);
    if (validationError) {
      showAlertMessage(validationError, 'error');
      return;
    }

    const paymentsList = getAllPayments();

    if (editId) {
      const paymentIndex = paymentsList.findIndex(function (payment) {
        return payment.id === editId;
      });

      if (paymentIndex !== -1) {
        paymentsList[paymentIndex] = {
          id: editId,
          bookingId: paymentData.bookingId,
          customerId: paymentData.customerId,
          roomId: paymentData.roomId,
          amount: paymentData.amount,
          method: paymentData.method,
          date: paymentData.date,
          status: paymentData.status,
          updatedAt: new Date().toISOString()
        };
      }
      showAlertMessage('Payment updated successfully.', 'success');
    } else {
      paymentsList.push({
        id: generateUniqueId(),
        bookingId: paymentData.bookingId,
        customerId: paymentData.customerId,
        roomId: paymentData.roomId,
        amount: paymentData.amount,
        method: paymentData.method,
        date: paymentData.date,
        status: paymentData.status,
        createdAt: new Date().toISOString()
      });
      showAlertMessage('Payment recorded successfully.', 'success');
    }

    saveAllPayments(paymentsList);
    closePaymentModal();

    if (window.location.search) {
      window.history.replaceState({}, document.title, 'payments.html');
      const bannerElement = document.getElementById('new-booking-banner');
      if (bannerElement) {
        bannerElement.classList.add('hidden');
      }
    }

    renderPaymentsTable();
  });
}

/**
 * Renders all payments in the table.
 */
function renderPaymentsTable() {
  const paymentsList = getAllPayments();
  const tableBody = document.getElementById('payments-table-body');

  if (paymentsList.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="px-6 py-8 text-center text-slate-400">No payments recorded yet.</td>
      </tr>
    `;
    return;
  }

  let tableRowsHTML = '';
  paymentsList.forEach(function (payment) {
    const booking = findBookingById(payment.bookingId);
    const customer = findCustomerById(payment.customerId);
    const room = findRoomById(payment.roomId);
    const reference = booking ? (booking.reference || booking.id.slice(-8).toUpperCase()) : 'N/A';
    const customerName = customer ? customer.name : 'Unknown';
    const roomNumber = room ? room.roomNumber : 'Unknown';
    const statusColor = getPaymentStatusColor(payment.status);

    tableRowsHTML += `
      <tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="px-6 py-4 font-mono text-xs text-slate-600">${reference}</td>
        <td class="px-6 py-4 font-medium text-slate-800">${customerName}</td>
        <td class="px-6 py-4 text-slate-600">${roomNumber}</td>
        <td class="px-6 py-4 text-slate-600">$${payment.amount.toFixed(2)}</td>
        <td class="px-6 py-4 text-slate-600">${payment.method}</td>
        <td class="px-6 py-4 text-slate-600">${payment.date}</td>
        <td class="px-6 py-4">
          <span class="rounded-full px-3 py-1 text-xs font-semibold ${statusColor}">${payment.status}</span>
        </td>
        <td class="px-6 py-4 text-right">
          <button onclick="openPaymentModal('${payment.id}', null)"
                  class="mr-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
            Edit
          </button>
          <button onclick="deletePayment('${payment.id}')"
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
 * Deletes a payment record from localStorage.
 */
function deletePayment(paymentId) {
  if (!confirm('Are you sure you want to delete this payment?')) {
    return;
  }

  const paymentsList = getAllPayments().filter(function (payment) {
    return payment.id !== paymentId;
  });

  saveAllPayments(paymentsList);
  showAlertMessage('Payment deleted successfully.', 'success');
  renderPaymentsTable();
}

/**
 * Returns Tailwind CSS classes for payment status badges.
 */
function getPaymentStatusColor(status) {
  const colorMap = {
    Paid: 'bg-green-100 text-green-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Refunded: 'bg-red-100 text-red-700'
  };
  return colorMap[status] || 'bg-slate-100 text-slate-700';
}
