/*
 * layout.js
 * Renders the shared sidebar + top bar for every protected page and wires up
 * navigation and logout. Each page sets a global "PAGE_NAME" before loading
 * this script so the matching nav link is highlighted.
 */

function buildLayout() {
  const currentUser = Database.getCurrentUser();
  const userName = currentUser ? currentUser.name : "Staff";

  const navigationItems = [
    { label: "Dashboard", href: "dashboard.html", key: "dashboard" },
    { label: "Rooms", href: "rooms.html", key: "rooms" },
    { label: "Customers", href: "customers.html", key: "customers" },
    { label: "Bookings", href: "bookings.html", key: "bookings" },
    { label: "Payments", href: "payments.html", key: "payments" },
    { label: "Face ID", href: "faceid.html", key: "faceid" },
    { label: "Room Controls", href: "controls.html", key: "controls" },
  ];

  const navigationLinks = navigationItems
    .map(function (item) {
      const isActive = item.key === window.PAGE_NAME;
      const activeClasses = isActive
        ? "bg-teal-600 text-white"
        : "text-slate-300 hover:bg-slate-700 hover:text-white";
      return (
        '<a href="' +
        item.href +
        '" class="block rounded-lg px-4 py-2.5 text-sm font-medium transition ' +
        activeClasses +
        '">' +
        item.label +
        "</a>"
      );
    })
    .join("");

  const sidebar =
    '<aside id="sidebar" class="fixed inset-y-0 left-0 z-30 w-64 -translate-x-full transform bg-slate-800 transition-transform duration-200 lg:translate-x-0">' +
    '<div class="flex h-16 items-center gap-3 border-b border-slate-700 px-6">' +
    '<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">GV</div>' +
    '<span class="text-base font-semibold text-white">Grand Vista</span>' +
    "</div>" +
    '<nav class="space-y-1 p-4">' +
    navigationLinks +
    "</nav>" +
    "</aside>";

  const topBar =
    '<header class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">' +
    '<button id="menuToggle" class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Toggle menu">' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
    "</button>" +
    '<h1 id="pageTitle" class="text-lg font-semibold text-slate-900">' + (window.PAGE_TITLE || "") + "</h1>" +
    '<div class="flex items-center gap-3">' +
    '<span class="hidden text-sm text-slate-600 sm:inline">Hi, ' + userName + "</span>" +
    '<button id="logoutButton" class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200">Logout</button>' +
    "</div>" +
    "</header>";

  const overlay =
    '<div id="sidebarOverlay" class="fixed inset-0 z-20 hidden bg-black/40 lg:hidden"></div>';

  const layoutMarkup =
    sidebar +
    overlay +
    '<div class="lg:pl-64">' +
    topBar +
    '<main class="p-4 lg:p-8">' +
    '<div id="pageContent"></div>' +
    "</main>" +
    "</div>";

  document.body.className = "min-h-screen bg-slate-100 text-slate-800";
  document.body.innerHTML = layoutMarkup;

  // Wire up logout.
  document.getElementById("logoutButton").addEventListener("click", function () {
    Database.logout();
    window.location.href = "index.html";
  });

  // Wire up mobile sidebar toggle.
  const sidebarElement = document.getElementById("sidebar");
  const overlayElement = document.getElementById("sidebarOverlay");
  function openSidebar() {
    sidebarElement.classList.remove("-translate-x-full");
    overlayElement.classList.remove("hidden");
  }
  function closeSidebar() {
    sidebarElement.classList.add("-translate-x-full");
    overlayElement.classList.add("hidden");
  }
  document.getElementById("menuToggle").addEventListener("click", openSidebar);
  overlayElement.addEventListener("click", closeSidebar);
}

/* Small shared UI helpers reused across pages. */

function statusBadge(status) {
  const colorMap = {
    Available: "bg-green-100 text-green-700",
    Booked: "bg-blue-100 text-blue-700",
    Maintenance: "bg-amber-100 text-amber-700",
    Active: "bg-green-100 text-green-700",
    Completed: "bg-slate-100 text-slate-600",
    Cancelled: "bg-red-100 text-red-700",
    Paid: "bg-green-100 text-green-700",
    Pending: "bg-amber-100 text-amber-700",
    Failed: "bg-red-100 text-red-700",
    Yes: "bg-green-100 text-green-700",
    No: "bg-slate-100 text-slate-600",
  };
  const classes = colorMap[status] || "bg-slate-100 text-slate-600";
  return (
    '<span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ' +
    classes +
    '">' +
    status +
    "</span>"
  );
}

function formatMoney(amount) {
  const numberValue = Number(amount) || 0;
  return "$" + numberValue.toFixed(2);
}
