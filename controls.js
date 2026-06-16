/**
 * controls.js
 * Smart room controls for booked rooms: lights, AC, and door lock.
 * All toggle states are persisted in localStorage.
 */

let selectedRoomId = null;

document.addEventListener('DOMContentLoaded', function () {
  requireAuthentication();
  renderSidebarNavigation('controls.html');
  setupMobileSidebarToggle();
  populateBookedRoomsDropdown();
  setupRoomSelection();
  setupControlToggles();
});

/**
 * Returns all rooms that currently have an Active booking.
 */
function getBookedRoomsWithActiveBooking() {
  const bookingsList = getAllBookings();
  const activeBookings = bookingsList.filter(function (booking) {
    return booking.status === 'Active';
  });

  const bookedRoomIds = activeBookings.map(function (booking) {
    return booking.roomId;
  });

  const roomsList = getAllRooms();
  return roomsList.filter(function (room) {
    return bookedRoomIds.includes(room.id);
  });
}

/**
 * Finds the active booking for a given room.
 */
function findActiveBookingForRoom(roomId) {
  const bookingsList = getAllBookings();
  return bookingsList.find(function (booking) {
    return booking.roomId === roomId && booking.status === 'Active';
  });
}

/**
 * Populates the room dropdown with only currently booked rooms.
 */
function populateBookedRoomsDropdown() {
  const roomSelect = document.getElementById('control-room-select');
  const noRoomsMessage = document.getElementById('no-booked-rooms-message');
  const bookedRooms = getBookedRoomsWithActiveBooking();

  roomSelect.innerHTML = '<option value="">Choose a booked room</option>';

  if (bookedRooms.length === 0) {
    noRoomsMessage.classList.remove('hidden');
    return;
  }

  noRoomsMessage.classList.add('hidden');

  bookedRooms.forEach(function (room) {
    const activeBooking = findActiveBookingForRoom(room.id);
    const customer = activeBooking ? findCustomerById(activeBooking.customerId) : null;
    const guestName = customer ? customer.name : 'Unknown Guest';

    roomSelect.innerHTML += `
      <option value="${room.id}">Room ${room.roomNumber} — ${guestName}</option>
    `;
  });
}

/**
 * Shows room info and control toggles when a room is selected.
 */
function setupRoomSelection() {
  const roomSelect = document.getElementById('control-room-select');

  roomSelect.addEventListener('change', function () {
    selectedRoomId = roomSelect.value;

    if (!selectedRoomId) {
      document.getElementById('room-info-panel').classList.add('hidden');
      document.getElementById('controls-panel').classList.add('hidden');
      return;
    }

    const room = findRoomById(selectedRoomId);
    const activeBooking = findActiveBookingForRoom(selectedRoomId);
    const customer = activeBooking ? findCustomerById(activeBooking.customerId) : null;

    document.getElementById('control-room-number').textContent = room ? room.roomNumber : '—';
    document.getElementById('control-room-type').textContent = room ? room.type : '—';
    document.getElementById('control-guest-name').textContent = customer ? customer.name : '—';

    document.getElementById('room-info-panel').classList.remove('hidden');
    document.getElementById('controls-panel').classList.remove('hidden');

    loadControlStates(selectedRoomId);
  });
}

/**
 * Loads saved control states from localStorage and updates the toggle UI.
 */
function loadControlStates(roomId) {
  const controlState = getRoomControlState(roomId);

  updateToggleUI('lights', controlState.lights);
  updateToggleUI('airConditioning', controlState.airConditioning);
  updateToggleUI('doorLock', controlState.doorLock);
}

/**
 * Updates a single toggle button to reflect its on/off state.
 */
function updateToggleUI(controlName, isOn) {
  const buttonMap = {
    lights: { button: 'toggle-lights-button', knob: 'lights-toggle-knob' },
    airConditioning: { button: 'toggle-ac-button', knob: 'ac-toggle-knob' },
    doorLock: { button: 'toggle-door-lock-button', knob: 'door-lock-toggle-knob' }
  };

  const elements = buttonMap[controlName];
  if (!elements) {
    return;
  }

  const toggleButton = document.getElementById(elements.button);
  const toggleKnob = document.getElementById(elements.knob);

  if (isOn) {
    toggleButton.classList.remove('bg-slate-300');
    toggleButton.classList.add('bg-indigo-600');
    toggleKnob.style.transform = 'translateX(20px)';
  } else {
    toggleButton.classList.add('bg-slate-300');
    toggleButton.classList.remove('bg-indigo-600');
    toggleKnob.style.transform = 'translateX(0)';
  }
}

/**
 * Sets up click handlers for all three control toggle buttons.
 */
function setupControlToggles() {
  document.getElementById('toggle-lights-button').addEventListener('click', function () {
    toggleControl('lights');
  });

  document.getElementById('toggle-ac-button').addEventListener('click', function () {
    toggleControl('airConditioning');
  });

  document.getElementById('toggle-door-lock-button').addEventListener('click', function () {
    toggleControl('doorLock');
  });
}

/**
 * Toggles a control on/off and saves the new state to localStorage.
 */
function toggleControl(controlName) {
  if (!selectedRoomId) {
    showAlertMessage('Please select a room first.', 'error');
    return;
  }

  const currentState = getRoomControlState(selectedRoomId);
  const newValue = !currentState[controlName];

  updateRoomControlState(selectedRoomId, controlName, newValue);
  updateToggleUI(controlName, newValue);

  const controlLabels = {
    lights: 'Lights',
    airConditioning: 'Air Conditioning',
    doorLock: 'Door Lock'
  };

  const statusText = newValue ? 'ON' : 'OFF';
  showAlertMessage(controlLabels[controlName] + ' turned ' + statusText + '.', 'success');
}
