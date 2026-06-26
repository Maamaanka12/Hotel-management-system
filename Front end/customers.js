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
      <tr class="table-row-hover" style="border-bottom: 1px solid rgba(255,255,255,0.04);">
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
  document.getElementById('faceEnrolledField').classList.add('hidden');
  hideAlertIn('modalAlert');
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
  document.getElementById('inputFaceEnrolled').value = customer.Is_Face_Enrolled ? 'true' : 'false';
  document.getElementById('faceEnrolledField').classList.remove('hidden');
  hideAlertIn('modalAlert');
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

 
showAlertIn(
  'modalAlert',
  'Please fill in all required fields.',
  'error'
);

return;
 

}

const payload = {
fullName,
phone,
email
};

if (editingCustomerId) {

 
const isFaceEnrolledSelect =
  document.getElementById(
    'inputFaceEnrolled'
  );

if (isFaceEnrolledSelect) {

  payload.isFaceEnrolled =
    isFaceEnrolledSelect.value === 'true'
      ? 1
      : 0;

}
 

}

try {

 
if (editingCustomerId) {

  await API.put(
    `/guests/${editingCustomerId}`,
    payload
  );

} else {

  await API.post(
    '/guests',
    payload
  );

}

closeModal();

renderCustomersTable();
 

} catch (error) {

 
showAlertIn(
  'modalAlert',
  error.message ||
  'Failed to save customer.',
  'error'
);
 

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
  } catch (error) {
    closeDeleteModal();
    console.error('Failed to delete customer:', error);
  }
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}