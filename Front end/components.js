/**
 * components.js — Shared sidebar & header rendering for all HMS pages.
 *
 * Usage:
 *   renderSidebar('rooms');      // renders sidebar with "Rooms" highlighted
 *   renderHeader({ title: 'Rooms', subtitle: 'Manage rooms...', actions: '...' });
 */

/* ── Sidebar ────────────────────────────────────────────── */

const NAV_ITEMS = [
  { href: 'dashboard.html', id: 'dashboard', label: 'Dashboard', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />' },
  { href: 'rooms.html', id: 'rooms', label: 'Rooms', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />' },
  { href: 'customers.html', id: 'customers', label: 'Customers', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />' },
  { href: 'bookings.html', id: 'bookings', label: 'Bookings', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />' },
  { href: 'payments.html', id: 'payments', label: 'Payments', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />' },
];

const SMART_ITEMS = [
  { href: 'faceid.html', id: 'faceid', label: 'Face ID', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />' },
];

function renderSidebar(activePage) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  function navLink(item) {
    const isActive = item.id === activePage;
    const cls = isActive
      ? 'nav-link active flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium'
      : 'nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400';
    return `<a href="${item.href}" class="${cls}">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">${item.icon}</svg>
      ${item.label}
    </a>`;
  }

  sidebar.innerHTML = `
    <div class="px-6 py-6 border-b" style="border-color: var(--border-subtle);">
      <p class="text-gold text-xs font-semibold tracking-[0.2em] uppercase">Staff Portal</p>
      <h1 class="font-display text-white text-xl font-bold mt-1">Grand HMS</h1>
    </div>

    <nav class="flex-1 px-3 py-5 space-y-1">
      <p class="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 mb-3">Main</p>
      ${NAV_ITEMS.map(navLink).join('\n      ')}
      <p class="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 mt-5 mb-3">Smart Features</p>
      ${SMART_ITEMS.map(navLink).join('\n      ')}
    </nav>

    <div class="px-4 py-4 border-t" style="border-color: var(--border-subtle);">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style="background: linear-gradient(135deg, #B8962E, #D4AF54);">
          <span id="userInitial">?</span>
        </div>
        <div class="min-w-0">
          <p id="userName" class="text-white text-sm font-medium truncate">Loading...</p>
          <p id="userRole" class="text-slate-500 text-xs truncate">—</p>
        </div>
        <button onclick="handleLogout()" title="Sign Out" class="ml-auto text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>
    </div>
  `;
}


/* ── Header ─────────────────────────────────────────────── */

const THEME_TOGGLE_SVG = `<svg class="theme-toggle-icon w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05L5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
</svg>`;

const HAMBURGER_SVG = `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>`;

/**
 * Render the top header bar.
 * @param {Object} opts
 * @param {string} opts.title       – e.g. "Rooms"
 * @param {string} opts.subtitle    – e.g. "Manage all hotel rooms..."
 * @param {string} [opts.actions]   – HTML string for right-side buttons (theme toggle + action btns)
 */
function renderHeader(opts) {
  const header = document.querySelector('main > header');
  if (!header) return;

  header.innerHTML = `
    <button onclick="openSidebar()" class="lg:hidden text-slate-400 hover:text-white">
      ${HAMBURGER_SVG}
    </button>
    <div class="hidden lg:block">
      <h2 class="text-white font-semibold text-lg">${opts.title}</h2>
      ${opts.subtitle ? `<p class="text-slate-500 text-xs">${opts.subtitle}</p>` : ''}
    </div>
    <div class="flex items-center gap-3 ml-auto">
      <button data-theme-toggle onclick="toggleTheme()" title="Toggle light / dark mode"
        class="text-slate-400 hover:text-gold transition-colors">
        ${THEME_TOGGLE_SVG}
      </button>
      ${opts.actions || ''}
    </div>
  `;
}
