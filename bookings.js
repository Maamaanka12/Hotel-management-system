/*
 * bookings.js
 * CRUD for bookings. Fields: Customer, Room, Check-In, Check-Out, Status.
 *
 * Key behaviors:
 *  - An "Active" booking flips the chosen room's status to "Booked".
 *  - Check-In cannot be in the past; Check-Out must be after Check-In.
 *  - A customer with an existing "Active" booking cannot start another.
 *  - After saving, the staff member is sent to Payments with the booking
 *    pre-selected so booking + payment are handled together.
 */

buildLayout();

let editingBookingId = null;

function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function renderBookingsPage() {
  const content =
    '<div class="mb-5 flex items-center justify-between">' +
    '<p class="text-sm text-slate-500">Manage room bookings</p>' +
    '<button id="addBookingButton" class="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700">+ New Booking</button>' +
    "</div>" +
    '<div id="bookingsTableContainer" class="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"></div>' +
    buildBookingModalShell();

  document.getElementById("pageContent").innerHTML = content;

  document.getElementById("addBookingButton").addEventListener("click", function () {
    openBookingModal(null);
  });
  document.getElementById("bookingModalCloseButton").addEventListener("click", closeBookingModal);
  document.getElementById("bookingModalCancelButton").addEventListener("click", closeBookingModal);
  document.getElementById("bookingForm").addEventListener("submit", saveBooking);

  renderBookingsTable();
}

function buildBookingModalShell() {
  return (
    '<div id="bookingModal" class="fixed inset-0 z-40 hidden items-center justify-center bg-black/40 p-4">' +
    '<div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">' +
    '<div class="mb-4 flex items-center justify-between">' +
    '<h2 id="bookingModalTitle" class="text-lg font-semibold text-slate-900">New Booking</h2>' +
    '<button id="bookingModalCloseButton" class="text-slate-400 hover:text-slate-600">&times;</button>' +
    "</div>" +
    '<form id="bookingForm" class="space-y-4">' +
    '<div><label class="mb-1 block text-sm font-medium text-slate-700">Customer</label>' +
    '<select id="bookingCustomer" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"></select></div>' +
    '<div><label class="mb-1 block text-sm font-medium text-slate-700">Room</label>' +
    '<select id="bookingRoom" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"></select></div>' +
    '<div class="grid grid-cols-2 gap-3">' +
    '<div><label class="mb-1 block text-sm font-medium text-slate-700">Check-In</label>' +
    '<input type="date" id="bookingCheckIn" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></div>' +
    '<div><label class="mb-1 block text-sm font-medium text-slate-700">Check-Out</label>' +
    '<input type="date" id="bookingCheckOut" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></div>' +
    "</div>" +
    '<div><label class="mb-1 block text-sm font-medium text-slate-700">Status</label>' +
    '<select id="bookingStatus" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">' +
    '<option value="Active">Active</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option></select></div>' +
    '<p id="bookingError" class="hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"></p>' +
    '<p class="rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-700">After saving, you will be taken to Payments to record this booking\u2019s payment.</p>' +
    '<div class="flex justify-end gap-3 pt-1">' +
    '<button type="button" id="bookingModalCancelButton" class="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">Cancel</button>' +
    '<button type="submit" class="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Save & Continue to Payment</button>' +
    "</div>" +
    "</form>" +
    "</div>" +
    "</div>"
  );
}

function populateSelectOptions() {
  const customers = Database.getCustomers();
  const rooms = Database.getRooms();

  const customerSelect = document.getElementById("bookingCustomer");
  const roomSelect = document.getElementById("bookingRoom");

  customerSelect.innerHTML =
    '<option value="">Select customer...</option>' +
    customers
      .map(function (customer) {
        return '<option value="' + customer.id + '">' + customer.name + "</option>";
      })
      .join("");

  roomSelect.innerHTML =
    '<option value="">Select room...</option>' +
    rooms
      .map(function (room) {
        return (
          '<option value="' + room.id + '">Room ' + room.number + " (" + room.type + ") - " + room.status + "</option>"
        );
      })
      .join("");
}

function renderBookingsTable() {
  const bookings = Database.getBookings();
  let rows = "";

  if (bookings.length === 0) {
    rows =
      '<tr><td colspan="6" class="px-4 py-8 text-center text-sm text-slate-400">No bookings yet.</td></tr>';
  } else {
    rows = bookings
      .map(function (booking) {
        const customer = Database.getCustomerById(booking.customerId);
        const room = Database.getRoomById(booking.roomId);
        return (
          '<tr class="border-t border-slate-100">' +
          '<td class="px-4 py-3 text-sm font-medium text-slate-800">' + (customer ? customer.name : "Unknown") + "</td>" +
          '<td class="px-4 py-3 text-sm text-slate-700">' + (room ? room.number : "Unknown") + "</td>" +
          '<td class="px-4 py-3 text-sm text-slate-700">' + booking.checkIn + "</td>" +
          '<td class="px-4 py-3 text-sm text-slate-700">' + booking.checkOut + "</td>" +
          '<td class="px-4 py-3">' + statusBadge(booking.status) + "</td>" +
          '<td class="px-4 py-3 text-right">' +
          '<button data-pay="' + booking.id + '" class="mr-2 text-sm font-medium text-blue-600 hover:underline">Pay</button>' +
          '<button data-edit="' + booking.id + '" class="mr-2 text-sm font-medium text-teal-600 hover:underline">Edit</button>' +
          '<button data-delete="' + booking.id + '" class="text-sm font-medium text-red-600 hover:underline">Delete</button>' +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  document.getElementById("bookingsTableContainer").innerHTML =
    '<div class="overflow-x-auto"><table class="w-full min-w-[700px]">' +
    '<thead><tr class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">' +
    '<th class="px-4 py-3">Customer</th>' +
    '<th class="px-4 py-3">Room</th>' +
    '<th class="px-4 py-3">Check-In</th>' +
    '<th class="px-4 py-3">Check-Out</th>' +
    '<th class="px-4 py-3">Status</th>' +
    '<th class="px-4 py-3 text-right">Actions</th>' +
    "</tr></thead><tbody>" +
    rows +
    "</tbody></table></div>";

  document.querySelectorAll("[data-pay]").forEach(function (button) {
    button.addEventListener("click", function () {
      goToPayment(button.getAttribute("data-pay"));
    });
  });
  document.querySelectorAll("[data-edit]").forEach(function (button) {
    button.addEventListener("click", function () {
      openBookingModal(button.getAttribute("data-edit"));
    });
  });
  document.querySelectorAll("[data-delete]").forEach(function (button) {
    button.addEventListener("click", function () {
      deleteBooking(button.getAttribute("data-delete"));
    });
  });
}

function openBookingModal(bookingId) {
  // A booking needs both customers and rooms to exist first.
  if (Database.getCustomers().length === 0 || Database.getRooms().length === 0) {
    window.alert("Please add at least one customer and one room before creating a booking.");
    return;
  }

  editingBookingId = bookingId;
  populateSelectOptions();
  document.getElementById("bookingError").classList.add("hidden");

  const checkInInput = document.getElementById("bookingCheckIn");
  // Prevent picking past dates in the date picker as well.
  checkInInput.setAttribute("min", todayDateString());

  if (bookingId) {
    const booking = Database.getBookingById(bookingId);
    document.getElementById("bookingModalTitle").textContent = "Edit Booking";
    document.getElementById("bookingCustomer").value = booking.customerId;
    document.getElementById("bookingRoom").value = booking.roomId;
    checkInInput.value = booking.checkIn;
    document.getElementById("bookingCheckOut").value = booking.checkOut;
    document.getElementById("bookingStatus").value = booking.status;
  } else {
    document.getElementById("bookingModalTitle").textContent = "New Booking";
    document.getElementById("bookingCustomer").value = "";
    document.getElementById("bookingRoom").value = "";
    checkInInput.value = "";
    document.getElementById("bookingCheckOut").value = "";
    document.getElementById("bookingStatus").value = "Active";
  }

  const modal = document.getElementById("bookingModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeBookingModal() {
  const modal = document.getElementById("bookingModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  editingBookingId = null;
}

function saveBooking(event) {
  event.preventDefault();
  const errorElement = document.getElementById("bookingError");

  const customerId = document.getElementById("bookingCustomer").value;
  const roomId = document.getElementById("bookingRoom").value;
  const checkIn = document.getElementById("bookingCheckIn").value;
  const checkOut = document.getElementById("bookingCheckOut").value;
  const status = document.getElementById("bookingStatus").value;

  function showError(message) {
    errorElement.textContent = message;
    errorElement.classList.remove("hidden");
  }

  // Validation: all fields required.
  if (!customerId || !roomId || !checkIn || !checkOut) {
    showError("Please fill in all fields.");
    return;
  }

  // Validation: check-in cannot be in the past.
  if (checkIn < todayDateString()) {
    showError("Check-In date cannot be before today.");
    return;
  }

  // Validation: check-out must be strictly after check-in.
  if (checkOut <= checkIn) {
    showError("Check-Out date must be after the Check-In date.");
    return;
  }

  // Validation: a customer with an Active booking cannot start another Active one.
  if (status === "Active" && Database.customerHasActiveBooking(customerId, editingBookingId)) {
    showError("This customer already has an active booking and cannot book another room.");
    return;
  }

  const bookingData = {
    customerId: customerId,
    roomId: roomId,
    checkIn: checkIn,
    checkOut: checkOut,
    status: status,
  };

  let savedBookingId;
  if (editingBookingId) {
    Database.updateBooking(editingBookingId, bookingData);
    savedBookingId = editingBookingId;
  } else {
    const created = Database.addBooking(bookingData);
    savedBookingId = created.id;
  }

  // Logic: an Active booking marks the room as Booked.
  if (status === "Active") {
    Database.updateRoom(roomId, { status: "Booked" });
  }

  closeBookingModal();
  // Redirect to Payments with the booking pre-selected.
  goToPayment(savedBookingId);
}

function goToPayment(bookingId) {
  window.location.href = "payments.html?bookingId=" + encodeURIComponent(bookingId);
}

function deleteBooking(bookingId) {
  if (window.confirm("Delete this booking?")) {
    Database.deleteBooking(bookingId);
    renderBookingsTable();
  }
}

renderBookingsPage();
