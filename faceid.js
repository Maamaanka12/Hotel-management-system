/**
 * faceid.js
 * Simulates webcam face scanning to enroll a customer's face in the system.
 */

let scanIntervalId = null;

document.addEventListener('DOMContentLoaded', function () {
  requireAuthentication();
  renderSidebarNavigation('faceid.html');
  setupMobileSidebarToggle();
  populateCustomerDropdown();
  setupCustomerSelection();
  setupScanButton();
});

/**
 * Populates the customer dropdown from localStorage.
 */
function populateCustomerDropdown() {
  const customerSelect = document.getElementById('face-customer-select');
  const customersList = getAllCustomers();

  customerSelect.innerHTML = '<option value="">Choose a customer to enroll</option>';

  customersList.forEach(function (customer) {
    const enrolledLabel = customer.faceEnrolled ? ' (Already Enrolled)' : '';
    customerSelect.innerHTML += `
      <option value="${customer.id}">${customer.name}${enrolledLabel}</option>
    `;
  });

  if (customersList.length === 0) {
    customerSelect.innerHTML += '<option value="" disabled>No customers — add one first</option>';
  }
}

/**
 * Shows customer details when a customer is selected from the dropdown.
 */
function setupCustomerSelection() {
  const customerSelect = document.getElementById('face-customer-select');
  const scanButton = document.getElementById('start-scan-button');
  const infoPanel = document.getElementById('customer-info-panel');

  customerSelect.addEventListener('change', function () {
    resetWebcamDisplay();

    if (!customerSelect.value) {
      scanButton.disabled = true;
      infoPanel.classList.add('hidden');
      return;
    }

    const customer = findCustomerById(customerSelect.value);
    if (!customer) {
      return;
    }

    scanButton.disabled = false;
    infoPanel.classList.remove('hidden');

    document.getElementById('info-customer-name').textContent = customer.name;
    document.getElementById('info-customer-email').textContent = customer.email;
    document.getElementById('info-customer-national-id').textContent = customer.nationalId;
    document.getElementById('info-face-status').textContent = customer.faceEnrolled ? 'Enrolled' : 'Not Enrolled';

    if (customer.faceEnrolled) {
      scanButton.textContent = 'Re-enroll Face Scan';
    } else {
      scanButton.textContent = 'Start Face Scan';
    }
  });
}

/**
 * Resets the webcam display to its idle state.
 */
function resetWebcamDisplay() {
  if (scanIntervalId) {
    clearInterval(scanIntervalId);
    scanIntervalId = null;
  }

  document.getElementById('webcam-idle').classList.remove('hidden');
  document.getElementById('webcam-scanning').classList.add('hidden');
  document.getElementById('webcam-success').classList.add('hidden');
  document.getElementById('scan-progress-bar').style.width = '0%';
}

/**
 * Starts the simulated face scan animation and enrolls the customer on completion.
 */
function setupScanButton() {
  const scanButton = document.getElementById('start-scan-button');

  scanButton.addEventListener('click', function () {
    const customerId = document.getElementById('face-customer-select').value;

    if (!customerId) {
      showAlertMessage('Please select a customer first.', 'error');
      return;
    }

    startSimulatedFaceScan(customerId);
  });
}

/**
 * Runs a progress animation simulating a webcam face scan,
 * then marks the customer as face-enrolled in localStorage.
 */
function startSimulatedFaceScan(customerId) {
  const scanButton = document.getElementById('start-scan-button');
  scanButton.disabled = true;

  document.getElementById('webcam-idle').classList.add('hidden');
  document.getElementById('webcam-success').classList.add('hidden');
  document.getElementById('webcam-scanning').classList.remove('hidden');

  let progressPercent = 0;
  const progressBar = document.getElementById('scan-progress-bar');
  progressBar.style.width = '0%';

  scanIntervalId = setInterval(function () {
    progressPercent += 5;
    progressBar.style.width = progressPercent + '%';

    if (progressPercent >= 100) {
      clearInterval(scanIntervalId);
      scanIntervalId = null;
      completeFaceEnrollment(customerId);
    }
  }, 150);
}

/**
 * Marks the customer as face-enrolled and updates the UI.
 */
function completeFaceEnrollment(customerId) {
  updateCustomerFaceEnrolled(customerId, true);

  document.getElementById('webcam-scanning').classList.add('hidden');
  document.getElementById('webcam-success').classList.remove('hidden');
  document.getElementById('info-face-status').textContent = 'Enrolled';

  const scanButton = document.getElementById('start-scan-button');
  scanButton.disabled = false;
  scanButton.textContent = 'Re-enroll Face Scan';

  populateCustomerDropdown();
  document.getElementById('face-customer-select').value = customerId;

  showAlertMessage('Face enrolled successfully for this customer.', 'success');
}
