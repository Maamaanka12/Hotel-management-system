let allPayments = [];
let allBookingsForPayment = [];
let methodIdByName = {};
let activeStatusFilter = 'All';
let editingPaymentId = null;
let deletingPaymentId = null;

document.addEventListener('DOMContentLoaded', function () {
  requireAuthentication();
  loadMethodMap(); 
  renderPaymentsTable();
});

async function renderPaymentsTable() {
  try {
    const result = await API.get('/payments');
    allPayments = result.data || [];
    renderSummaryCards();
    applyStatusFilter();
  } catch (error) {
    console.error('Failed to load payments:', error);
    showAlertIn('modalAlert', error.message || 'Failed to load payments.', 'error');
  }
}

async function loadMethodMap() {
  try {
    const result = await API.get('/payments/methods');
    methodIdByName = {};
    (result.data || []).forEach((method) => {
      methodIdByName[method.Method_Name] = method.Method_ID;
    });
  } catch (error) {
    console.error('Failed to load payment methods:', error);
  }
}

function renderSummaryCards() {
  const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.Amount || 0), 0);
  setText('summaryTotalPaid', `$${totalPaid.toFixed(2)}`);
  setText('summaryTotalPending', '$0.00');
  setText('summaryTotalRecords', allPayments.length);
}

function applyStatusFilter() {
  const filtered =
    activeStatusFilter === 'All' || activeStatusFilter === 'Paid' ? allPayments : [];
  renderPaymentRows(filtered);
}

function setStatusFilter(status) {
  activeStatusFilter = status;

  const filterButtonIds = {
    All:      'filterAll',
    Paid:     'filterPaid',
    Pending:  'filterPending',
    Refunded: 'filterRefunded'
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

function renderPaymentRows(payments) {
  const tableBody = document.getElementById('paymentsTableBody');
  const emptyState = document.getElementById('paymentsEmptyState');

  if (payments.length === 0) {
    tableBody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');

  tableBody.innerHTML = payments
    .map(
      (payment) => `
      <tr class="table-row-hover" style="border-bottom: 1px solid rgba(255,255,255,0.04);">
        <td class="px-5 py-3 text-slate-200">Booking #${payment.Booking_ID}</td>
        <td class="px-5 py-3 text-slate-200 font-medium">$${Number(payment.Amount).toFixed(2)}</td>
        <td class="px-5 py-3 text-slate-300 hidden sm:table-cell">${escapeHtml(payment.Method_Name)}</td>
        <td class="px-5 py-3 text-slate-400 hidden md:table-cell">${formatDate(payment.Payment_Date)}</td>
        <td class="px-5 py-3"><span class="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">Paid</span></td>
        <td class="px-5 py-3 text-right space-x-2">
          <button onclick="openEditModal(${payment.Payment_ID})" class="text-slate-400 hover:text-gold text-xs font-medium">Edit</button>
          <button onclick="openDeleteModal(${payment.Payment_ID})" class="text-slate-400 hover:text-red-400 text-xs font-medium">Delete</button>
        </td>
      </tr>
    `
    )
    .join('');
}

async function loadPaymentBookingOptions(currentBookingId) {
  const bookingSelect = document.getElementById('inputPaymentBooking');

  try {
    const result = await API.get('/bookings');
    allBookingsForPayment = result.data || [];
  } catch (error) {
    console.error('Failed to load bookings for payment form:', error);
    return;
  }

  bookingSelect.innerHTML =
    '<option value="">Select a booking...</option>' +
    allBookingsForPayment
      .map(
        (booking) =>
          `<option value="${booking.Booking_ID}" data-total="${booking.Total_Amount}">` +
          `#${booking.Booking_ID} — ${escapeHtml(booking.Full_Name)} ` +
          `(Room ${escapeHtml(String(booking.Room_Number))})</option>`
      )
      .join('');

  if (currentBookingId) {
    bookingSelect.value = currentBookingId;
  }

  bookingSelect.onchange = function () {
    const selectedOption = bookingSelect.options[bookingSelect.selectedIndex];
    const totalAmount = selectedOption ? selectedOption.dataset.total : '';
    const amountInput = document.getElementById('inputPaymentAmount');
    if (amountInput && totalAmount) {
      amountInput.value = Number(totalAmount).toFixed(2);
    }
  };
}

async function openAddModal() {
  editingPaymentId = null;
  document.getElementById('modalTitle').textContent = 'Add Payment';
  await loadMethodMap();
  await loadPaymentBookingOptions(null);
  document.getElementById('inputPaymentBooking').value = '';
  document.getElementById('inputPaymentAmount').value = '';
  document.getElementById('inputPaymentMethod').value = '';
  document.getElementById('inputPaymentDate').value = getTodayDateString();
  document.getElementById('inputPaymentStatus').value = 'Paid';
  hideAlertIn('modalAlert');
  document.getElementById('paymentModal').classList.add('open');
}

async function openEditModal(paymentId) {
  const payment = allPayments.find((p) => p.Payment_ID === paymentId);
  if (!payment) return;

  editingPaymentId = paymentId;
  document.getElementById('modalTitle').textContent = 'Edit Payment';
  await loadMethodMap();
  await loadPaymentBookingOptions(payment.Booking_ID);
  document.getElementById('inputPaymentAmount').value = payment.Amount;
  document.getElementById('inputPaymentMethod').value = payment.Method_Name;
  document.getElementById('inputPaymentDate').value = toDateInputValue(payment.Payment_Date);
  document.getElementById('inputPaymentStatus').value = 'Paid';
  hideAlertIn('modalAlert');
  document.getElementById('paymentModal').classList.add('open');
}

function toDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function getTodayDateString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function closeModal() {
  document.getElementById('paymentModal').classList.remove('open');
}

function handleModalBackdropClick(event) {
  if (event.target.id === 'paymentModal') closeModal();
}

async function handleSavePayment() {
  const bookingId = Number(document.getElementById('inputPaymentBooking').value);
  const amount = Number(document.getElementById('inputPaymentAmount').value);
  const methodName = document.getElementById('inputPaymentMethod').value;
  const paymentDate = document.getElementById('inputPaymentDate').value;

  if (!bookingId || !amount || !methodName || !paymentDate) {
    showAlertIn('modalAlert', 'Please fill in all required fields.', 'error');
    return;
  }

  //  no DOUBLE PAYMENT  
  if (!editingPaymentId) {
    const existingPayment = allPayments.find((p) => p.Booking_ID === bookingId);
    if (existingPayment) {
      showAlertIn(
        'modalAlert',
        `Booking #${bookingId} already has a payment (Payment #${existingPayment.Payment_ID}). ` +
        `You cannot add a second payment for the same booking.`,
        'error'
      );
      return;
    }
  }

  const methodId = methodIdByName[methodName];
  if (!methodId) {
    showAlertIn(
      'modalAlert',
      `Payment method "${methodName}" not found. Please refresh and try again.`,
      'error'
    );
    return;
  }

  const payload = { bookingId, amount, methodId, paymentDate };

  try {
    if (editingPaymentId) {
      await API.put(`/payments/${editingPaymentId}`, payload);
    } else {
      await API.post('/payments', payload);
    }
    closeModal();
    renderPaymentsTable();
  } catch (error) {
    showAlertIn('modalAlert', error.message || 'Failed to save payment.', 'error');
  }
}

function openDeleteModal(paymentId) {
  deletingPaymentId = paymentId;
  document.getElementById('deleteModal').classList.add('open');
}

function closeDeleteModal() {
  deletingPaymentId = null;
  document.getElementById('deleteModal').classList.remove('open');
}

function handleDeleteBackdropClick(event) {
  if (event.target.id === 'deleteModal') closeDeleteModal();
}

async function confirmDeletePayment() {
  if (!deletingPaymentId) return;
  try {
    await API.delete(`/payments/${deletingPaymentId}`);
    closeDeleteModal();
    renderPaymentsTable();
  } catch (error) {
    closeDeleteModal();
    console.error('Failed to delete payment:', error);
  }
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function setText(elementId, value) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = value;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}