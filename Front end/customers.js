let allCustomers = [];
let editingCustomerId = null;
let deletingCustomerId = null;

document.addEventListener('DOMContentLoaded', function () {
  requireAuthentication();
  renderCustomersTable();
});

async function renderCustomersTable() {
  try {
    const result = await API.get('/guests');
    allCustomers = result.data || [];
    applyCustomerSearchFilter();
  } catch (error) {
    console.error('Failed to load customers:', error);
    showAlertIn('modalAlert', error.message || 'Failed to load customers.', 'error');
  }
}

function applyCustomerSearchFilter() {
  const searchInput = document.getElementById('customerSearchInput');
  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();

  const filtered = !query
    ? allCustomers
    : allCustomers.filter((customer) => {
        return (
          String(customer.Full_Name || '').toLowerCase().includes(query) ||
          String(customer.Email || '').toLowerCase().includes(query) ||
          String(customer.Phone || '').toLowerCase().includes(query) 
        );
      });

  renderCustomerRows(filtered);
}

function handleSearch() {
  applyCustomerSearchFilter();
}

function renderCustomerRows(customers) {
  const tableBody = document.getElementById('customersTableBody');
  const emptyState = document.getElementById('customersEmptyState');
  const countDisplay = document.getElementById('customerCountDisplay');

  if (countDisplay) countDisplay.textContent = allCustomers.length;

  if (customers.length === 0) {
    tableBody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');

  tableBody.innerHTML = customers
    .map(
      (customer) => `
      <tr class="table-row-hover" style="border-bottom: 1px solid var(--border-subtle);">
        <td class="px-5 py-3 text-slate-200 font-medium">${escapeHtml(customer.Full_Name)}</td>
        <td class="px-5 py-3 text-slate-300 hidden sm:table-cell">${escapeHtml(customer.Phone)}</td>
        <td class="px-5 py-3 text-slate-300 hidden md:table-cell">${escapeHtml(customer.Email)}</td>

        <td class="px-5 py-3">${faceIdBadge(customer.Is_Face_Enrolled)}</td>
        <td class="px-5 py-3 text-right space-x-2">
          <button onclick="openEditModal(${customer.Guest_ID})" class="text-slate-400 hover:text-gold text-xs font-medium">Edit</button>
          <button onclick="openDeleteModal(${customer.Guest_ID})" class="text-slate-400 hover:text-red-400 text-xs font-medium">Delete</button>
        </td>
      </tr>
    `
    )
    .join('');
}

function faceIdBadge(isEnrolled) {
  return isEnrolled
    ? '<span class="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">Enrolled</span>'
    : '<span class="px-2 py-1 rounded-full text-xs font-medium bg-slate-500/15 text-slate-400">Not Enrolled</span>';
}

function openAddModal() {
  editingCustomerId = null;
  document.getElementById('modalTitle').textContent = 'Add Customer';
  document.getElementById('inputCustomerName').value = '';
  document.getElementById('inputCustomerPhone').value = '';
  document.getElementById('inputCustomerEmail').value = '';
  document.getElementById('faceEnrollField').classList.remove('hidden');
  document.getElementById('faceEnrolledField').classList.add('hidden');
  // Show face+save button, hide plain save button
  document.getElementById('modalSaveButton').classList.add('hidden');
  document.getElementById('modalFaceSaveButton').classList.remove('hidden');
  resetFaceSaveButton();
  hideAlertIn('modalAlert');
  hideAlertIn('faceScanStatus');
  document.getElementById('faceScanStatus').classList.add('hidden');
  document.getElementById('customerModal').classList.add('open');
}

function openEditModal(customerId) {
  const customer = allCustomers.find((c) => c.Guest_ID === customerId);
  if (!customer) return;

  editingCustomerId = customerId;
  document.getElementById('modalTitle').textContent = 'Edit Customer';
  document.getElementById('inputCustomerName').value = customer.Full_Name;
  document.getElementById('inputCustomerPhone').value = customer.Phone || '';
  document.getElementById('inputCustomerEmail').value = customer.Email || '';
  document.getElementById('inputFaceEnrolled').textContent = customer.Is_Face_Enrolled ? 'Enrolled' : 'Not Enrolled';
  document.getElementById('inputFaceEnrolled').className = 'w-full px-4 py-2.5 rounded-lg text-sm border border-white/10 ' + (customer.Is_Face_Enrolled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400');
  document.getElementById('faceEnrollField').classList.add('hidden');
  document.getElementById('faceEnrolledField').classList.remove('hidden');
  // Show plain save button, hide face+save button
  document.getElementById('modalSaveButton').classList.remove('hidden');
  document.getElementById('modalFaceSaveButton').classList.add('hidden');
  hideAlertIn('modalAlert');
  hideAlertIn('faceScanStatus');
  document.getElementById('faceScanStatus').classList.add('hidden');
  document.getElementById('customerModal').classList.add('open');
}

function closeModal() {
  document.getElementById('customerModal').classList.remove('open');
}

function handleModalBackdropClick(event) {
  if (event.target.id === 'customerModal') closeModal();
}


async function handleSaveCustomer() {

const fullName =
document
.getElementById('inputCustomerName')
.value
.trim();

const phone =
document
.getElementById('inputCustomerPhone')
.value
.trim();

const email =
document
.getElementById('inputCustomerEmail')
.value
.trim();

if (!fullName || !phone || !email) {
  showAlertIn('modalAlert', 'Please fill in all required fields.', 'error');
  return;
}

// Name: letters, spaces, hyphens, apostrophes only
if (!/^[a-zA-Z\s'\-]+$/.test(fullName)) {
  showAlertIn('modalAlert', 'Name must contain letters only.', 'error');
  return;
}

// Phone: digits only, optional leading +, 7–15 digits
if (!/^\+?[0-9]{7,15}$/.test(phone)) {
  showAlertIn('modalAlert', 'Phone must contain numbers only (7–15 digits).', 'error');
  return;
}

// Email: basic format
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  showAlertIn('modalAlert', 'Enter a valid email address.', 'error');
  return;
}

const payload = {
fullName,
phone,
email
};

if (editingCustomerId) {

  // Face ID status is read-only
 
}

try {

 
let saveResult;
if (editingCustomerId) {

  saveResult = await API.put(
    `/guests/${editingCustomerId}`,
    payload
  );

} else {

  saveResult = await API.post(
    '/guests',
    payload
  );

}

closeModal();
renderCustomersTable();
showToast(editingCustomerId ? 'Customer updated successfully.' : 'Customer added successfully.', 'success');

} catch (error) {

 
showAlertIn(
  'modalAlert',
  error.message ||
  'Failed to save customer.',
  'error'
);
 

}

}



function resetFaceSaveButton() {
  const btnText = document.getElementById('faceSaveBtnText');
  const btnSpinner = document.getElementById('faceSaveBtnSpinner');
  const btn = document.getElementById('modalFaceSaveButton');
  if (btnText) btnText.classList.remove('hidden');
  if (btnSpinner) btnSpinner.classList.add('hidden');
  if (btn) btn.disabled = false;
}

async function handleFaceScanAndSave() {
  // Validate fields first
  const fullName = document.getElementById('inputCustomerName').value.trim();
  const phone = document.getElementById('inputCustomerPhone').value.trim();
  const email = document.getElementById('inputCustomerEmail').value.trim();

  if (!fullName || !phone || !email) {
    showAlertIn('modalAlert', 'Please fill in all required fields.', 'error');
    return;
  }
  if (!/^[a-zA-Z\s'\-]+$/.test(fullName)) {
    showAlertIn('modalAlert', 'Name must contain letters only.', 'error');
    return;
  }
  if (!/^\+?[0-9]{7,15}$/.test(phone)) {
    showAlertIn('modalAlert', 'Phone must contain numbers only (7–15 digits).', 'error');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAlertIn('modalAlert', 'Enter a valid email address.', 'error');
    return;
  }

  // Disable button and show spinner
  const btn = document.getElementById('modalFaceSaveButton');
  const btnText = document.getElementById('faceSaveBtnText');
  const btnSpinner = document.getElementById('faceSaveBtnSpinner');
  btn.disabled = true;
  btnText.classList.add('hidden');
  btnSpinner.classList.remove('hidden');
  hideAlertIn('modalAlert');
  hideAlertIn('faceScanStatus');

  try {
    // Step 1: Save the customer
    const saveResult = await API.post('/guests', { fullName, phone, email });
    const guestId = saveResult.data ? saveResult.data.Guest_ID : null;

    if (!guestId) {
      throw new Error('Customer saved but no guest ID returned.');
    }

    // Step 2: Scan face
    const statusEl = document.getElementById('faceScanStatus');
    statusEl.classList.remove('hidden');
    showAlertIn('faceScanStatus', 'Opening camera for face scan...', 'info');

    await API.post('/guests/scan-face', { guestId });

    // Success
    showAlertIn('faceScanStatus', 'Customer added and face enrolled successfully!', 'success');
    showToast('Customer added and face enrolled successfully.', 'success');
    await renderCustomersTable();
    setTimeout(() => closeModal(), 1200);

  } catch (error) {
    const msg = error.message || 'Face scan failed. Please try again.';
    showAlertIn('faceScanStatus', msg, 'error');
    showToast(msg, 'error');
    // Re-enable button so user can retry
    btn.disabled = false;
    btnText.classList.remove('hidden');
    btnSpinner.classList.add('hidden');
    await renderCustomersTable();
  }
}

function openDeleteModal(customerId) {
  deletingCustomerId = customerId;
  const customer = allCustomers.find((c) => c.Guest_ID === customerId);
  document.getElementById('deleteCustomerLabel').textContent = customer ? customer.Full_Name : 'this customer';
  document.getElementById('deleteModal').classList.add('open');
}

function closeDeleteModal() {
  deletingCustomerId = null;
  document.getElementById('deleteModal').classList.remove('open');
}

function handleDeleteBackdropClick(event) {
  if (event.target.id === 'deleteModal') closeDeleteModal();
}

async function confirmDeleteCustomer() {
  if (!deletingCustomerId) return;
  try {
    await API.delete(`/guests/${deletingCustomerId}`);
    closeDeleteModal();
    renderCustomersTable();
    showToast('Customer deleted successfully.', 'success');
  } catch (error) {
    closeDeleteModal();
    console.error('Failed to delete customer:', error);
    showToast(error.message || 'Failed to delete customer.', 'error');
  }
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}