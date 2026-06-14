/*
 * dashboard.js
 * Builds the layout, then renders live statistics and the 5 most recent bookings.
 */

buildLayout();

function renderDashboard() {
  const rooms = Database.getRooms();
  const customers = Database.getCustomers();
  const bookings = Database.getBookings();

  const totalRooms = rooms.length;
  const availableRooms = rooms.filter(function (room) {
    return room.status === "Available";
  }).length;
  const bookedRooms = rooms.filter(function (room) {
    return room.status === "Booked";
  }).length;
  const totalCustomers = customers.length;

  const statCards = [
    { label: "Total Rooms", value: totalRooms, color: "bg-teal-600" },
    { label: "Available", value: availableRooms, color: "bg-green-600" },
    { label: "Booked", value: bookedRooms, color: "bg-blue-600" },
    { label: "Total Customers", value: totalCustomers, color: "bg-slate-700" },
  ];

  const statCardsMarkup = statCards
    .map(function (card) {
      return (
        '<div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">' +
        '<div class="mb-3 h-2 w-10 rounded-full ' +
        card.color +
        '"></div>' +
        '<p class="text-2xl font-bold text-slate-900">' +
        card.value +
        "</p>" +
        '<p class="text-sm font-medium text-slate-500">' +
        card.label +
        "</p>" +
        "</div>"
      );
    })
    .join("");

  // Most recent 5 bookings (newest first by id).
  const recentBookings = bookings
    .slice()
    .sort(function (firstBooking, secondBooking) {
      return Number(secondBooking.id) - Number(firstBooking.id);
    })
    .slice(0, 5);

  let recentRows = "";
  if (recentBookings.length === 0) {
    recentRows =
      '<tr><td colspan="5" class="px-4 py-8 text-center text-sm text-slate-400">No bookings yet.</td></tr>';
  } else {
    recentRows = recentBookings
      .map(function (booking) {
        const customer = Database.getCustomerById(booking.customerId);
        const room = Database.getRoomById(booking.roomId);
        return (
          '<tr class="border-t border-slate-100">' +
          '<td class="px-4 py-3 text-sm text-slate-700">' +
          (customer ? customer.name : "Unknown") +
          "</td>" +
          '<td class="px-4 py-3 text-sm text-slate-700">' +
          (room ? room.number : "Unknown") +
          "</td>" +
          '<td class="px-4 py-3 text-sm text-slate-700">' +
          booking.checkIn +
          "</td>" +
          '<td class="px-4 py-3 text-sm text-slate-700">' +
          booking.checkOut +
          "</td>" +
          '<td class="px-4 py-3">' +
          statusBadge(booking.status) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  const content =
    '<div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">' +
    statCardsMarkup +
    "</div>" +
    '<div class="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">' +
    '<div class="border-b border-slate-100 px-5 py-4">' +
    '<h2 class="text-base font-semibold text-slate-900">Recent Bookings</h2>' +
    "</div>" +
    '<div class="overflow-x-auto">' +
    '<table class="w-full min-w-[600px]">' +
    '<thead><tr class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">' +
    '<th class="px-4 py-3">Customer</th>' +
    '<th class="px-4 py-3">Room</th>' +
    '<th class="px-4 py-3">Check-In</th>' +
    '<th class="px-4 py-3">Check-Out</th>' +
    '<th class="px-4 py-3">Status</th>' +
    "</tr></thead>" +
    "<tbody>" +
    recentRows +
    "</tbody>" +
    "</table>" +
    "</div>" +
    "</div>";

  document.getElementById("pageContent").innerHTML = content;
}

renderDashboard();
