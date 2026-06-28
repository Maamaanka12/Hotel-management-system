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