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

let pendingRegistrationUser = null;

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
    const result = await API.post('/auth/register', { userName: email, fullName, password, userRole: role });

    // Save user session
    pendingRegistrationUser = {
      userId: result.data.User_ID,
      userName: result.data.Full_Name || fullName,
      userRole: result.data.User_Role
    };
    setCurrentUser(pendingRegistrationUser);

    // Hide the form fields and show the face registration panel
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('faceRegistrationPanel').classList.remove('hidden');
  } catch (error) {
    showAuthAlert(error.message || 'Registration failed.', 'error');
  }
}

async function handleRegisterFace() {
  if (!pendingRegistrationUser) {
    window.location.href = 'dashboard.html';
    return;
  }

  const faceBtn = document.getElementById('registerFaceBtn');
  const faceAlert = document.getElementById('faceRegistrationAlert');
  faceBtn.disabled = true;
  faceBtn.innerHTML = '<span class="flex items-center justify-center gap-2"><svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Scanning...</span>';

  try {
    await API.post('/auth/register-face', { userId: pendingRegistrationUser.userId });

    faceAlert.className = 'mb-4 px-4 py-3 rounded-lg text-sm font-medium bg-green-500/15 text-green-400 border border-green-500/30';
    faceAlert.textContent = 'Face registered successfully!';
    faceAlert.classList.remove('hidden');

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
  } catch (error) {
    const msg = error.message || 'Face registration failed. You can try again later from the Face ID page.';
    faceAlert.className = 'mb-4 px-4 py-3 rounded-lg text-sm font-medium bg-red-500/15 text-red-400 border border-red-500/30';
    faceAlert.textContent = msg;
    faceAlert.classList.remove('hidden');
    faceBtn.disabled = false;
    faceBtn.innerHTML = '<span class="flex items-center justify-center gap-2"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z"/></svg> Register Face</span>';
  }
}

function handleSkipFaceRegistration() {
  window.location.href = 'dashboard.html';
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