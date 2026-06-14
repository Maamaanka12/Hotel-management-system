/*
 * auth.js
 * Handles staff login and registration using the Database (localStorage) layer.
 */

const loginTabButton = document.getElementById("loginTabButton");
const registerTabButton = document.getElementById("registerTabButton");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");

// If a user is already logged in, skip straight to the dashboard.
if (Database.getCurrentUser()) {
  window.location.href = "dashboard.html";
}

function showMessage(text, isError) {
  authMessage.textContent = text;
  authMessage.classList.remove("hidden", "bg-red-50", "text-red-700", "bg-green-50", "text-green-700");
  if (isError) {
    authMessage.classList.add("bg-red-50", "text-red-700");
  } else {
    authMessage.classList.add("bg-green-50", "text-green-700");
  }
}

function activateLoginTab() {
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  loginTabButton.classList.add("bg-white", "text-slate-900", "shadow-sm");
  loginTabButton.classList.remove("text-slate-500");
  registerTabButton.classList.remove("bg-white", "text-slate-900", "shadow-sm");
  registerTabButton.classList.add("text-slate-500");
  authMessage.classList.add("hidden");
}

function activateRegisterTab() {
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  registerTabButton.classList.add("bg-white", "text-slate-900", "shadow-sm");
  registerTabButton.classList.remove("text-slate-500");
  loginTabButton.classList.remove("bg-white", "text-slate-900", "shadow-sm");
  loginTabButton.classList.add("text-slate-500");
  authMessage.classList.add("hidden");
}

loginTabButton.addEventListener("click", activateLoginTab);
registerTabButton.addEventListener("click", activateRegisterTab);

/* ---------- Login ---------- */
loginForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    showMessage("Please fill in both email and password.", true);
    return;
  }

  const existingUser = Database.findUserByEmail(email);
  if (!existingUser || existingUser.password !== password) {
    showMessage("Invalid email or password.", true);
    return;
  }

  Database.setCurrentUser(existingUser);
  window.location.href = "dashboard.html";
});

/* ---------- Register ---------- */
registerForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  if (!name || !email || !password) {
    showMessage("Please fill in all fields.", true);
    return;
  }

  if (password.length < 4) {
    showMessage("Password must be at least 4 characters.", true);
    return;
  }

  // Validation: prevent duplicate email accounts.
  if (Database.findUserByEmail(email)) {
    showMessage("An account with this email already exists.", true);
    return;
  }

  const newUser = Database.addUser({ name: name, email: email, password: password });
  Database.setCurrentUser(newUser);
  showMessage("Account created! Redirecting...", false);
  setTimeout(function () {
    window.location.href = "dashboard.html";
  }, 700);
});
