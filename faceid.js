/*
 * faceid.js
 * Simulated Face ID check-in. Selecting a customer and pressing "Scan"
 * runs a short simulated recognition animation, then marks the customer
 * as checked in. This is a front-end simulation (no real camera/biometrics).
 */

buildLayout();

let scanInProgress = false;

function renderFaceIdPage() {
  const content =
    '<div class="mx-auto max-w-xl">' +
    '<div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">' +
    '<p class="mb-4 text-sm text-slate-500">Select a guest and scan to simulate a Face ID check-in.</p>' +
    '<label class="mb-1 block text-sm font-medium text-slate-700">Guest</label>' +
    '<select id="faceCustomer" class="mb-5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"></select>' +
    '<div class="mb-5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-10">' +
    '<div id="faceScanCircle" class="flex h-28 w-28 items-center justify-center rounded-full bg-slate-200 text-slate-400 transition">' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2"/><path d="M4 16v2a2 2 0 0 0 2 2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M16 20h2a2 2 0 0 0 2-2v-2"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M9.5 15a3.5 3.5 0 0 0 5 0"/></svg>' +
    "</div>" +
    '<p id="faceScanStatus" class="mt-4 text-sm font-medium text-slate-500">Ready to scan</p>' +
    "</div>" +
    '<button id="faceScanButton" class="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">Start Face Scan</button>' +
    "</div>" +
    '<div id="checkedInContainer" class="mt-6"></div>' +
    "</div>";

  document.getElementById("pageContent").innerHTML = content;

  populateFaceCustomers();
  document.getElementById("faceScanButton").addEventListener("click", startScan);
  renderCheckedInList();
}

function populateFaceCustomers() {
  const customers = Database.getCustomers();
  const select = document.getElementById("faceCustomer");
  if (customers.length === 0) {
    select.innerHTML = '<option value="">No customers registered yet</option>';
  } else {
    select.innerHTML =
      '<option value="">Select guest...</option>' +
      customers
        .map(function (customer) {
          return '<option value="' + customer.id + '">' + customer.name + "</option>";
        })
        .join("");
  }
}

function startScan() {
  if (scanInProgress) {
    return;
  }
  const customerId = document.getElementById("faceCustomer").value;
  if (!customerId) {
    window.alert("Please select a guest to scan.");
    return;
  }

  scanInProgress = true;
  const circle = document.getElementById("faceScanCircle");
  const statusText = document.getElementById("faceScanStatus");
  const button = document.getElementById("faceScanButton");

  button.disabled = true;
  button.classList.add("opacity-60");
  circle.className =
    "flex h-28 w-28 items-center justify-center rounded-full bg-teal-100 text-teal-600 ring-4 ring-teal-200 animate-pulse transition";
  statusText.textContent = "Scanning...";
  statusText.className = "mt-4 text-sm font-medium text-teal-600";

  // Simulated recognition delay.
  window.setTimeout(function () {
    const customer = Database.getCustomerById(customerId);
    Database.updateCustomer(customerId, { checkedIn: true, checkedInAt: new Date().toISOString() });

    circle.className =
      "flex h-28 w-28 items-center justify-center rounded-full bg-green-100 text-green-600 ring-4 ring-green-200 transition";
    statusText.textContent = "Welcome, " + (customer ? customer.name : "Guest") + "! Check-in confirmed.";
    statusText.className = "mt-4 text-sm font-medium text-green-600";

    button.disabled = false;
    button.classList.remove("opacity-60");
    scanInProgress = false;

    renderCheckedInList();
  }, 2200);
}

function renderCheckedInList() {
  const checkedIn = Database.getCustomers().filter(function (customer) {
    return customer.checkedIn;
  });

  let body = "";
  if (checkedIn.length === 0) {
    body = '<p class="px-4 py-6 text-center text-sm text-slate-400">No guests checked in yet.</p>';
  } else {
    body = checkedIn
      .map(function (customer) {
        return (
          '<div class="flex items-center justify-between border-t border-slate-100 px-4 py-3">' +
          '<span class="text-sm font-medium text-slate-800">' + customer.name + "</span>" +
          statusBadge("Yes") +
          "</div>"
        );
      })
      .join("");
  }

  document.getElementById("checkedInContainer").innerHTML =
    '<div class="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">' +
    '<div class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Checked-In Guests</div>' +
    body +
    "</div>";
}

renderFaceIdPage();
