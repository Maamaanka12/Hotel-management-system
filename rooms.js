/*
 * rooms.js
 * CRUD for rooms: Number, Type, Price, Status (Available, Booked, Maintenance).
 */

buildLayout();

let editingRoomId = null;

function renderRoomsPage() {
  const content =
    '<div class="mb-5 flex items-center justify-between">' +
    '<p class="text-sm text-slate-500">Manage all hotel rooms</p>' +
    '<button id="addRoomButton" class="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700">+ Add Room</button>' +
    "</div>" +
    '<div id="roomsTableContainer" class="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"></div>' +
    buildModalShell();

  document.getElementById("pageContent").innerHTML = content;

  document.getElementById("addRoomButton").addEventListener("click", function () {
    openRoomModal(null);
  });
  document.getElementById("modalCloseButton").addEventListener("click", closeRoomModal);
  document.getElementById("modalCancelButton").addEventListener("click", closeRoomModal);
  document.getElementById("roomForm").addEventListener("submit", saveRoom);

  renderRoomsTable();
}

function buildModalShell() {
  return (
    '<div id="roomModal" class="fixed inset-0 z-40 hidden items-center justify-center bg-black/40 p-4">' +
    '<div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">' +
    '<div class="mb-4 flex items-center justify-between">' +
    '<h2 id="modalTitle" class="text-lg font-semibold text-slate-900">Add Room</h2>' +
    '<button id="modalCloseButton" class="text-slate-400 hover:text-slate-600">&times;</button>' +
    "</div>" +
    '<form id="roomForm" class="space-y-4">' +
    fieldText("roomNumber", "Room Number", "e.g. 101") +
    selectField("roomType", "Type", ["Single", "Double", "Suite", "Deluxe"]) +
    fieldNumber("roomPrice", "Price per Night", "e.g. 120") +
    selectField("roomStatus", "Status", ["Available", "Booked", "Maintenance"]) +
    '<p id="roomError" class="hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"></p>' +
    '<div class="flex justify-end gap-3 pt-2">' +
    '<button type="button" id="modalCancelButton" class="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">Cancel</button>' +
    '<button type="submit" class="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Save</button>' +
    "</div>" +
    "</form>" +
    "</div>" +
    "</div>"
  );
}

function fieldText(id, label, placeholder) {
  return (
    '<div><label class="mb-1 block text-sm font-medium text-slate-700">' +
    label +
    '</label><input type="text" id="' +
    id +
    '" placeholder="' +
    placeholder +
    '" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></div>'
  );
}

function fieldNumber(id, label, placeholder) {
  return (
    '<div><label class="mb-1 block text-sm font-medium text-slate-700">' +
    label +
    '</label><input type="number" min="0" step="0.01" id="' +
    id +
    '" placeholder="' +
    placeholder +
    '" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></div>'
  );
}

function selectField(id, label, options) {
  const optionsMarkup = options
    .map(function (option) {
      return '<option value="' + option + '">' + option + "</option>";
    })
    .join("");
  return (
    '<div><label class="mb-1 block text-sm font-medium text-slate-700">' +
    label +
    '</label><select id="' +
    id +
    '" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">' +
    optionsMarkup +
    "</select></div>"
  );
}

function renderRoomsTable() {
  const rooms = Database.getRooms();
  let rows = "";

  if (rooms.length === 0) {
    rows =
      '<tr><td colspan="5" class="px-4 py-8 text-center text-sm text-slate-400">No rooms added yet.</td></tr>';
  } else {
    rows = rooms
      .map(function (room) {
        return (
          '<tr class="border-t border-slate-100">' +
          '<td class="px-4 py-3 text-sm font-medium text-slate-800">' + room.number + "</td>" +
          '<td class="px-4 py-3 text-sm text-slate-700">' + room.type + "</td>" +
          '<td class="px-4 py-3 text-sm text-slate-700">' + formatMoney(room.price) + "</td>" +
          '<td class="px-4 py-3">' + statusBadge(room.status) + "</td>" +
          '<td class="px-4 py-3 text-right">' +
          '<button data-edit="' + room.id + '" class="mr-2 text-sm font-medium text-teal-600 hover:underline">Edit</button>' +
          '<button data-delete="' + room.id + '" class="text-sm font-medium text-red-600 hover:underline">Delete</button>' +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  document.getElementById("roomsTableContainer").innerHTML =
    '<div class="overflow-x-auto"><table class="w-full min-w-[600px]">' +
    '<thead><tr class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">' +
    '<th class="px-4 py-3">Room No.</th>' +
    '<th class="px-4 py-3">Type</th>' +
    '<th class="px-4 py-3">Price</th>' +
    '<th class="px-4 py-3">Status</th>' +
    '<th class="px-4 py-3 text-right">Actions</th>' +
    "</tr></thead><tbody>" +
    rows +
    "</tbody></table></div>";

  document.querySelectorAll("[data-edit]").forEach(function (button) {
    button.addEventListener("click", function () {
      openRoomModal(button.getAttribute("data-edit"));
    });
  });
  document.querySelectorAll("[data-delete]").forEach(function (button) {
    button.addEventListener("click", function () {
      deleteRoom(button.getAttribute("data-delete"));
    });
  });
}

function openRoomModal(roomId) {
  editingRoomId = roomId;
  const modal = document.getElementById("roomModal");
  const errorElement = document.getElementById("roomError");
  errorElement.classList.add("hidden");

  if (roomId) {
    const room = Database.getRoomById(roomId);
    document.getElementById("modalTitle").textContent = "Edit Room";
    document.getElementById("roomNumber").value = room.number;
    document.getElementById("roomType").value = room.type;
    document.getElementById("roomPrice").value = room.price;
    document.getElementById("roomStatus").value = room.status;
  } else {
    document.getElementById("modalTitle").textContent = "Add Room";
    document.getElementById("roomNumber").value = "";
    document.getElementById("roomType").value = "Single";
    document.getElementById("roomPrice").value = "";
    document.getElementById("roomStatus").value = "Available";
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeRoomModal() {
  const modal = document.getElementById("roomModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  editingRoomId = null;
}

function saveRoom(event) {
  event.preventDefault();
  const errorElement = document.getElementById("roomError");

  const number = document.getElementById("roomNumber").value.trim();
  const type = document.getElementById("roomType").value;
  const price = document.getElementById("roomPrice").value;
  const status = document.getElementById("roomStatus").value;

  if (!number || !price) {
    errorElement.textContent = "Please fill in the room number and price.";
    errorElement.classList.remove("hidden");
    return;
  }

  // Prevent duplicate room numbers.
  const duplicate = Database.getRooms().find(function (room) {
    return room.number.toLowerCase() === number.toLowerCase() && room.id !== editingRoomId;
  });
  if (duplicate) {
    errorElement.textContent = "A room with this number already exists.";
    errorElement.classList.remove("hidden");
    return;
  }

  const roomData = { number: number, type: type, price: Number(price), status: status };

  if (editingRoomId) {
    Database.updateRoom(editingRoomId, roomData);
  } else {
    Database.addRoom(roomData);
  }

  closeRoomModal();
  renderRoomsTable();
}

function deleteRoom(roomId) {
  if (window.confirm("Delete this room?")) {
    Database.deleteRoom(roomId);
    renderRoomsTable();
  }
}

renderRoomsPage();
