/*
 * payments.js
 * CRUD for payments. Fields: Customer, Room, Amount, Method, Status.
 *
 * Key behaviors:
 *  - If the page is opened with ?bookingId=... (from the Bookings flow),
 *    the modal opens automatically pre-filled with that booking's customer
 *    and room, and the room price as the default amount.
 *  - A customer cannot pay twice for the same room: if a payment already
 *    exists for that customer + room pair, saving is blocked.
 */

buildLayout();

let editingPaymentId = null;

function renderPaymentsPage() {
  const content =
    '<div class="mb-5 flex items-center justify-between">' +
    '<p class="text-sm text-slate-500">Record and track payments</p>' +
    '<button id="addPaymentButton" class="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700">+ New Payment</button>' +
    "</div>" +
    '<div id="paymentsTableContainer" class="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"></div>' +
    buildPaymentModalShell();

  document.getElementById("pageContent").innerHTML = content;

  document.getElementById("addPaymentButton").addEventListener("click", function () {
    openPaymentModal(null, null);
  });
  document.getElementById("paymentModalCloseButton").addEventListener("click", closePaymentModal);
  document.getElementById("paymentModalCancelButton").addEventListener("click", closePaymentModal);
  document.getElementById("paymentForm").addEventListener("submit", savePayment);

  renderPaymentsTable();

  // If we arrived from the Bookings page, open the pre-filled modal.
  const params = new URLSearchParams(window.location.search);
  const bookingId = params.get("bookingId");
  if (bookingId) {
    openPaymentModal(null, bookingId);
  }
}

function buildPaymentModalShell() {
  return (
    '<div id="paymentModal" class="fixed inset-0 z-40 hidden items-center justify-center bg-black/40 p-4">' +
    '<div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">' +
    '<div class="mb-4 flex items-center justify-between">' +
    '<h2 id="paymentModalTitle" class="text-lg font-semibold text-slate-900">New Payment</h2>' +
    '<button id="paymentModalCloseButton" class="text-slate-400 hover:text-slate-600">&times;</button>' +
    "</div>" +
    '<form id="paymentForm" class="space-y-4">' +
    '<div><label class="mb-1 block text-sm font-medium text-slate-700">Customer</label>' +
    '<select id="paymentCustomer" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"></select></div>' +
    '<div><label class="mb-1 block text-sm font-medium text-slate-700">Room</label>' +
    '<select id="paymentRoom" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"></select></div>' +
    '<div><label class="mb-1 block text-sm font-medium text-slate-700">Amount</label>' +
    '<input type="number" id="paymentAmount" min="0" step="0.01" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></div>' +
    '<div class="grid grid-cols-2 gap-3">' +
    '<div><label class="mb-1 block text-sm font-medium text-slate-700">Method</label>' +
    '<select id="paymentMethod" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">' +
    '<option value="Cash">Cash</option><option value="Card">Card</option><option value="Mobile Money">Mobile Money</option></select></div>' +
    '<div><label class="mb-1 block text-sm font-medium text-slate-700">Status</label>' +
    '<select id="paymentStatus" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">' +
    '<option value="Paid">Paid</option><option value="Pending">Pending</option><option value="Failed">Failed</option></select></div>' +
    "</div>" +
    '<p id="paymentError" class="hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"></p>' +
    '<div class="flex justify-end gap-3 pt-1">' +
    '<button type="button" id="paymentModalCancelButton" class="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">Cancel</button>' +
    '<button type="submit" class="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Save Payment</button>' +
    "</div>" +
    "</form>" +
    "</div>" +
    "</div>"
  );
}

function populatePaymentSelects() {
  const customers = Database.getCustomers();
  const rooms = Database.getRooms();

  document.getElementById("paymentCustomer").innerHTML =
    '<option value="">Select customer...</option>' +
    customers
      .map(function (customer) {
        return '<option value="' + customer.id + '">' + customer.name + "</option>";
      })
      .join("");

  document.getElementById("paymentRoom").innerHTML =
    '<option value="">Select room...</option>' +
    rooms
      .map(function (room) {
        return '<option value="' + room.id + '">Room ' + room.number + " (" + room.type + ")</option>";
      })
      .join("");
}

function renderPaymentsTable() {
  const payments = Database.getPayments();
  let rows = "";

  if (payments.length === 0) {
    rows =
      '<tr><td colspan="6" class="px-4 py-8 text-center text-sm text-slate-400">No payments recorded yet.</td></tr>';
  } else {
    rows = payments
      .map(function (payment) {
        const customer = Database.getCustomerById(payment.customerId);
        const room = Database.getRoomById(payment.roomId);
        return (
          '<tr class="border-t border-slate-100">' +
          '<td class="px-4 py-3 text-sm font-medium text-slate-800">' + (customer ? customer.name : "Unknown") + "</td>" +
          '<td class="px-4 py-3 text-sm text-slate-700">' + (room ? room.number : "Unknown") + "</td>" +
          '<td class="px-4 py-3 text-sm text-slate-700">' + formatMoney(payment.amount) + "</td>" +
          '<td class="px-4 py-3 text-sm text-slate-700">' + payment.method + "</td>" +
          '<td class="px-4 py-3">' + statusBadge(payment.status) + "</td>" +
          '<td class="px-4 py-3 text-right">' +
          '<button data-edit="' + payment.id + '" class="mr-2 text-sm font-medium text-teal-600 hover:underline">Edit</button>' +
          '<button data-delete="' + payment.id + '" class="text-sm font-medium text-red-600 hover:underline">Delete</button>' +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  document.getElementById("paymentsTableContainer").innerHTML =
    '<div class="overflow-x-auto"><table class="w-full min-w-[700px]">' +
    '<thead><tr class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">' +
    '<th class="px-4 py-3">Customer</th>' +
    '<th class="px-4 py-3">Room</th>' +
    '<th class="px-4 py-3">Amount</th>' +
    '<th class="px-4 py-3">Method</th>' +
    '<th class="px-4 py-3">Status</th>' +
    '<th class="px-4 py-3 text-right">Actions</th>' +
    "</tr></thead><tbody>" +
    rows +
    "</tbody></table></div>";

  document.querySelectorAll("[data-edit]").forEach(function (button) {
    button.addEventListener("click", function () {
      openPaymentModal(button.getAttribute("data-edit"), null);
    });
  });
  document.querySelectorAll("[data-delete]").forEach(function (button) {
    button.addEventListener("click", function () {
      deletePayment(button.getAttribute("data-delete"));
    });
  });
}

function openPaymentModal(paymentId, bookingId) {
  if (Database.getCustomers().length === 0 || Database.getRooms().length === 0) {
    window.alert("Please add at least one customer and one room before recording a payment.");
    return;
  }

  editingPaymentId = paymentId;
  populatePaymentSelects();
  document.getElementById("paymentError").classList.add("hidden");

  if (paymentId) {
    // Editing an existing payment.
    const payment = Database.getPaymentById(paymentId);
    document.getElementById("paymentModalTitle").textContent = "Edit Payment";
    document.getElementById("paymentCustomer").value = payment.customerId;
    document.getElementById("paymentRoom").value = payment.roomId;
    document.getElementById("paymentAmount").value = payment.amount;
    document.getElementById("paymentMethod").value = payment.method;
    document.getElementById("paymentStatus").value = payment.status;
  } else if (bookingId) {
    // Pre-fill from a booking (came from the Bookings page).
    const booking = Database.getBookingById(bookingId);
    document.getElementById("paymentModalTitle").textContent = "New Payment";
    if (booking) {
      const room = Database.getRoomById(booking.roomId);
      document.getElementById("paymentCustomer").value = booking.customerId;
      document.getElementById("paymentRoom").value = booking.roomId;
      document.getElementById("paymentAmount").value = room ? room.price : "";
    }
    document.getElementById("paymentMethod").value = "Cash";
    document.getElementById("paymentStatus").value = "Paid";
  } else {
    // Blank new payment.
    document.getElementById("paymentModalTitle").textContent = "New Payment";
    document.getElementById("paymentCustomer").value = "";
    document.getElementById("paymentRoom").value = "";
    document.getElementById("paymentAmount").value = "";
    document.getElementById("paymentMethod").value = "Cash";
    document.getElementById("paymentStatus").value = "Paid";
  }

  const modal = document.getElementById("paymentModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closePaymentModal() {
  const modal = document.getElementById("paymentModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  editingPaymentId = null;

  // Clean the bookingId out of the URL so reopening the page doesn't re-trigger.
  if (window.location.search) {
    window.history.replaceState({}, document.title, "payments.html");
  }
}

function savePayment(event) {
  event.preventDefault();
  const errorElement = document.getElementById("paymentError");

  const customerId = document.getElementById("paymentCustomer").value;
  const roomId = document.getElementById("paymentRoom").value;
  const amount = document.getElementById("paymentAmount").value;
  const method = document.getElementById("paymentMethod").value;
  const status = document.getElementById("paymentStatus").value;

  function showError(message) {
    errorElement.textContent = message;
    errorElement.classList.remove("hidden");
  }

  if (!customerId || !roomId || amount === "" || Number(amount) < 0) {
    showError("Please fill in all fields with a valid amount.");
    return;
  }

  // Logic: prevent the same customer paying twice for the same room.
  if (Database.paymentExistsForCustomerRoom(customerId, roomId, editingPaymentId)) {
    showError("A payment for this customer and room already exists. Duplicate payments are not allowed.");
    return;
  }

  const paymentData = {
    customerId: customerId,
    roomId: roomId,
    amount: Number(amount),
    method: method,
    status: status,
    date: new Date().toISOString(),
  };

  if (editingPaymentId) {
    Database.updatePayment(editingPaymentId, paymentData);
  } else {
    Database.addPayment(paymentData);
  }

  closePaymentModal();
  renderPaymentsTable();
}

function deletePayment(paymentId) {
  if (window.confirm("Delete this payment record?")) {
    Database.deletePayment(paymentId);
    renderPaymentsTable();
  }
}

renderPaymentsPage();
