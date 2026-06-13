// auth.js - Login and Registration Logic

// Check if user is already logged in
if (localStorage.getItem('hotel_currentUser')) {
    window.location.href = 'dashboard.html';
}

// Tab Switching
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTabBtn = document.getElementById('loginTabBtn');
    const registerTabBtn = document.getElementById('registerTabBtn');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginTabBtn.classList.add('bg-hotel-primary', 'text-white');
        loginTabBtn.classList.remove('text-gray-600', 'hover:text-hotel-primary');
        registerTabBtn.classList.remove('bg-hotel-primary', 'text-white');
        registerTabBtn.classList.add('text-gray-600', 'hover:text-hotel-primary');
    } else {
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        registerTabBtn.classList.add('bg-hotel-primary', 'text-white');
        registerTabBtn.classList.remove('text-gray-600', 'hover:text-hotel-primary');
        loginTabBtn.classList.remove('bg-hotel-primary', 'text-white');
        loginTabBtn.classList.add('text-gray-600', 'hover:text-hotel-primary');
    }
    
    hideAlert();
}

// Show alert message
function showAlert(message, type = 'error') {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.className = 'mt-4 p-4 rounded-lg text-white text-center font-semibold ' + 
                        (type === 'error' ? 'bg-red-500' : 'bg-green-500');
    alertDiv.textContent = message;
    alertDiv.classList.remove('hidden');
    
    setTimeout(() => {
        alertDiv.classList.add('hidden');
    }, 5000);
}

function hideAlert() {
    document.getElementById('alertMessage').classList.add('hidden');
}

// Handle Login
function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    // Validate required fields
    if (!email || !password) {
        showAlert('Please fill in all fields', 'error');
        return false;
    }

    // Get users from database
    const users = Database.getAll('hotel_users');
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        showAlert('Invalid email or password', 'error');
        return false;
    }

    // Store current user session
    const currentUser = {
        id: user.id,
        name: user.name,
        email: user.email
    };
    localStorage.setItem('hotel_currentUser', JSON.stringify(currentUser));

    // Redirect to dashboard
    window.location.href = 'dashboard.html';
    return false;
}

// Handle Registration
function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const confirmPassword = document.getElementById('registerConfirmPassword').value.trim();

    // Validate required fields
    if (!name || !email || !password || !confirmPassword) {
        showAlert('Please fill in all fields', 'error');
        return false;
    }

    // Validate password length
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters', 'error');
        return false;
    }

    // Validate password match
    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('Please enter a valid email address', 'error');
        return false;
    }

    // Check if email already exists
    const existingUser = Database.getOneByField('hotel_users', 'email', email);
    if (existingUser) {
        showAlert('An account with this email already exists', 'error');
        return false;
    }

    // Create user
    const newUser = {
        name: name,
        email: email,
        password: password,
        role: 'staff'
    };

    Database.add('hotel_users', newUser);
    
    showAlert('Account created successfully! Please sign in.', 'success');
    
    // Clear form and switch to login
    document.getElementById('registerFormElement').reset();
    setTimeout(() => {
        switchTab('login');
    }, 1500);

    return false;
}