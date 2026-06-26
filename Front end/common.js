const SESSION_KEY = 'hms_current_user';

function getCurrentUser() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem(SESSION_KEY);
}

function requireAuthentication() {
  if (!getCurrentUser()) {
    window.location.href = 'index.html';
  }
}

function renderUserBadge() {
  const user = getCurrentUser();
  const name = user ? user.userName : 'Staff';
  const role = user ? user.userRole : '';
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');
  const initialEl = document.getElementById('userInitial');
  const headerNameEl = document.getElementById('headerUserName');
  const headerInitialEl = document.getElementById('headerUserInitial');

  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = role;
  if (initialEl) initialEl.textContent = initial;
  if (headerNameEl) headerNameEl.textContent = name;
  if (headerInitialEl) headerInitialEl.textContent = initial;
}

function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('-translate-x-full');
  if (overlay) overlay.classList.add('visible');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.add('-translate-x-full');
  if (overlay) overlay.classList.remove('visible');
}

function handleLogout() {
  clearCurrentUser();
  window.location.href = 'index.html';
}

function showAlertIn(elementId, message, type) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const styles = {
    success: 'bg-green-500/15 text-green-400 border border-green-500/30',
    error: 'bg-red-500/15 text-red-400 border border-red-500/30',
    info: 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
  };

  el.className = `px-4 py-3 rounded-lg text-sm font-medium ${styles[type] || styles.info}`;
  el.textContent = message;
  el.classList.remove('hidden');
}

function hideAlertIn(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.add('hidden');
  el.textContent = '';
}

document.addEventListener('DOMContentLoaded', renderUserBadge);



function setupMobileSidebarToggle() {
    // temporary fix
}

window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.clearCurrentUser = clearCurrentUser;

window.requireAuthentication = requireAuthentication;
window.renderUserBadge = renderUserBadge;

window.setupMobileSidebarToggle = setupMobileSidebarToggle;
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;

window.handleLogout = handleLogout;

window.showAlertIn = showAlertIn;
window.hideAlertIn = hideAlertIn;