const SESSION_KEY = 'hms_current_user';
const THEME_KEY = 'hms_theme';

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

// ── Toast Notifications ───────────────────────────────────────────────

// Shows a small pop-up notification in the corner of the page.
// Styled with the theme CSS variables so it matches dark and light mode.
function showToast(message, type = 'error') {
  // Remove any existing toast so only one shows at a time
  document.querySelectorAll('.app-toast').forEach((t) => t.remove());

  const accentColors = {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  const accent = accentColors[type] || accentColors.error;

  const toast = document.createElement('div');
  toast.className = 'app-toast';
  toast.setAttribute('role', 'alert');
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 9999;
    display: flex; align-items: center; gap: 10px;
    max-width: 360px; padding: 12px 16px;
    border-radius: 10px;
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-left: 3px solid ${accent};
    color: var(--text-primary);
    font-size: 14px; font-weight: 500;
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    opacity: 0; transform: translateY(-8px);
    transition: opacity 0.25s ease, transform 0.25s ease;
  `;

  const dot = document.createElement('span');
  dot.style.cssText = `width: 8px; height: 8px; border-radius: 50%; background: ${accent}; flex-shrink: 0;`;

  const text = document.createElement('span');
  text.textContent = message;

  toast.appendChild(dot);
  toast.appendChild(text);
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Light / Dark Theme ────────────────────────────────────────────────

// Icon paths for the toggle buttons (sun = switch to light, moon = switch to dark)
const SUN_ICON_PATH = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05L5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>';
const MOON_ICON_PATH = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>';

function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
}

function applyTheme(theme, persist) {
  document.documentElement.classList.toggle('light', theme === 'light');
  if (persist !== false) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      /* storage unavailable — theme still applies for this session */
    }
  }
  updateThemeButtons();
}

function toggleTheme() {
  const isLight = document.documentElement.classList.contains('light');
  applyTheme(isLight ? 'dark' : 'light');
}

function updateThemeButtons() {
  const isLight = document.documentElement.classList.contains('light');
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    const icon = btn.querySelector('.theme-toggle-icon');
    const label = btn.querySelector('.theme-toggle-label');
    if (icon) icon.innerHTML = isLight ? MOON_ICON_PATH : SUN_ICON_PATH;
    if (label) label.textContent = isLight ? 'Dark Mode' : 'Light Mode';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getSavedTheme(), false);
  renderUserBadge();
});



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

window.showToast = showToast;

window.applyTheme = applyTheme;
window.toggleTheme = toggleTheme;
window.getSavedTheme = getSavedTheme;