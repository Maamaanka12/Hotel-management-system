/**
 * database.js
 * Central localStorage handler for the Hotel Management System.
 * All pages read and write data through these reusable functions.
 */

const STORAGE_KEYS = {
  users: 'hotel_users',
  currentUser: 'hotel_current_user',
  rooms: 'hotel_rooms',
  customers: 'hotel_customers',
  bookings: 'hotel_bookings',
  payments: 'hotel_payments',
  roomControls: 'hotel_room_controls'
};

/**
 * Reads a collection array from localStorage.
 * Returns an empty array if nothing is stored yet.
 */
function getCollection(storageKey) {
  const rawData = localStorage.getItem(storageKey);
  if (!rawData) {
    return [];
  }
  try {
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Failed to parse localStorage data for:', storageKey, error);
    return [];
  }
}

/**
 * Saves an entire collection array to localStorage.
 */
function saveCollection(storageKey, collectionData) {
  localStorage.setItem(storageKey, JSON.stringify(collectionData));
}

/**
 * Generates a unique identifier for new records.
 */
function generateUniqueId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

/**
 * Returns today's date as YYYY-MM-DD (local timezone).
 * Used for booking date validation.
 */
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/* ─── Users (Staff Authentication) ─── */

function getAllUsers() {
  return getCollection(STORAGE_KEYS.users);
}

function saveAllUsers(usersList) {
  saveCollection(STORAGE_KEYS.users, usersList);
}

function findUserByEmail(emailAddress) {
  const usersList = getAllUsers();
  return usersList.find(function (user) {
    return user.email.toLowerCase() === emailAddress.toLowerCase();
  });
}

function registerNewUser(userData) {
  const usersList = getAllUsers();
  usersList.push(userData);
  saveAllUsers(usersList);
}

/* ─── Current Session ─── */

function getCurrentUser() {
  const rawData = localStorage.getItem(STORAGE_KEYS.currentUser);
  if (!rawData) {
    return null;
  }
  try {
    return JSON.parse(rawData);
  } catch (error) {
    return null;
  }
}

function setCurrentUser(userData) {
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(userData));
}

function clearCurrentUser() {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
}

/**
 * Redirects to login if no staff user is signed in.
 * Call this at the top of every protected page script.
 */
function requireAuthentication() {
  if (!getCurrentUser()) {
    window.location.href = 'index.html';
  }
}

/* ─── Rooms ─── */

function getAllRooms() {
  return getCollection(STORAGE_KEYS.rooms);
}

function saveAllRooms(roomsList) {
  saveCollection(STORAGE_KEYS.rooms, roomsList);
}

function findRoomById(roomId) {
  return getAllRooms().find(function (room) {
    return room.id === roomId;
  });
}

function updateRoomStatus(roomId, newStatus) {
  const roomsList = getAllRooms();
  const roomIndex = roomsList.findIndex(function (room) {
    return room.id === roomId;
  });
  if (roomIndex !== -1) {
    roomsList[roomIndex].status = newStatus;
    saveAllRooms(roomsList);
  }
}

/* ─── Customers ─── */

function getAllCustomers() {
  return getCollection(STORAGE_KEYS.customers);
}

function saveAllCustomers(customersList) {
  saveCollection(STORAGE_KEYS.customers, customersList);
}

function findCustomerById(customerId) {
  return getAllCustomers().find(function (customer) {
    return customer.id === customerId;
  });
}

function updateCustomerFaceEnrolled(customerId, isEnrolled) {
  const customersList = getAllCustomers();
  const customerIndex = customersList.findIndex(function (customer) {
    return customer.id === customerId;
  });
  if (customerIndex !== -1) {
    customersList[customerIndex].faceEnrolled = isEnrolled;
    saveAllCustomers(customersList);
  }
}

/* ─── Bookings ─── */

function getAllBookings() {
  return getCollection(STORAGE_KEYS.bookings);
}

function saveAllBookings(bookingsList) {
  saveCollection(STORAGE_KEYS.bookings, bookingsList);
}

function findBookingById(bookingId) {
  return getAllBookings().find(function (booking) {
    return booking.id === bookingId;
  });
}

/**
 * Returns true if the customer already has an Active booking
 * (optionally excluding one booking when editing).
 */
function customerHasActiveBooking(customerId, excludeBookingId) {
  const bookingsList = getAllBookings();
  return bookingsList.some(function (booking) {
    if (excludeBookingId && booking.id === excludeBookingId) {
      return false;
    }
    return booking.customerId === customerId && booking.status === 'Active';
  });
}

/**
 * Returns true if the room already has an Active booking
 * (optionally excluding one booking when editing).
 */
function roomHasActiveBooking(roomId, excludeBookingId) {
  const bookingsList = getAllBookings();
  return bookingsList.some(function (booking) {
    if (excludeBookingId && booking.id === excludeBookingId) {
      return false;
    }
    return booking.roomId === roomId && booking.status === 'Active';
  });
}

/**
 * When a booking becomes Active, mark the room as Booked.
 * When a booking is no longer Active, set room back to Available
 * if no other Active booking exists for that room.
 */
function syncRoomStatusWithBookings(roomId) {
  const hasActive = roomHasActiveBooking(roomId, null);
  if (hasActive) {
    updateRoomStatus(roomId, 'Booked');
  } else {
    const room = findRoomById(roomId);
    if (room && room.status === 'Booked') {
      updateRoomStatus(roomId, 'Available');
    }
  }
}

/* ─── Payments ─── */

function getAllPayments() {
  return getCollection(STORAGE_KEYS.payments);
}

function saveAllPayments(paymentsList) {
  saveCollection(STORAGE_KEYS.payments, paymentsList);
}

/**
 * Returns true if this customer already has a payment recorded
 * for the same room (prevents paying twice for the same room).
 */
function customerAlreadyPaidForRoom(customerId, roomId, excludePaymentId) {
  const paymentsList = getAllPayments();
  return paymentsList.some(function (payment) {
    if (excludePaymentId && payment.id === excludePaymentId) {
      return false;
    }
    return payment.customerId === customerId && payment.roomId === roomId;
  });
}

/**
 * Returns true if a payment already exists for this booking reference.
 */
function paymentExistsForBooking(bookingId, excludePaymentId) {
  const paymentsList = getAllPayments();
  return paymentsList.some(function (payment) {
    if (excludePaymentId && payment.id === excludePaymentId) {
      return false;
    }
    return payment.bookingId === bookingId;
  });
}

/* ─── Room Controls (Smart Features) ─── */

function getAllRoomControls() {
  const rawData = localStorage.getItem(STORAGE_KEYS.roomControls);
  if (!rawData) {
    return {};
  }
  try {
    return JSON.parse(rawData);
  } catch (error) {
    return {};
  }
}

function saveAllRoomControls(controlsData) {
  localStorage.setItem(STORAGE_KEYS.roomControls, JSON.stringify(controlsData));
}

function getRoomControlState(roomId) {
  const allControls = getAllRoomControls();
  if (allControls[roomId]) {
    return allControls[roomId];
  }
  return {
    lights: false,
    airConditioning: false,
    doorLock: true
  };
}

function updateRoomControlState(roomId, controlName, controlValue) {
  const allControls = getAllRoomControls();
  if (!allControls[roomId]) {
    allControls[roomId] = {
      lights: false,
      airConditioning: false,
      doorLock: true
    };
  }
  allControls[roomId][controlName] = controlValue;
  saveAllRoomControls(allControls);
}
