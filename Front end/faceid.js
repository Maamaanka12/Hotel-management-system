let selectedCustomerId = null;
let allCustomersForFaceId = [];

document.addEventListener('DOMContentLoaded', async function () {
  requireAuthentication();
  renderSidebar('faceid');
  renderHeader({
    title: 'Face ID',
    subtitle: 'Enroll and verify customer face recognition'
  });
  renderUserBadge();
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
  const seeAllBtn = document.getElementById('seeAllEnrolledBtn');
  const enrolled = allCustomersForFaceId.filter((customer) => customer.Is_Face_Enrolled);

  if (countBadge) countBadge.textContent = enrolled.length;

  if (enrolled.length === 0) {
    listContainer.innerHTML = '<p class="text-slate-600 text-xs text-center py-4">No customers enrolled yet.</p>';
    if (seeAllBtn) seeAllBtn.classList.add('hidden');
    return;
  }

  // Show only first 3
  const preview = enrolled.slice(0, 3);
  listContainer.innerHTML = preview
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

  // Show 'See All' button if more than 3
  if (seeAllBtn) {
    if (enrolled.length > 3) {
      seeAllBtn.classList.remove('hidden');
    } else {
      seeAllBtn.classList.add('hidden');
    }
  }
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

// ── All Enrolled Modal ─────────────────────────────────────────────

function openAllEnrolledModal() {
  const searchInput = document.getElementById('allEnrolledSearchInput');
  if (searchInput) searchInput.value = '';
  renderAllEnrolledList();
  document.getElementById('allEnrolledModal').style.display = 'flex';
}

function filterAllEnrolled() {
  renderAllEnrolledList();
}

function renderAllEnrolledList() {
  const query = (document.getElementById('allEnrolledSearchInput').value || '').trim().toLowerCase();
  const enrolled = allCustomersForFaceId.filter((c) => c.Is_Face_Enrolled);
  const filtered = !query
    ? enrolled
    : enrolled.filter((c) => {
        return (
          String(c.Full_Name || '').toLowerCase().includes(query) ||
          String(c.Email || '').toLowerCase().includes(query)
        );
      });

  const listEl = document.getElementById('allEnrolledList');
  const countEl = document.getElementById('allEnrolledModalCount');
  const matchEl = document.getElementById('allEnrolledMatchCount');
  if (countEl) countEl.textContent = enrolled.length;

  // Show match count when searching
  if (matchEl) {
    if (query) {
      matchEl.textContent = `${filtered.length} of ${enrolled.length} customers match "${query}"`;
      matchEl.classList.remove('hidden');
    } else {
      matchEl.classList.add('hidden');
    }
  }

  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="text-slate-600 text-xs text-center py-4">No enrolled customers found.</p>';
  } else {
    listEl.innerHTML = filtered
      .map(
        (customer) => `
        <div class="flex items-center gap-3 px-3 py-2.5 rounded-lg" style="background: var(--bg-input);">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style="background: linear-gradient(135deg, #1e3a5f, #2a5298);">
            ${escapeHtml((customer.Full_Name || '?').charAt(0).toUpperCase())}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-slate-200 text-sm font-medium truncate">${escapeHtml(customer.Full_Name)}</p>
            <p class="text-slate-500 text-xs truncate">${escapeHtml(customer.Email || '—')}</p>
          </div>
          <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">Enrolled</span>
        </div>
      `
      )
      .join('');
  }
}

function closeAllEnrolledModal() {
  document.getElementById('allEnrolledModal').style.display = 'none';
}

function handleAllEnrolledBackdropClick(event) {
  if (event.target.id === 'allEnrolledModal') closeAllEnrolledModal();
}