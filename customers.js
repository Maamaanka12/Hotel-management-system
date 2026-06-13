// customers.js - Customer Management CRUD Operations

// Check authentication
const currentUser = JSON.parse(localStorage.getItem('hotel_currentUser'));
if (!currentUser) {
    window.location.href = 'index.html';
}

// Display current user name
document.getElementById('currentUserName').textContent = `👤 ${currentUser.name}`;

// Logout function
function handleLogout() {
    localStorage.removeItem('hotel_currentUser');
    window.location.href = 'index.html';
}

// Load all customers on page load
document.addEventListener('DOMContentLoaded', loadCustomers);

// Load and display all customers
function loadCustomers(filterText = '') {
    const customers = Database.getAll('hotel_customers');
    const tableBody = document.getElementById('customersTableBody');

    // Filter customers if search text provided
    let filteredCustomers = customers;
    if (filterText) {
        const searchTerm = filterText.toLowerCase();
        filteredCustomers = customers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.phone.toLowerCase().includes(searchTerm) ||
            customer.email.toLowerCase().includes(searchTerm) ||
            customer.nationalId.toLowerCase().includes(searchTerm)
        );
    }

    if (filteredCustomers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-gray-500">
                    ${customers.length === 0 ? 'No customers found. Click "Add Customer" to create one.' : 'No matching customers found.'}
                </td>
            </tr>`;
        return;
    }

    tableBody.innerHTML = filteredCustomers.map(customer => createCustomerRow(customer)).join('');
}

// Create customer table row HTML
function createCustomerRow(customer) {
    const faceIdStatus = customer.faceEnrolled ? 
        '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">✅ Enrolled</span>' : 
        '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">❌ Not Enrolled</span>';

    return `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition duration-150">
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-hotel-primary rounded-full flex items-center justify-center text-white font-semibold mr-3">
                        ${customer.name.charAt(0).toUpperCase()}
                    </div>
                    <span class="font-semibold text-gray-800">${customer.name}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-gray-600">${customer.phone}</td>
            <td class="px-6 py-4 text-gray-600">${customer.email}</td>
            <td class="px-6 py-4 text-gray-600">${customer.nationalId}</td>
            <td class="px-6 py-4">${faceIdStatus}</td>
            <td class="px-6 py-4">
                <div class="flex space-x-2">
                    <button onclick="openEditCustomerModal('${customer.id}')" 
                            class="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition duration-200 text-sm">
                        ✏️
                    </button>
                    <button onclick="openDeleteCustomerModal('${customer.id}')" 
                            class="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition duration-200 text-sm">
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Filter customers on search
function filterCustomers() {
    const searchText = document.getElementById('customerSearch').value;
    loadCustomers(searchText);
}

// Open Add Customer Modal
function openAddCustomerModal() {
    document.getElementById('modalTitle').textContent = 'Add New Customer';
    document.getElementById('customerId').value = '';
    document.getElementById('customerForm').reset();
    document.getElementById('customerModal').classList.remove('hidden');
    document.getElementById('customerModal').classList.add('flex');
}

// Open Edit Customer Modal
function openEditCustomerModal(customerId) {
    const customer = Database.getById('hotel_customers', customerId);
    if (!customer) return;

    document.getElementById('modalTitle').textContent = 'Edit Customer';
    document.getElementById('customerId').value = customer.id;
    document.getElementById('customerName').value = customer.name;
    document.getElementById('customerPhone').value = customer.phone;
    document.getElementById('customerEmail').value = customer.email;
    document.getElementById('customerNationalId').value = customer.nationalId;
    
    document.getElementById('customerModal').classList.remove('hidden');
    document.getElementById('customerModal').classList.add('flex');
}

// Close Customer Modal
function closeCustomerModal() {
    document.getElementById('customerModal').classList.add('hidden');
    document.getElementById('customerModal').classList.remove('flex');
    document.getElementById('customerForm').reset();
}

// Handle Save Customer (Add or Edit)
function handleSaveCustomer(event) {
    event.preventDefault();

    const customerId = document.getElementById('customerId').value;
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const email = document.getElementById('customerEmail').value.trim();
    const nationalId = document.getElementById('customerNationalId').value.trim();

    // Validate all required fields
    if (!name || !phone || !email || !nationalId) {
        alert('Please fill in all required fields.');
        return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        return false;
    }

    // Validate phone format (basic check - at least 7 digits)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 7) {
        alert('Please enter a valid phone number with at least 7 digits.');
        return false;
    }

    // Check for duplicate email (exclude current customer when editing)
    const existingCustomers = Database.getAll('hotel_customers');
    const duplicateEmail = existingCustomers.find(customer => 
        customer.email.toLowerCase() === email.toLowerCase() && customer.id !== customerId
    );

    if (duplicateEmail) {
        alert('A customer with this email already exists.');
        return false;
    }

    // Check for duplicate national ID (exclude current customer when editing)
    const duplicateId = existingCustomers.find(customer => 
        customer.nationalId.toLowerCase() === nationalId.toLowerCase() && customer.id !== customerId
    );

    if (duplicateId) {
        alert('A customer with this National ID already exists.');
        return false;
    }

    if (customerId) {
        // Update existing customer
        const existingCustomer = Database.getById('hotel_customers', customerId);
        const customerData = {
            name: name,
            phone: phone,
            email: email,
            nationalId: nationalId,
            faceEnrolled: existingCustomer ? existingCustomer.faceEnrolled || false : false
        };
        Database.update('hotel_customers', customerId, customerData);
    } else {
        // Add new customer
        const customerData = {
            name: name,
            phone: phone,
            email: email,
            nationalId: nationalId,
            faceEnrolled: false
        };
        Database.add('hotel_customers', customerData);
    }

    closeCustomerModal();
    loadCustomers();
    return false;
}

// Open Delete Confirmation Modal
function openDeleteCustomerModal(customerId) {
    document.getElementById('deleteCustomerId').value = customerId;
    document.getElementById('deleteModal').classList.remove('hidden');
    document.getElementById('deleteModal').classList.add('flex');
}

// Close Delete Modal
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    document.getElementById('deleteModal').classList.remove('flex');
    document.getElementById('deleteCustomerId').value = '';
}

// Confirm Delete Customer
function confirmDeleteCustomer() {
    const customerId = document.getElementById('deleteCustomerId').value;
    
    if (customerId) {
        // Check if customer has active bookings
        const bookings = Database.getAll('hotel_bookings');
        const activeBooking = bookings.find(booking => 
            booking.customerId === customerId && booking.status === 'Active'
        );

        if (activeBooking) {
            alert('Cannot delete customer with active booking. Please complete or cancel the booking first.');
            closeDeleteModal();
            return;
        }

        Database.delete('hotel_customers', customerId);
        loadCustomers();
    }
    
    closeDeleteModal();
}

// Close modals when clicking outside
document.getElementById('customerModal').addEventListener('click', function(event) {
    if (event.target === this) {
        closeCustomerModal();
    }
});

document.getElementById('deleteModal').addEventListener('click', function(event) {
    if (event.target === this) {
        closeDeleteModal();
    }
});