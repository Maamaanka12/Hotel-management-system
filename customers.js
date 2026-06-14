/*
 * customers.js
 * CRUD for customers: Name, Phone, Email, National ID, Face Enrolled status.
 */

buildLayout();

let editingCustomerId = null;

function renderCustomersPage() {
  const content =
    '<div class="mb-5 flex items-center justify-between">' +
    '<p class="text-sm text-slate-500">Manage hotel customers</p>' +
    '<button id="addCustomerButton" class="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700">+ Add Customer</button>' +
    "</div>" +
    '<div id="customersTableContainer" class="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"></div>' +
    buildCustomerModalShell();

  document.getElementById("pageContent").innerHTML = content;

  document.getElementById("addCustomerButton").addEventListener("click", function () {
    openCustomerModal(null);
  });
  document.getElementById("customerModalCloseButton").addEventListener("click", closeCustomerModal);
  document.getElementById("customerModalCancelButton").addEventListener("click", closeCustomerModal);
  document.getElementById("customerForm").addEventListener("submit", saveCustomer);

  renderCustomersTable();
}

function buildCustomerModalShell() {
  return (
    '<div id="customerModal" class="fixed inset-0 z-40 hidden items-center justify-center bg-black/40 p-4">' +
    '<div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">' +
    '<div class="mb-4 flex items-center justify-between">' +
    '<h2 id="customerModalTitle" class="text-lg font-semibold text-slate-900">Add Customer</h2>' +
    '<button id="customerModalCloseButton" class="text-slate-400 hover:text-slate-600">&times;</button>' +
    "</div>" +
    '<form id="customerForm" class="space-y-4">' +
    customerTextField("customerName", "Full Name", "text", "e.g. John Smith") +
    customerTextField("customerPhone", "Phone", "tel", "e.g. 555-123-4567") +
    customerTextField("customerEmail", "Email", "email", "e.g. john@email.com") +
    customerTextField("customerNationalId", "National ID", "text", "e.g. AB1234567") +
    '<div><label class="mb-1 block text-sm font-medium text-slate-700">Face Enrolled</label>' +
    '<select id="customerFaceEnrolled" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">' +
    '<option value="No">No</option><option value="Yes">Yes</option></select></div>' +
    '<p id="customerError" class="hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"></p>' +
    '<div class="flex justify-end gap-3 pt-2">' +
    '<button type="button" id="customerModalCancelButton" class="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">Cancel</button>' +
    '<button type="submit" class="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Save</button>' +
    "</div>" +
    "</form>" +
    "</div>" +
    "</div>"
  );
}

function customerTextField(id, label, inputType, placeholder) {
  return (
    '<div><label class="mb-1 block text-sm font-medium text-slate-700">' +
    label +
    '</label><input type="' +
    inputType +
    '" id="' +
    id +
    '" placeholder="' +
    placeholder +
    '" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></div>'
  );
}

function renderCustomersTable() {
  const customers = Database.getCustomers();
  let rows = "";

  if (customers.length === 0) {
    rows =
      '<tr><td colspan="6" class="px-4 py-8 text-center text-sm text-slate-400">No customers added yet.</td></tr>';
  } else {
    rows = customers
      .map(function (customer) {
        return (
          '<tr class="border-t border-slate-100">' +
          '<td class="px-4 py-3 text-sm font-medium text-slate-800">' + customer.name + "</td>" +
          '<td class="px-4 py-3 text-sm text-slate-700">' + customer.phone + "</td>" +
          '<td class="px-4 py-3 text-sm text-slate-700">' + customer.email + "</td>" +
          '<td class="px-4 py-3 text-sm text-slate-700">' + customer.nationalId + "</td>" +
          '<td class="px-4 py-3">' + statusBadge(customer.faceEnrolled) + "</td>" +
          '<td class="px-4 py-3 text-right">' +
          '<button data-edit="' + customer.id + '" class="mr-2 text-sm font-medium text-teal-600 hover:underline">Edit</button>' +
          '<button data-delete="' + customer.id + '" class="text-sm font-medium text-red-600 hover:underline">Delete</button>' +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  document.getElementById("customersTableContainer").innerHTML =
    '<div class="overflow-x-auto"><table class="w-full min-w-[700px]">' +
    '<thead><tr class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">' +
    '<th class="px-4 py-3">Name</th>' +
    '<th class="px-4 py-3">Phone</th>' +
    '<th class="px-4 py-3">Email</th>' +
    '<th class="px-4 py-3">National ID</th>' +
    '<th class="px-4 py-3">Face Enrolled</th>' +
    '<th class="px-4 py-3 text-right">Actions</th>' +
    "</tr></thead><tbody>" +
    rows +
    "</tbody></table></div>";

  document.querySelectorAll("[data-edit]").forEach(function (button) {
    button.addEventListener("click", function () {
      openCustomerModal(button.getAttribute("data-edit"));
    });
  });
  document.querySelectorAll("[data-delete]").forEach(function (button) {
    button.addEventListener("click", function () {
      deleteCustomer(button.getAttribute("data-delete"));
    });
  });
}

function openCustomerModal(customerId) {
  editingCustomerId = customerId;
  const modal = document.getElementById("customerModal");
  document.getElementById("customerError").classList.add("hidden");

  if (customerId) {
    const customer = Database.getCustomerById(customerId);
    document.getElementById("customerModalTitle").textContent = "Edit Customer";
    document.getElementById("customerName").value = customer.name;
    document.getElementById("customerPhone").value = customer.phone;
    document.getElementById("customerEmail").value = customer.email;
    document.getElementById("customerNationalId").value = customer.nationalId;
    document.getElementById("customerFaceEnrolled").value = customer.faceEnrolled;
  } else {
    document.getElementById("customerModalTitle").textContent = "Add Customer";
    document.getElementById("customerName").value = "";
    document.getElementById("customerPhone").value = "";
    document.getElementById("customerEmail").value = "";
    document.getElementById("customerNationalId").value = "";
    document.getElementById("customerFaceEnrolled").value = "No";
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeCustomerModal() {
  const modal = document.getElementById("customerModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  editingCustomerId = null;
}

function saveCustomer(event) {
  event.preventDefault();
  const errorElement = document.getElementById("customerError");

  const name = document.getElementById("customerName").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();
  const email = document.getElementById("customerEmail").value.trim();
  const nationalId = document.getElementById("customerNationalId").value.trim();
  const faceEnrolled = document.getElementById("customerFaceEnrolled").value;

  // Validation: all fields required.
  if (!name || !phone || !email || !nationalId) {
    errorElement.textContent = "Please fill in all fields.";
    errorElement.classList.remove("hidden");
    return;
  }

  // Validation: prevent duplicate National ID.
  const duplicate = Database.getCustomers().find(function (customer) {
    return (
      customer.nationalId.toLowerCase() === nationalId.toLowerCase() &&
      customer.id !== editingCustomerId
    );
  });
  if (duplicate) {
    errorElement.textContent = "A customer with this National ID already exists.";
    errorElement.classList.remove("hidden");
    return;
  }

  const customerData = {
    name: name,
    phone: phone,
    email: email,
    nationalId: nationalId,
    faceEnrolled: faceEnrolled,
  };

  if (editingCustomerId) {
    Database.updateCustomer(editingCustomerId, customerData);
  } else {
    Database.addCustomer(customerData);
  }

  closeCustomerModal();
  renderCustomersTable();
}

function deleteCustomer(customerId) {
  if (window.confirm("Delete this customer?")) {
    Database.deleteCustomer(customerId);
    renderCustomersTable();
  }
}

renderCustomersPage();
