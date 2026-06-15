/**
 * rooms.js
 * Full CRUD operations for hotel rooms.
 */

document.addEventListener('DOMContentLoaded', function () {
  requireAuthentication();
  renderSidebarNavigation('rooms.html');
  setupMobileSidebarToggle();
  setupRoomModal();
  setupRoomForm();
  renderRoomsTable();
});

/**
 * Opens and closes the add/edit room modal dialog.
 */
function setupRoomModal() {
  const modalElement = document.getElementById('room-modal');
  const openButton = document.getElementById('open-add-room-button');
  const closeButton = document.getElementById('close-room-modal-button');

  openButton.addEventListener('click', function () {
    openRoomModal(null);
  });

  closeButton.addEventListener('click', function () {
    closeRoomModal();
  });

  modalElement.addEventListener('click', function (event) {
    if (event.target === modalElement) {
      closeRoomModal();
    }
  });
}

/**
 * Opens the modal for adding a new room or editing an existing one.
 */
function openRoomModal(roomId) {
  const modalElement = document.getElementById('room-modal');
  const modalTitle = document.getElementById('room-modal-title');
  const editIdField = document.getElementById('room-edit-id');
  const roomForm = document.getElementById('room-form');

  roomForm.reset();
  editIdField.value = '';

  if (roomId) {
    const room = findRoomById(roomId);
    if (room) {
      modalTitle.textContent = 'Edit Room';
      editIdField.value = room.id;
      document.getElementById('room-number').value = room.roomNumber;
      document.getElementById('room-type').value = room.type;
      document.getElementById('room-price').value = room.price;
      document.getElementById('room-status').value = room.status;
    }
  } else {
    modalTitle.textContent = 'Add Room';
    document.getElementById('room-status').value = 'Available';
  }

  modalElement.classList.remove('hidden');
  modalElement.classList.add('flex');
}

/**
 * Closes the room modal and resets the form.
 */
function closeRoomModal() {
  const modalElement = document.getElementById('room-modal');
  modalElement.classList.add('hidden');
  modalElement.classList.remove('flex');
  document.getElementById('room-form').reset();
  document.getElementById('room-edit-id').value = '';
}

/**
 * Handles form submission for creating or updating a room.
 */
function setupRoomForm() {
  const roomForm = document.getElementById('room-form');

  roomForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const editId = document.getElementById('room-edit-id').value;
    const roomNumber = document.getElementById('room-number').value.trim();
    const roomType = document.getElementById('room-type').value;
    const roomPrice = parseFloat(document.getElementById('room-price').value);
    const roomStatus = document.getElementById('room-status').value;

    if (!roomNumber || !roomType || !roomPrice || !roomStatus) {
      showAlertMessage('Please fill in all required fields.', 'error');
      return;
    }

    if (roomPrice <= 0) {
      showAlertMessage('Price must be greater than zero.', 'error');
      return;
    }

    const roomsList = getAllRooms();

    const duplicateRoom = roomsList.find(function (room) {
      if (editId && room.id === editId) {
        return false;
      }
      return room.roomNumber.toLowerCase() === roomNumber.toLowerCase();
    });

    if (duplicateRoom) {
      showAlertMessage('A room with this number already exists.', 'error');
      return;
    }

    if (editId) {
      const roomIndex = roomsList.findIndex(function (room) {
        return room.id === editId;
      });
      if (roomIndex !== -1) {
        roomsList[roomIndex] = {
          id: editId,
          roomNumber: roomNumber,
          type: roomType,
          price: roomPrice,
          status: roomStatus,
          updatedAt: new Date().toISOString()
        };
      }
      showAlertMessage('Room updated successfully.', 'success');
    } else {
      roomsList.push({
        id: generateUniqueId(),
        roomNumber: roomNumber,
        type: roomType,
        price: roomPrice,
        status: roomStatus,
        createdAt: new Date().toISOString()
      });
      showAlertMessage('Room added successfully.', 'success');
    }

    saveAllRooms(roomsList);
    closeRoomModal();
    renderRoomsTable();
  });
}

/**
 * Renders all rooms from localStorage into the table.
 */
function renderRoomsTable() {
  const roomsList = getAllRooms();
  const tableBody = document.getElementById('rooms-table-body');

  if (roomsList.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-8 text-center text-slate-400">No rooms added yet. Click "Add Room" to get started.</td>
      </tr>
    `;
    return;
  }

  let tableRowsHTML = '';
  roomsList.forEach(function (room) {
    const statusColor = getRoomStatusColor(room.status);

    tableRowsHTML += `
      <tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="px-6 py-4 font-medium text-slate-800">${room.roomNumber}</td>
        <td class="px-6 py-4 text-slate-600">${room.type}</td>
        <td class="px-6 py-4 text-slate-600">$${room.price.toFixed(2)}</td>
        <td class="px-6 py-4">
          <span class="rounded-full px-3 py-1 text-xs font-semibold ${statusColor}">${room.status}</span>
        </td>
        <td class="px-6 py-4 text-right">
          <button onclick="openRoomModal('${room.id}')"
                  class="mr-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
            Edit
          </button>
          <button onclick="deleteRoom('${room.id}')"
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
 * Deletes a room after confirming no active bookings exist for it.
 */
function deleteRoom(roomId) {
  if (roomHasActiveBooking(roomId, null)) {
    showAlertMessage('Cannot delete a room with an active booking.', 'error');
    return;
  }

  if (!confirm('Are you sure you want to delete this room?')) {
    return;
  }

  const roomsList = getAllRooms().filter(function (room) {
    return room.id !== roomId;
  });

  saveAllRooms(roomsList);
  showAlertMessage('Room deleted successfully.', 'success');
  renderRoomsTable();
}

/**
 * Returns Tailwind CSS classes for room status badge colors.
 */
function getRoomStatusColor(status) {
  const colorMap = {
    Available: 'bg-green-100 text-green-700',
    Booked: 'bg-indigo-100 text-indigo-700',
    Maintenance: 'bg-orange-100 text-orange-700'
  };
  return colorMap[status] || 'bg-slate-100 text-slate-700';
}
