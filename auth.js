/**
 * auth.js
 * Handles staff login, registration, and session redirect on index.html.
 */

document.addEventListener('DOMContentLoaded', function () {
  redirectIfAlreadyLoggedIn();
  setupAuthTabSwitching();
  setupLoginForm();
  setupRegisterForm();
});

/**
 * If a staff member is already signed in, send them to the dashboard.
 */
function redirectIfAlreadyLoggedIn() {
  if (getCurrentUser()) {
    window.location.href = 'dashboard.html';
  }
}

/**
 * Switches between the Login and Register tabs and forms.
 */
function setupAuthTabSwitching() {
  const loginTabButton = document.getElementById('show-login-tab');
  const registerTabButton = document.getElementById('show-register-tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  loginTabButton.addEventListener('click', function () {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginTabButton.classList.add('bg-white', 'text-indigo-700', 'shadow');
    loginTabButton.classList.remove('text-slate-500');
    registerTabButton.classList.remove('bg-white', 'text-indigo-700', 'shadow');
    registerTabButton.classList.add('text-slate-500');
    clearAuthAlert();
  });

  registerTabButton.addEventListener('click', function () {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    registerTabButton.classList.add('bg-white', 'text-indigo-700', 'shadow');
    registerTabButton.classList.remove('text-slate-500');
    loginTabButton.classList.remove('bg-white', 'text-indigo-700', 'shadow');
    loginTabButton.classList.add('text-slate-500');
    clearAuthAlert();
  });
}

/**
 * Validates and processes the login form submission.
 */
function setupLoginForm() {
  const loginForm = document.getElementById('login-form');

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const emailAddress = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!emailAddress || !password) {
      showAuthAlert('Please fill in all required fields.', 'error');
      return;
    }

    const matchedUser = findUserByEmail(emailAddress);

    if (!matchedUser) {
      showAuthAlert('No account found with this email address.', 'error');
      return;
    }

    if (matchedUser.password !== password) {
      showAuthAlert('Incorrect password. Please try again.', 'error');
      return;
    }

    setCurrentUser({
      id: matchedUser.id,
      fullName: matchedUser.fullName,
      email: matchedUser.email
    });

    window.location.href = 'dashboard.html';
  });
}

/**
 * Validates and processes the registration form submission.
 * Prevents duplicate email addresses in localStorage.
 */
function setupRegisterForm() {
  const registerForm = document.getElementById('register-form');

  registerForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const fullName = document.getElementById('register-full-name').value.trim();
    const emailAddress = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    if (!fullName || !emailAddress || !password || !confirmPassword) {
      showAuthAlert('Please fill in all required fields.', 'error');
      return;
    }

    if (password.length < 6) {
      showAuthAlert('Password must be at least 6 characters long.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showAuthAlert('Passwords do not match.', 'error');
      return;
    }

    const existingUser = findUserByEmail(emailAddress);
    if (existingUser) {
      showAuthAlert('An account with this email already exists. Please login instead.', 'error');
      return;
    }

    const newUser = {
      id: generateUniqueId(),
      fullName: fullName,
      email: emailAddress.toLowerCase(),
      password: password,
      createdAt: new Date().toISOString()
    };

    registerNewUser(newUser);

    setCurrentUser({
      id: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email
    });

    showAuthAlert('Account created successfully! Redirecting...', 'success');

    setTimeout(function () {
      window.location.href = 'dashboard.html';
    }, 1000);
  });
}

/**
 * Displays an alert message on the authentication page.
 */
function showAuthAlert(messageText, messageType) {
  const alertElement = document.getElementById('auth-alert');
  if (!alertElement) {
    return;
  }

  const typeStyles = {
    success: 'bg-green-100 text-green-800 border-green-300',
    error: 'bg-red-100 text-red-800 border-red-300'
  };

  alertElement.className = 'mb-4 rounded-lg border px-4 py-3 text-sm font-medium ' + (typeStyles[messageType] || typeStyles.error);
  alertElement.textContent = messageText;
  alertElement.classList.remove('hidden');
}

/**
 * Clears the authentication alert message.
 */
function clearAuthAlert() {
  const alertElement = document.getElementById('auth-alert');
  if (alertElement) {
    alertElement.classList.add('hidden');
    alertElement.textContent = '';
  }
}
