// /**
//  * rooms.js
//  * Logic for rooms.html (room CRUD).
//  *
//  * BUG FIXES vs the original rooms.js:
//  * 1. ES module loaded as a plain script -> import crashed the file.
//  *    Fixed: plain script using the global `API` object from api.js.
//  * 2. Every getElementById call used ids like 'room-form', 'rooms-table-body'
//  *    that don't exist; rooms.html actually uses 'roomModal', 'roomsTableBody',
//  *    'inputRoomNumber', etc. Fixed below to match the real HTML.
//  * 3. rooms.html drives the UI entirely with onclick="..." globals
//  *    (openAddModal, closeModal, handleSaveRoom, confirmDeleteRoom, ...),
//  *    none of which the old file defined. Fixed: those exact functions are
//  *    defined here.
//  * 4. The old file read/wrote rooms in localStorage. Rooms now live in
//  *    MSSQL via /api/rooms (GET/POST/PUT/DELETE), so every action below
//  *    calls the real API and re-renders from its response.
//  * 5. POST/PUT /api/rooms require a numeric roomTypeId (foreign key to the
//  *    ROOM_TYPE table), but there is no API to list ROOM_TYPE rows and the
//  *    HTML only offers a free-text type name. We build the
//  *    "name -> Room_Type_ID" map from whatever room types are already
//  *    visible in the joined GET /api/rooms response, since that's the only
//  *    source of truth the frontend has access to.
//  */

// let allRooms = [];
// let roomTypeIdByName = {};
// let editingRoomId = null;
// let deletingRoomId = null;

// document.addEventListener('DOMContentLoaded', function () {
//   requireAuthentication();
//   renderRoomsTable();
// });

// async function renderRoomsTable() {
//   const tableBody = document.getElementById('roomsTableBody');
//   const emptyState = document.getElementById('roomsEmptyState');
//   if (!tableBody) return;

//   try {
//     const result = await API.get('/rooms');
//     allRooms = result.data || [];
//     rebuildRoomTypeMap();
//     applyRoomSearchFilter();
//   } catch (error) {
//     console.error('Failed to load rooms:', error);
//     showAlertIn('modalAlert', error.message || 'Failed to load rooms.', 'error');
//   }

//   const searchInput = document.getElementById('roomSearchInput');
//   if (searchInput && !searchInput.dataset.bound) {
//     searchInput.dataset.bound = 'true';
//   }
// }

// // function rebuildRoomTypeMap() {
// //   roomTypeIdByName = {};
// //   allRooms.forEach((room) => {
// //     if (room.Room_Type && room.Room_Type_ID) {
// //       roomTypeIdByName[room.Room_Type] = room.Room_Type_ID;
// //     }
// //   });
// // }



// function applyRoomSearchFilter() {
//   const searchInput = document.getElementById('roomSearchInput');
//   const query = (searchInput ? searchInput.value : '').trim().toLowerCase();

//   const filtered = !query
//     ? allRooms
//     : allRooms.filter((room) => {
//         return (
//           String(room.Room_Number || '').toLowerCase().includes(query) ||
//           String(room.Room_Type || '').toLowerCase().includes(query)
//         );
//       });

//   renderRoomRows(filtered);
// }

// /** Called by oninput="handleSearch()" on the search box. */
// function handleSearch() {
//   applyRoomSearchFilter();
// }

// function renderRoomRows(rooms) {
//   const tableBody = document.getElementById('roomsTableBody');
//   const emptyState = document.getElementById('roomsEmptyState');
//   const countDisplay = document.getElementById('roomCountDisplay');

//   if (countDisplay) countDisplay.textContent = allRooms.length;

//   if (rooms.length === 0) {
//     tableBody.innerHTML = '';
//     if (emptyState) emptyState.classList.remove('hidden');
//     return;
//   }
//   if (emptyState) emptyState.classList.add('hidden');

//   tableBody.innerHTML = rooms
//     .map(
//       (room) => `
//       <tr class="table-row-hover" style="border-bottom: 1px solid rgba(255,255,255,0.04);">
//         <td class="px-5 py-3 text-slate-200 font-medium">${escapeHtml(room.Room_Number)}</td>
//         <td class="px-5 py-3 text-slate-300">${escapeHtml(room.Room_Type)}</td>
//         <td class="px-5 py-3 text-slate-300 hidden sm:table-cell">$${Number(room.Price).toFixed(2)}</td>
//         <td class="px-5 py-3">${roomStatusBadge(room.Status)}</td>
//         <td class="px-5 py-3 text-right space-x-2">
//           <button onclick="openEditModal(${room.Room_ID})" class="text-slate-400 hover:text-gold text-xs font-medium">Edit</button>
//           <button onclick="openDeleteModal(${room.Room_ID})" class="text-slate-400 hover:text-red-400 text-xs font-medium">Delete</button>
//         </td>
//       </tr>
//     `
//     )
//     .join('');
// }

// function roomStatusBadge(status) {
//   const colors = {
//     Available: 'bg-emerald-500/15 text-emerald-400',
//     Booked: 'bg-blue-500/15 text-blue-400',
//     Maintenance: 'bg-amber-500/15 text-amber-400'
//   };
//   const classes = colors[status] || 'bg-slate-500/15 text-slate-400';
//   return `<span class="px-2 py-1 rounded-full text-xs font-medium ${classes}">${escapeHtml(status || '—')}</span>`;
// }

// /** Called by onclick="openAddModal()" on the "Add Room" header button. */
// function openAddModal() {
//   editingRoomId = null;
//   document.getElementById('modalTitle').textContent = 'Add Room';
//   document.getElementById('inputRoomNumber').value = '';
//   document.getElementById('inputRoomType').value = '';
//   document.getElementById('inputRoomPrice').value = '';
//   document.getElementById('inputRoomStatus').value = 'Available';
//   hideAlertIn('modalAlert');
//   document.getElementById('roomModal').classList.add('open');
// }

// /** Called by onclick="openEditModal(roomId)" on each row's Edit button. */
// function openEditModal(roomId) {
//   const room = allRooms.find((r) => r.Room_ID === roomId);
//   if (!room) return;

//   editingRoomId = roomId;
//   document.getElementById('modalTitle').textContent = 'Edit Room';
//   document.getElementById('inputRoomNumber').value = room.Room_Number;
//   document.getElementById('inputRoomType').value = room.Room_Type;
//   document.getElementById('inputRoomPrice').value = room.Price;
//   document.getElementById('inputRoomStatus').value = room.Status;
//   hideAlertIn('modalAlert');
//   document.getElementById('roomModal').classList.add('open');
// }

// /** Called by onclick="closeModal()" and the modal backdrop click. */
// function closeModal() {
//   document.getElementById('roomModal').classList.remove('open');
// }

// function handleModalBackdropClick(event) {
//   if (event.target.id === 'roomModal') closeModal();
// }

// /** Called by onclick="handleSaveRoom()" on the modal's Save button. */
// async function handleSaveRoom() {
//   const roomNumber = document.getElementById('inputRoomNumber').value.trim();
//   const roomType = document.getElementById('inputRoomType').value;
//   const price = Number(document.getElementById('inputRoomPrice').value);
//   const status = document.getElementById('inputRoomStatus').value;

//   if (!roomNumber || !roomType || !price) {
//     showAlertIn('modalAlert', 'Please fill in all required fields.', 'error');
//     return;
//   }

//   // const roomTypeId = roomTypeIdByName[roomType];
//   // if (!roomTypeId) {
//   //   showAlertIn(
//   //     'modalAlert',
//   //     `No existing room uses the "${roomType}" type yet, so its database ID is unknown. ` +
//   //       `Pick a type already used by another room, or add the "${roomType}" type in ROOM_TYPE first.`,
//   //     'error'
//   //   );
//   //   return;
//   // }

//   let roomTypeId = roomTypeIdByName[roomType];

// if (!roomTypeId) {
//   const fallbackTypes = {
//     Single: 1,
//     Double: 2,
//     Suite: 3,
//     Deluxe: 4,
//     Family: 5
//   };

//   roomTypeId = fallbackTypes[roomType];
// }

// if (!roomTypeId) {
//   showAlertIn(
//     'modalAlert',
//     `Unknown room type: ${roomType}`,
//     'error'
//   );
//   return;
// }

//   const payload = { roomNumber, price, status, roomTypeId };

//   try {
//     if (editingRoomId) {
//       await API.put(`/rooms/${editingRoomId}`, payload);
//     } else {
//       await API.post('/rooms', payload);
//     }
//     closeModal();
//     renderRoomsTable();
//   } catch (error) {
//     showAlertIn('modalAlert', error.message || 'Failed to save room.', 'error');
//   }
// }

// /** Called by onclick="openDeleteModal(roomId)" on each row's Delete button. */
// function openDeleteModal(roomId) {
//   deletingRoomId = roomId;
//   const room = allRooms.find((r) => r.Room_ID === roomId);
//   document.getElementById('deleteRoomLabel').textContent = room ? `Room ${room.Room_Number}` : 'this room';
//   document.getElementById('deleteModal').classList.add('open');
// }

// function closeDeleteModal() {
//   deletingRoomId = null;
//   document.getElementById('deleteModal').classList.remove('open');
// }

// function handleDeleteBackdropClick(event) {
//   if (event.target.id === 'deleteModal') closeDeleteModal();
// }

// /** Called by onclick="confirmDeleteRoom()" on the delete confirmation modal. */
// async function confirmDeleteRoom() {
//   if (!deletingRoomId) return;
//   try {
//     await API.delete(`/rooms/${deletingRoomId}`);
//     closeDeleteModal();
//     renderRoomsTable();
//   } catch (error) {
//     closeDeleteModal();
//     console.error('Failed to delete room:', error);
//   }
// }

// function escapeHtml(value) {
//   if (value === null || value === undefined) return '';
//   return String(value)
//     .replace(/&/g, '&amp;')
//     .replace(/</g, '&lt;')
//     .replace(/>/g, '&gt;');
// }
//------------------------------------------------------------------------------------------
/**
 * rooms.js
 * Logic for rooms.html (room CRUD).
 */

let allRooms = [];
let roomTypeIdByName = {};
let editingRoomId = null;
let deletingRoomId = null;

// Status_ID values from ROOM_STATUS table
const ROOM_STATUS_LABELS = {
  1: 'Available',
  2: 'Occupied',
  3: 'Maintenance'
};

document.addEventListener('DOMContentLoaded', function () {
  requireAuthentication();
  renderRoomsTable();
});

async function renderRoomsTable() {
  const tableBody = document.getElementById('roomsTableBody');
  if (!tableBody) return;

  try {
    const result = await API.get('/rooms');
    allRooms = result.data || [];
    rebuildRoomTypeMap();
    applyRoomSearchFilter();
  } catch (error) {
    console.error('Failed to load rooms:', error);
    showAlertIn('modalAlert', error.message || 'Failed to load rooms.', 'error');
  }

  const searchInput = document.getElementById('roomSearchInput');
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = 'true';
  }
}

function rebuildRoomTypeMap() {
  roomTypeIdByName = {};
  allRooms.forEach((room) => {
    if (room.Room_Type && room.Room_Type_ID) {
      roomTypeIdByName[room.Room_Type] = room.Room_Type_ID;
    }
  });
}

function applyRoomSearchFilter() {
  const searchInput = document.getElementById('roomSearchInput');
  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();

  const filtered = !query
    ? allRooms
    : allRooms.filter((room) => {
        return (
          String(room.Room_Number || '').toLowerCase().includes(query) ||
          String(room.Room_Type || '').toLowerCase().includes(query)
        );
      });

  renderRoomRows(filtered);
}

function handleSearch() {
  applyRoomSearchFilter();
}

function getRoomStatusLabel(room) {
  // Backend returns Status_ID (int)
  return ROOM_STATUS_LABELS[room.Status_ID] || String(room.Status_ID || '—');
}

function renderRoomRows(rooms) {
  const tableBody = document.getElementById('roomsTableBody');
  const emptyState = document.getElementById('roomsEmptyState');
  const countDisplay = document.getElementById('roomCountDisplay');

  if (countDisplay) countDisplay.textContent = allRooms.length;

  if (rooms.length === 0) {
    tableBody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');

  tableBody.innerHTML = rooms
    .map(
      (room) => `
      <tr class="table-row-hover" style="border-bottom: 1px solid rgba(255,255,255,0.04);">
        <td class="px-5 py-3 text-slate-200 font-medium">${escapeHtml(room.Room_Number)}</td>
        <td class="px-5 py-3 text-slate-300">${escapeHtml(room.Room_Type)}</td>
        <td class="px-5 py-3 text-slate-300 hidden sm:table-cell">$${Number(room.Price_Per_Night).toFixed(2)}</td>
        <td class="px-5 py-3">${roomStatusBadge(getRoomStatusLabel(room))}</td>
        <td class="px-5 py-3 text-right space-x-2">
          <button onclick="openEditModal(${room.Room_ID})" class="text-slate-400 hover:text-gold text-xs font-medium">Edit</button>
          <button onclick="openDeleteModal(${room.Room_ID})" class="text-slate-400 hover:text-red-400 text-xs font-medium">Delete</button>
        </td>
      </tr>
    `
    )
    .join('');
}

function roomStatusBadge(statusLabel) {
  const colors = {
    Available: 'bg-emerald-500/15 text-emerald-400',
    Occupied: 'bg-blue-500/15 text-blue-400',
    Maintenance: 'bg-amber-500/15 text-amber-400'
  };
  const classes = colors[statusLabel] || 'bg-slate-500/15 text-slate-400';
  return `<span class="px-2 py-1 rounded-full text-xs font-medium ${classes}">${escapeHtml(statusLabel)}</span>`;
}

function openAddModal() {
  editingRoomId = null;
  document.getElementById('modalTitle').textContent = 'Add Room';
  document.getElementById('inputRoomNumber').value = '';
  document.getElementById('inputRoomType').value = '';
  document.getElementById('inputRoomPrice').value = '';
  document.getElementById('inputRoomStatus').value = 'Available';
  hideAlertIn('modalAlert');
  document.getElementById('roomModal').classList.add('open');
}

function openEditModal(roomId) {
  const room = allRooms.find((r) => r.Room_ID === roomId);
  if (!room) return;

  editingRoomId = roomId;
  document.getElementById('modalTitle').textContent = 'Edit Room';
  document.getElementById('inputRoomNumber').value = room.Room_Number;
  document.getElementById('inputRoomType').value = room.Room_Type;
  // Use Price_Per_Night not Price
  document.getElementById('inputRoomPrice').value = room.Price_Per_Night;
  document.getElementById('inputRoomStatus').value = getRoomStatusLabel(room);
  hideAlertIn('modalAlert');
  document.getElementById('roomModal').classList.add('open');
}

function closeModal() {
  document.getElementById('roomModal').classList.remove('open');
}

function handleModalBackdropClick(event) {
  if (event.target.id === 'roomModal') closeModal();
}

async function handleSaveRoom() {
  const roomNumber = document.getElementById('inputRoomNumber').value.trim();
  const roomType = document.getElementById('inputRoomType').value;
  const price = Number(document.getElementById('inputRoomPrice').value);
  const status = document.getElementById('inputRoomStatus').value;

  if (!roomNumber || !roomType || !price) {
    showAlertIn('modalAlert', 'Please fill in all required fields.', 'error');
    return;
  }

  // Try map built from existing rooms first, fall back to known defaults
  let roomTypeId = roomTypeIdByName[roomType];

  if (!roomTypeId) {

    const fallbackTypes = {
      Single:     1,
      Double:     2,
      Twin:       3,   // was missing
      Suite:      4,
      Deluxe:     5,
      Penthouse:  6,   // was missing
      Family:     7
}
    roomTypeId = fallbackTypes[roomType];
  }

  if (!roomTypeId) {
    showAlertIn('modalAlert', `Unknown room type: ${roomType}`, 'error');
    return;
  }

  const payload = { roomNumber, price, status, roomTypeId };

  try {
    if (editingRoomId) {
      await API.put(`/rooms/${editingRoomId}`, payload);
    } else {
      await API.post('/rooms', payload);
    }
    closeModal();
    renderRoomsTable();
  } catch (error) {
    showAlertIn('modalAlert', error.message || 'Failed to save room.', 'error');
  }
}

function openDeleteModal(roomId) {
  deletingRoomId = roomId;
  const room = allRooms.find((r) => r.Room_ID === roomId);
  document.getElementById('deleteRoomLabel').textContent = room ? `Room ${room.Room_Number}` : 'this room';
  document.getElementById('deleteModal').classList.add('open');
}

function closeDeleteModal() {
  deletingRoomId = null;
  document.getElementById('deleteModal').classList.remove('open');
}

function handleDeleteBackdropClick(event) {
  if (event.target.id === 'deleteModal') closeDeleteModal();
}

async function confirmDeleteRoom() {
  if (!deletingRoomId) return;
  try {
    await API.delete(`/rooms/${deletingRoomId}`);
    closeDeleteModal();
    renderRoomsTable();
  } catch (error) {
    closeDeleteModal();
    console.error('Failed to delete room:', error);
  }
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}