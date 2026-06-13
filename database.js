// database.js - Centralized LocalStorage Management
const Database = {
    // Initialize database with default structure
    init() {
        if (!localStorage.getItem('hotel_users')) {
            localStorage.setItem('hotel_users', JSON.stringify([]));
        }
        if (!localStorage.getItem('hotel_rooms')) {
            localStorage.setItem('hotel_rooms', JSON.stringify([]));
        }
        if (!localStorage.getItem('hotel_customers')) {
            localStorage.setItem('hotel_customers', JSON.stringify([]));
        }
        if (!localStorage.getItem('hotel_bookings')) {
            localStorage.setItem('hotel_bookings', JSON.stringify([]));
        }
        if (!localStorage.getItem('hotel_payments')) {
            localStorage.setItem('hotel_payments', JSON.stringify([]));
        }
        if (!localStorage.getItem('hotel_room_controls')) {
            localStorage.setItem('hotel_room_controls', JSON.stringify([]));
        }
    },

    // Generic get all records
    getAll(tableName) {
        return JSON.parse(localStorage.getItem(tableName)) || [];
    },

    // Generic get record by ID
    getById(tableName, id) {
        const records = this.getAll(tableName);
        return records.find(record => record.id === id) || null;
    },

    // Generic add record
    add(tableName, record) {
        const records = this.getAll(tableName);
        record.id = Date.now().toString();
        record.createdAt = new Date().toISOString();
        records.push(record);
        localStorage.setItem(tableName, JSON.stringify(records));
        return record;
    },

    // Generic update record
    update(tableName, id, updatedData) {
        const records = this.getAll(tableName);
        const index = records.findIndex(record => record.id === id);
        if (index !== -1) {
            records[index] = { ...records[index], ...updatedData, updatedAt: new Date().toISOString() };
            localStorage.setItem(tableName, JSON.stringify(records));
            return records[index];
        }
        return null;
    },

    // Generic delete record
    delete(tableName, id) {
        const records = this.getAll(tableName);
        const filteredRecords = records.filter(record => record.id !== id);
        localStorage.setItem(tableName, JSON.stringify(filteredRecords));
        return true;
    },

    // Get records by field value
    getByField(tableName, field, value) {
        const records = this.getAll(tableName);
        return records.filter(record => record[field] === value);
    },

    // Get single record by field value
    getOneByField(tableName, field, value) {
        const records = this.getAll(tableName);
        return records.find(record => record[field] === value) || null;
    }
};

// Initialize on load
Database.init();