// payments.js - Payment Management CRUD Operations

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

// Load payments on page load
document.addEventListener('DOMContentLoaded', () => {
    loadPayments();
    loadPaymentSummary();
});

// Populate booking dropdown
function populateBookingDropdown() {
    const bookings = Database.getAll('hotel_bookings');
    const customers = Database.getAll('hotel_customers');
    const rooms = Database.getAll('hotel_rooms');
    const bookingSelect = document.getElementById('paymentBooking');
    
    bookingSelect.innerHTML = '<option value="">Choose a booking</option>' +
        bookings.map(booking => {
            const customer = customers.find(c => c.id === booking.customerId);
            const room = rooms.find(r => r.id === booking.roomId);
            const customerName = customer ? customer.name : 'Unknown';
            const roomNumber = room ? room.roomNumber : 'Unknown';
            
            return `<option value="${booking.id}">
                ${customerName} - Room ${roomNumber} (${booking.status})
            </option>`;
        }).join('');
}

// Load payment summary
function loadPaymentSummary() {
    const payments = Database.getAll('hotel_payments');
    
    let totalCollected = 0;
    let totalPending = 0;
    
    payments.forEach(payment => {
        if (payment.paymentStatus === 'Completed') {
            totalCollected += parseFloat(payment.amount);
        } else if (payment.paymentStatus === 'Pending') {
            totalPending += parseFloat(payment.amount);
        }
    });
    
    document.getElementById('totalCollected').textContent = `$${totalCollected.toFixed(2)}`;
    document.getElementById('totalPending').textContent = `$${totalPending.toFixed(2)}`;
    document.getElementById('totalTransactions').textContent = payments.length;
}

// Load and display payments
function loadPayments() {
    const payments = Database.getAll('hotel_payments');
    const bookings = Database.getAll('hotel_bookings');
    const customers = Database.getAll('hotel_customers');
    const rooms = Database.getAll('hotel_rooms');
    const tableBody = document.getElementById('paymentsTableBody');

    // Sort by date (newest first)
    payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    if (payments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-gray-500">No payments recorded yet</td>
            </tr>`;
        return;
    }

    tableBody.innerHTML = payments.map(payment => {
        const booking = bookings.find(b => b.id === payment.bookingId);
        const customer = booking ? customers.find(c => c.id === booking.customerId) : null;
        const room = booking ? rooms.find(r => r.id === booking.roomId) : null;
        
        let bookingRef = 'N/A';
        if (customer && room) {
            bookingRef = `${customer.name} - Room ${room.roomNumber}`;
        } else if (customer) {
            bookingRef = customer.name;
        } else if (room) {
            bookingRef = `Room ${room.roomNumber}`;
        }
        
        const statusClass = getPaymentStatusClass(payment.paymentStatus);
        const methodIcon = getPaymentMethodIcon(payment.paymentMethod);

        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition duration-150">
                <td class="px-6 py-4 text-gray-800 text-sm">${bookingRef}</td>
                <td class="px-6 py-4">
                    <span class="font-bold text-hotel-primary">$${parseFloat(payment.amount).toFixed(2)}</span>
                </td>
                <td class="px-6 py-4 text-gray-600">
                    <span>${methodIcon} ${payment.paymentMethod}</span>
                </td>
                <td class="px-6 py-4 text-gray-600">${formatDate(payment.paymentDate)}</td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">
                        ${payment.paymentStatus}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex space-x-2">
                        <button onclick="openEditPaymentModal('${payment.id}')" 
                                class="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition duration-200 text-sm">
                            ✏️
                        </button>
                        <button onclick="openDeletePaymentModal('${payment.id}')" 
                                class="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition duration-200 text-sm">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Get payment method icon
function getPaymentMethodIcon(method) {
    const icons = {
        'Cash': '💵',
        'Credit Card': '💳',
        'Debit Card': '🏦',
        'Bank Transfer': '🏛️',
        'Online Payment': '🌐'
    };
    return icons[method] || '💰';
}

// Get payment status CSS class
function getPaymentStatusClass(status) {
    switch(status) {
        case 'Completed':
            return 'bg-green-100 text-green-700';
        case 'Pending':
            return 'bg-yellow-100 text-yellow-700';
        case 'Failed':
            return 'bg-red-100 text-red-700';
        case 'Refunded':
            return 'bg-purple-100 text-purple-700';
        default:
            return 'bg-gray-100 text-gray-700';
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Open Add Payment Modal
function openAddPaymentModal() {
    document.getElementById('modalTitle').textContent = 'Record Payment';
    document.getElementById('paymentId').value = '';
    document.getElementById('paymentForm').reset();
    populateBookingDropdown();
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('paymentModal').classList.remove('hidden');
    document.getElementById('paymentModal').classList.add('flex');
}

// Open Edit Payment Modal
function openEditPaymentModal(paymentId) {
    const payment = Database.getById('hotel_payments', paymentId);
    if (!payment) return;

    document.getElementById('modalTitle').textContent = 'Edit Payment';
    document.getElementById('paymentId').value = payment.id;
    
    populateBookingDropdown();
    
    document.getElementById('paymentBooking').value = payment.bookingId;
    document.getElementById('paymentAmount').value = payment.amount;
    document.getElementById('paymentDate').value = payment.paymentDate;
    document.getElementById('paymentMethod').value = payment.paymentMethod;
    document.getElementById('paymentStatus').value = payment.paymentStatus;
    
    document.getElementById('paymentModal').classList.remove('hidden');
    document.getElementById('paymentModal').classList.add('flex');
}

// Close Payment Modal
function closePaymentModal() {
    document.getElementById('paymentModal').classList.add('hidden');
    document.getElementById('paymentModal').classList.remove('flex');
    document.getElementById('paymentForm').reset();
}

// Handle Save Payment (Add or Edit)
function handleSavePayment(event) {
    event.preventDefault();

    const paymentId = document.getElementById('paymentId').value;
    const bookingId = document.getElementById('paymentBooking').value;
    const amount = document.getElementById('paymentAmount').value;
    const paymentDate = document.getElementById('paymentDate').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const paymentStatus = document.getElementById('paymentStatus').value;

    // Validate all required fields
    if (!bookingId || !amount || !paymentDate || !paymentMethod || !paymentStatus) {
        alert('Please fill in all required fields.');
        return false;
    }

    // Validate amount is positive
    if (parseFloat(amount) <= 0) {
        alert('Payment amount must be greater than 0.');
        return false;
    }

    const paymentData = {
        bookingId: bookingId,
        amount: parseFloat(amount),
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus
    };

    if (paymentId) {
        // Update existing payment
        Database.update('hotel_payments', paymentId, paymentData);
    } else {
        // Add new payment
        Database.add('hotel_payments', paymentData);
    }

    closePaymentModal();
    loadPayments();
    loadPaymentSummary();
    return false;
}

// Open Delete Confirmation Modal
function openDeletePaymentModal(paymentId) {
    document.getElementById('deletePaymentId').value = paymentId;
    document.getElementById('deleteModal').classList.remove('hidden');
    document.getElementById('deleteModal').classList.add('flex');
}

// Close Delete Modal
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    document.getElementById('deleteModal').classList.remove('flex');
    document.getElementById('deletePaymentId').value = '';
}

// Confirm Delete Payment
function confirmDeletePayment() {
    const paymentId = document.getElementById('deletePaymentId').value;
    
    if (paymentId) {
        Database.delete('hotel_payments', paymentId);
        loadPayments();
        loadPaymentSummary();
    }
    
    closeDeleteModal();
}

// Close modals when clicking outside
document.getElementById('paymentModal').addEventListener('click', function(event) {
    if (event.target === this) {
        closePaymentModal();
    }
});

document.getElementById('deleteModal').addEventListener('click', function(event) {
    if (event.target === this) {
        closeDeleteModal();
    }
});