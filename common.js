/**
 * common.js
 * Shared UI helpers: navigation sidebar, alerts, and logout.
 * Included on every authenticated page.
 */

/**
 * Builds the sidebar navigation HTML and injects it into the page.
 * Highlights the link that matches the current page file name.
 */
function renderSidebarNavigation(activePageName) {
  const sidebarContainer = document.getElementById('sidebar-navigation');
  if (!sidebarContainer) {
    return;
  }

  const currentUser = getCurrentUser();
  const staffName = currentUser ? currentUser.fullName : 'Staff';

  const navigationLinks = [
    { href: 'dashboard.html', label: 'Dashboard', icon: '📊' },
    { href: 'rooms.html', label: 'Rooms', icon: '🛏️' },
    { href: 'customers.html', label: 'Customers', icon: '👥' },
    { href: 'bookings.html', label: 'Bookings', icon: '📅' },
    { href: 'payments.html', label: 'Payments', icon: '💳' },
    { href: 'faceid.html', label: 'Face ID', icon: '📷' },
    { href: 'controls.html', label: 'Room Controls', icon: '🎛️' }
  ];

  let linksHTML = '';
  navigationLinks.forEach(function (link) {
    const isActive = activePageName === link.href;
    const activeClasses = isActive
      ? 'bg-indigo-600 text-white'
      : 'text-slate-300 hover:bg-slate-700 hover:text-white';

    linksHTML += `
      <a href="${link.href}"
         class="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${activeClasses}">
        <span class="text-lg">${link.icon}</span>
        <span>${link.label}</span>
      </a>
    `;
  });

  sidebarContainer.innerHTML = `
    <div class="flex h-full flex-col">
      <div class="border-b border-slate-700 px-6 py-5">
        <h1 class="text-xl font-bold text-white">Grand Hotel</h1>
        <p class="mt-1 text-sm text-slate-400">Management System</p>
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto px-4 py-6">
        ${linksHTML}
      </nav>

      <div class="border-t border-slate-700 px-4 py-4">
        <p class="mb-3 truncate px-2 text-sm text-slate-400">Signed in as<br><span class="font-medium text-white">${staffName}</span></p>
        <button id="logout-button"
                class="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700">
          Logout
        </button>
      </div>
    </div>
  `;

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', function () {
      clearCurrentUser();
      window.location.href = 'index.html';
    });
  }
}

/**
 * Shows a temporary alert message at the top of the main content area.
 */
function showAlertMessage(messageText, messageType) {
  const alertContainer = document.getElementById('alert-container');
  if (!alertContainer) {
    return;
  }

  const typeStyles = {
    success: 'bg-green-100 text-green-800 border-green-300',
    error: 'bg-red-100 text-red-800 border-red-300',
    info: 'bg-blue-100 text-blue-800 border-blue-300'
  };

  const styleClasses = typeStyles[messageType] || typeStyles.info;

  alertContainer.innerHTML = `
    <div class="mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${styleClasses}">
      ${messageText}
    </div>
  `;

  setTimeout(function () {
    alertContainer.innerHTML = '';
  }, 5000);
}

/**
 * Toggles the mobile sidebar open/closed.
 */
function setupMobileSidebarToggle() {
  const menuToggleButton = document.getElementById('mobile-menu-toggle');
  const sidebarPanel = document.getElementById('sidebar-panel');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  if (!menuToggleButton || !sidebarPanel) {
    return;
  }

  function closeSidebar() {
    sidebarPanel.classList.add('-translate-x-full');
    if (sidebarOverlay) {
      sidebarOverlay.classList.add('hidden');
    }
  }

  function openSidebar() {
    sidebarPanel.classList.remove('-translate-x-full');
    if (sidebarOverlay) {
      sidebarOverlay.classList.remove('hidden');
    }
  }

  menuToggleButton.addEventListener('click', openSidebar);

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }
}
