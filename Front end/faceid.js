let selectedCustomerId = null;
let allCustomersForFaceId = [];

document.addEventListener('DOMContentLoaded', async function () {
  requireAuthentication();
  await populateCustomerDropdown();
});

async function populateCustomerDropdown() {
  const customerSelect = document.getElementById('faceCustomerSelect');

  try {
    const result = await API.get('/guests');
    allCustomersForFaceId = result.data || [];
  } catch (error) {
    console.error('Failed to load customers:', error);
    return;
  }

  customerSelect.innerHTML =
    '<option value="">Choose a customer to enroll...</option>' +
    allCustomersForFaceId
      .map((customer) => {
        const enrolledLabel = customer.Is_Face_Enrolled ? ' (Already Enrolled)' : '';
        return `<option value="${customer.Guest_ID}">${escapeHtml(customer.Full_Name)}${enrolledLabel}</option>`;
      })
      .join('');

  renderEnrolledList();
}

function renderEnrolledList() {
  const listContainer = document.getElementById('enrolledCustomersList');
  const countBadge = document.getElementById('enrolledCountBadge');
  const enrolled = allCustomersForFaceId.filter((customer) => customer.Is_Face_Enrolled);

  if (countBadge) countBadge.textContent = enrolled.length;

  if (enrolled.length === 0) {
    listContainer.innerHTML = '<p class="text-slate-600 text-xs text-center py-4">No customers enrolled yet.</p>';
    return;
  }

  listContainer.innerHTML = enrolled
    .map(
      (customer) => `
      <div class="flex items-center gap-3 px-3 py-2 rounded-lg" style="background: var(--bg-input);">
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style="background: linear-gradient(135deg, #1e3a5f, #2a5298);">
          ${escapeHtml((customer.Full_Name || '?').charAt(0).toUpperCase())}
        </div>
        <span class="text-slate-300 text-sm truncate">${escapeHtml(customer.Full_Name)}</span>
        <span class="ml-auto text-emerald-400 text-xs">✓</span>
      </div>
    `
    )
    .join('');
}

function handleCustomerSelection() {
  const customerSelect = document.getElementById('faceCustomerSelect');
  const scanButton = document.getElementById('startScanButton');
  const card = document.getElementById('selectedCustomerCard');

  document.getElementById('scanStatusMessage').classList.add('hidden');

  selectedCustomerId = customerSelect.value ? Number(customerSelect.value) : null;

  if (!selectedCustomerId) {
    scanButton.disabled = true;
    card.classList.add('hidden');
    return;
  }

  const customer = allCustomersForFaceId.find((c) => c.Guest_ID === selectedCustomerId);
  if (!customer) return;

  scanButton.disabled = false;
  card.classList.remove('hidden');
  document.getElementById('selectedCustomerAvatar').textContent = (customer.Full_Name || '?').charAt(0).toUpperCase();
  document.getElementById('selectedCustomerName').textContent = customer.Full_Name;
  document.getElementById('selectedCustomerEmail').textContent = customer.Email || '—';

  const badge = document.getElementById('selectedCustomerBadge');
  badge.innerHTML = customer.Is_Face_Enrolled
    ? '<span class="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">Enrolled</span>'
    : '<span class="px-2 py-1 rounded-full text-xs font-medium bg-slate-500/15 text-slate-400">Not Enrolled</span>';
}

async function startFaceScan() {
  if (!selectedCustomerId) return;

  const scanButton = document.getElementById('startScanButton');
  scanButton.disabled = true;

  hideAlertIn('scanStatusMessage');

  try {
    await API.post('/guests/scan-face', { guestId: selectedCustomerId });
    showAlertIn('scanStatusMessage', 'Face enrolled successfully.', 'success');
    showToast('Face enrolled successfully.', 'success');
    await refreshCustomerDataAfterScan();
  } catch (error) {
    const msg = error.message || 'No face detected. Please try again.';
    showAlertIn('scanStatusMessage', msg, 'error');
    showToast(msg, 'error');
  } finally {
    scanButton.disabled = false;
  }
}

async function refreshCustomerDataAfterScan() {
  await populateCustomerDropdown();
  const customerSelect = document.getElementById('faceCustomerSelect');
  if (selectedCustomerId) {
    customerSelect.value = selectedCustomerId;
  }
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}