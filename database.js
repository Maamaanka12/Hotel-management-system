/*
 * database.js
 * Reusable localStorage data layer for the Hotel Management System.
 * Every page includes this file. It exposes a single global "Database"
 * object with helpers for each collection (users, rooms, customers,
 * bookings, payments, roomControls).
 */

const Database = {
  /* ---------- Low level helpers ---------- */

  read(collectionName) {
    const rawValue = localStorage.getItem(collectionName);
    if (!rawValue) {
      return [];
    }
    try {
      return JSON.parse(rawValue);
    } catch (error) {
      console.log("[v0] Failed to parse collection:", collectionName, error);
      return [];
    }
  },

  write(collectionName, dataArray) {
    localStorage.setItem(collectionName, JSON.stringify(dataArray));
  },

  generateId() {
    return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
  },

  /* ---------- Users / Authentication ---------- */

  getUsers() {
    return this.read("users");
  },

  findUserByEmail(email) {
    const normalizedEmail = String(email).trim().toLowerCase();
    return this.getUsers().find(function (user) {
      return user.email.toLowerCase() === normalizedEmail;
    });
  },

  addUser(userData) {
    const users = this.getUsers();
    userData.id = this.generateId();
    users.push(userData);
    this.write("users", users);
    return userData;
  },

  setCurrentUser(user) {
    localStorage.setItem(
      "currentUser",
      JSON.stringify({ id: user.id, name: user.name, email: user.email })
    );
  },

  getCurrentUser() {
    const rawValue = localStorage.getItem("currentUser");
    return rawValue ? JSON.parse(rawValue) : null;
  },

  logout() {
    localStorage.removeItem("currentUser");
  },

  /* ---------- Rooms ---------- */

  getRooms() {
    return this.read("rooms");
  },

  getRoomById(roomId) {
    return this.getRooms().find(function (room) {
      return room.id === roomId;
    });
  },

  addRoom(roomData) {
    const rooms = this.getRooms();
    roomData.id = this.generateId();
    rooms.push(roomData);
    this.write("rooms", rooms);
    return roomData;
  },

  updateRoom(roomId, updatedFields) {
    const rooms = this.getRooms();
    const roomIndex = rooms.findIndex(function (room) {
      return room.id === roomId;
    });
    if (roomIndex !== -1) {
      rooms[roomIndex] = Object.assign({}, rooms[roomIndex], updatedFields);
      this.write("rooms", rooms);
    }
  },

  deleteRoom(roomId) {
    const rooms = this.getRooms().filter(function (room) {
      return room.id !== roomId;
    });
    this.write("rooms", rooms);
  },

  /* ---------- Customers ---------- */

  getCustomers() {
    return this.read("customers");
  },

  getCustomerById(customerId) {
    return this.getCustomers().find(function (customer) {
      return customer.id === customerId;
    });
  },

  addCustomer(customerData) {
    const customers = this.getCustomers();
    customerData.id = this.generateId();
    customers.push(customerData);
    this.write("customers", customers);
    return customerData;
  },

  updateCustomer(customerId, updatedFields) {
    const customers = this.getCustomers();
    const customerIndex = customers.findIndex(function (customer) {
      return customer.id === customerId;
    });
    if (customerIndex !== -1) {
      customers[customerIndex] = Object.assign(
        {},
        customers[customerIndex],
        updatedFields
      );
      this.write("customers", customers);
    }
  },

  deleteCustomer(customerId) {
    const customers = this.getCustomers().filter(function (customer) {
      return customer.id !== customerId;
    });
    this.write("customers", customers);
  },

  /* ---------- Bookings ---------- */

  getBookings() {
    return this.read("bookings");
  },

  getBookingById(bookingId) {
    return this.getBookings().find(function (booking) {
      return booking.id === bookingId;
    });
  },

  addBooking(bookingData) {
    const bookings = this.getBookings();
    bookingData.id = this.generateId();
    bookings.push(bookingData);
    this.write("bookings", bookings);
    return bookingData;
  },

  updateBooking(bookingId, updatedFields) {
    const bookings = this.getBookings();
    const bookingIndex = bookings.findIndex(function (booking) {
      return booking.id === bookingId;
    });
    if (bookingIndex !== -1) {
      bookings[bookingIndex] = Object.assign(
        {},
        bookings[bookingIndex],
        updatedFields
      );
      this.write("bookings", bookings);
    }
  },

  deleteBooking(bookingId) {
    const bookings = this.getBookings().filter(function (booking) {
      return booking.id !== bookingId;
    });
    this.write("bookings", bookings);
  },

  // Returns true if the customer currently has any booking marked "Active".
  customerHasActiveBooking(customerId, ignoreBookingId) {
    return this.getBookings().some(function (booking) {
      return (
        booking.customerId === customerId &&
        booking.status === "Active" &&
        booking.id !== ignoreBookingId
      );
    });
  },

  /* ---------- Payments ---------- */

  getPayments() {
    return this.read("payments");
  },

  getPaymentById(paymentId) {
    return this.getPayments().find(function (payment) {
      return payment.id === paymentId;
    });
  },

  addPayment(paymentData) {
    const payments = this.getPayments();
    paymentData.id = this.generateId();
    payments.push(paymentData);
    this.write("payments", payments);
    return paymentData;
  },

  updatePayment(paymentId, updatedFields) {
    const payments = this.getPayments();
    const paymentIndex = payments.findIndex(function (payment) {
      return payment.id === paymentId;
    });
    if (paymentIndex !== -1) {
      payments[paymentIndex] = Object.assign(
        {},
        payments[paymentIndex],
        updatedFields
      );
      this.write("payments", payments);
    }
  },

  deletePayment(paymentId) {
    const payments = this.getPayments().filter(function (payment) {
      return payment.id !== paymentId;
    });
    this.write("payments", payments);
  },

  // Returns true if a payment already exists for the same customer + room pair.
  paymentExistsForCustomerRoom(customerId, roomId, ignorePaymentId) {
    return this.getPayments().some(function (payment) {
      return (
        payment.customerId === customerId &&
        payment.roomId === roomId &&
        payment.id !== ignorePaymentId
      );
    });
  },

  /* ---------- Room Controls (Smart features) ---------- */

  getRoomControls(roomId) {
    const allControls = this.read("roomControls");
    const found = allControls.find(function (control) {
      return control.roomId === roomId;
    });
    return found || { roomId: roomId, lights: false, ac: false, doorLocked: true };
  },

  saveRoomControls(controlState) {
    const allControls = this.read("roomControls");
    const controlIndex = allControls.findIndex(function (control) {
      return control.roomId === controlState.roomId;
    });
    if (controlIndex !== -1) {
      allControls[controlIndex] = controlState;
    } else {
      allControls.push(controlState);
    }
    this.write("roomControls", allControls);
  },
};

/*
 * Guard helper: every protected page calls this on load to ensure a staff
 * member is logged in, otherwise it redirects back to the login screen.
 */
function requireAuthentication() {
  if (!Database.getCurrentUser()) {
    window.location.href = "index.html";
  }
}
