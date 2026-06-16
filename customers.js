/**
 * customers.js
 * Full CRUD operations for hotel customers.
 */

document.addEventListener('DOMContentLoaded', function () {
  requireAuthentication();
  renderSidebarNavigation('customers.html');
  setupMobileSidebarToggle();
  setupCustomerModal();
  setupCustomerForm();
  renderCustomersTable();
});

/**
 * Sets up modal open/close event listeners for the customer form.
 */
function setupCustomerModal() {
  const modalElement = document.getElementById('customer-modal');
  const openButton = document.getElementById('open-add-customer-button');
  const closeButton = document.getElementById('close-customer-modal-button');

  openButton.addEventListener('click', function () {
    openCustomerModal(null);
  });

  closeButton.addEventListener('click', function () {
    closeCustomerModal();
  });

  modalElement.addEventListener('click', function (event) {
    if (event.target === modalElement) {
      closeCustomerModal();
    }
  });
}

/**
 * Opens the modal for adding or editing a customer record.
 */
function openCustomerModal(customerId) {
  const modalElement = document.getElementById('customer-modal');
  const modalTitle = document.getElementById('customer-modal-title');
  const editIdField = document.getElementById('customer-edit-id');
  const customerForm = document.getElementById('customer-form');

  customerForm.reset();
  editIdField.value = '';

  if (customerId) {
    const customer = findCustomerById(customerId);
    if (customer) {
      modalTitle.textContent = 'Edit Customer';
      editIdField.value = customer.id;
      document.getElementById('customer-name').value = customer.name;
      document.getElementById('customer-phone').value = customer.phone;
      document.getElementById('customer-email').value = customer.email;
      document.getElementById('customer-national-id').value = customer.nationalId;
    }
  } else {
    modalTitle.textContent = 'Add Customer';
  }

  modalElement.classList.remove('hidden');
  modalElement.classList.add('flex');
}

/**
 * Closes the customer modal and clears the form.
 */
function closeCustomerModal() {
  const modalElement = document.getElementById('customer-modal');
  modalElement.classList.add('hidden');
  modalElement.classList.remove('flex');
  document.getElementById('customer-form').reset();
  document.getElementById('customer-edit-id').value = '';
}

/**
 * Validates and saves a new or updated customer to localStorage.
 */
function setupCustomerForm() {
  const customerForm = document.getElementById('customer-form');

  customerForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const editId = document.getElementById('customer-edit-id').value;
    const customerName = document.getElementById('customer-name').value.trim();
    const customerPhone = document.getElementById('customer-phone').value.trim();
    const customerEmail = document.getElementById('customer-email').value.trim();
    const nationalId = document.getElementById('customer-national-id').value.trim();

    if (!customerName || !customerPhone || !customerEmail || !nationalId) {
      showAlertMessage('Please fill in all required fields.', 'error');
      return;
    }

    const customersList = getAllCustomers();

    const duplicateNationalId = customersList.find(function (customer) {
      if (editId && customer.id === editId) {
        return false;
      }
      return customer.nationalId === nationalId;
    });

    if (duplicateNationalId) {
      showAlertMessage('A customer with this National ID already exists.', 'error');
      return;
    }

    const duplicateEmail = customersList.find(function (customer) {
      if (editId && customer.id === editId) {
        return false;
      }
      return customer.email.toLowerCase() === customerEmail.toLowerCase();
    });

    if (duplicateEmail) {
      showAlertMessage('A customer with this email already exists.', 'error');
      return;
    }

    if (editId) {
      const customerIndex = customersList.findIndex(function (customer) {
        return customer.id === editId;
      });
      if (customerIndex !== -1) {
        customersList[customerIndex] = {
          id: editId,
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          nationalId: nationalId,
          faceEnrolled: customersList[customerIndex].faceEnrolled || false,
          updatedAt: new Date().toISOString()
        };
      }
      showAlertMessage('Customer updated successfully.', 'success');
    } else {
      customersList.push({
        id: generateUniqueId(),
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        nationalId: nationalId,
        faceEnrolled: false,
        createdAt: new Date().toISOString()
      });
      showAlertMessage('Customer added successfully.', 'success');
    }

    saveAllCustomers(customersList);
    closeCustomerModal();
    renderCustomersTable();
  });
}

/**
 * Renders all customers from localStorage into the table.
 */
function renderCustomersTable() {
  const customersList = getAllCustomers();
  const tableBody = document.getElementById('customers-table-body');

  if (customersList.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-8 text-center text-slate-400">No customers added yet. Click "Add Customer" to get started.</td>
      </tr>
    `;
    return;
  }

  let tableRowsHTML = '';
  customersList.forEach(function (customer) {
    const faceStatus = customer.faceEnrolled
      ? '<span class="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Enrolled</span>'
      : '<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Not Enrolled</span>';

    tableRowsHTML += `
      <tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="px-6 py-4 font-medium text-slate-800">${customer.name}</td>
        <td class="px-6 py-4 text-slate-600">${customer.phone}</td>
        <td class="px-6 py-4 text-slate-600">${customer.email}</td>
        <td class="px-6 py-4 text-slate-600">${customer.nationalId}</td>
        <td class="px-6 py-4">${faceStatus}</td>
        <td class="px-6 py-4 text-right">
          <button onclick="openCustomerModal('${customer.id}')"
                  class="mr-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
            Edit
          </button>
          <button onclick="deleteCustomer('${customer.id}')"
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
 * Deletes a customer if they have no active bookings.
 */
function deleteCustomer(customerId) {
  if (customerHasActiveBooking(customerId, null)) {
    showAlertMessage('Cannot delete a customer with an active booking.', 'error');
    return;
  }

  if (!confirm('Are you sure you want to delete this customer?')) {
    return;
  }

  const customersList = getAllCustomers().filter(function (customer) {
    return customer.id !== customerId;
  });

  saveAllCustomers(customersList);
  showAlertMessage('Customer deleted successfully.', 'success');
  renderCustomersTable();
}
