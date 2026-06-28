document.addEventListener('DOMContentLoaded', function () {
  redirectIfAlreadyLoggedIn();
});

function redirectIfAlreadyLoggedIn() {
  if (getCurrentUser()) {
    window.location.href = 'dashboard.html';
  }
}

function switchTab(tabName) {
  const loginTabButton = document.getElementById('loginTabButton');
  const registerTabButton = document.getElementById('registerTabButton');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  const activeClasses = ['text-white', 'border-gold'];
  const inactiveClasses = ['text-slate-400', 'border-transparent'];

  if (tabName === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginTabButton.classList.add(...activeClasses);
    loginTabButton.classList.remove(...inactiveClasses);
    registerTabButton.classList.add(...inactiveClasses);
    registerTabButton.classList.remove(...activeClasses);
  } else {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    registerTabButton.classList.add(...activeClasses);
    registerTabButton.classList.remove(...inactiveClasses);
    loginTabButton.classList.add(...inactiveClasses);
    loginTabButton.classList.remove(...activeClasses);
  }

  clearAuthAlert();
}

function togglePasswordVisibility(inputId, toggleButton) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}


async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showAuthAlert('Please fill in all fields.', 'error');
    return;
  }

  try {
    // const result = await API.post('/auth/login', { email, password });
      const result = await API.post('/auth/login', { userName: email, password });


    const displayName = result.data.Full_Name || result.data.User_Name;

    setCurrentUser({
      userId: result.data.User_ID,
      userName: displayName,
      userRole: result.data.User_Role
    });

    window.location.href = 'dashboard.html';
  } catch (error) {
    showAuthAlert(error.message || 'Invalid email or password.', 'error');
  }
}

async function handleRegister() {
  const fullName = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const role = document.getElementById('registerRole').value;
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;

  if (!fullName || !email || !role || !password || !confirmPassword) {
    showAuthAlert('Please fill in all fields.', 'error');
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

  try {
    // const result = await API.post('/auth/register', { fullName, email, password, userRole: role });
    const result = await API.post('/auth/register', { userName: email, fullName, password, userRole: role });

    // redirect straight to dashboard
    setCurrentUser({
      userId: result.data.User_ID,
      userName: result.data.Full_Name || fullName,
      userRole: result.data.User_Role
    });

    window.location.href = 'dashboard.html';
  } catch (error) {
    showAuthAlert(error.message || 'Registration failed.', 'error');
  }
}

function showAuthAlert(message, type) {
  const alertBanner = document.getElementById('alertBanner');
  if (!alertBanner) return;

  const styles = {
    success: 'bg-green-500/15 text-green-400 border border-green-500/30',
    error: 'bg-red-500/15 text-red-400 border border-red-500/30'
  };

  alertBanner.className = `mb-5 px-4 py-3 rounded-lg text-sm font-medium ${styles[type] || styles.error}`;
  alertBanner.textContent = message;
  alertBanner.classList.remove('hidden');
}

function clearAuthAlert() {
  const alertBanner = document.getElementById('alertBanner');
  if (alertBanner) {
    alertBanner.classList.add('hidden');
    alertBanner.textContent = '';
  }
}