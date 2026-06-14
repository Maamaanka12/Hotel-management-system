/*
 * controls.js
 * Simulated smart room controls. Pick a room, then toggle Lights, AC, and
 * Door Lock. State is persisted per-room via Database.saveRoomControls so it
 * is remembered when switching between rooms or reloading.
 */

buildLayout();

let selectedRoomId = null;

function renderControlsPage() {
  const content =
    '<div class="mx-auto max-w-xl">' +
    '<div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">' +
    '<p class="mb-4 text-sm text-slate-500">Select a room to manage its smart devices.</p>' +
    '<label class="mb-1 block text-sm font-medium text-slate-700">Room</label>' +
    '<select id="controlRoom" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"></select>' +
    "</div>" +
    '<div id="controlPanel" class="mt-6"></div>' +
    "</div>";

  document.getElementById("pageContent").innerHTML = content;

  populateControlRooms();
  document.getElementById("controlRoom").addEventListener("change", function (event) {
    selectedRoomId = event.target.value || null;
    renderControlPanel();
  });

  renderControlPanel();
}

function populateControlRooms() {
  const rooms = Database.getRooms();
  const select = document.getElementById("controlRoom");
  if (rooms.length === 0) {
    select.innerHTML = '<option value="">No rooms added yet</option>';
  } else {
    select.innerHTML =
      '<option value="">Select room...</option>' +
      rooms
        .map(function (room) {
          return '<option value="' + room.id + '">Room ' + room.number + " (" + room.type + ")</option>";
        })
        .join("");
  }
}

function toggleRow(label, key, isOn, description) {
  const onClasses = isOn ? "bg-teal-600" : "bg-slate-300";
  const knobPosition = isOn ? "translate-x-5" : "translate-x-0";
  return (
    '<div class="flex items-center justify-between border-t border-slate-100 px-4 py-4">' +
    '<div><p class="text-sm font-medium text-slate-800">' + label + "</p>" +
    '<p class="text-xs text-slate-400">' + description + "</p></div>" +
    '<button data-toggle="' + key + '" class="relative inline-flex h-6 w-11 items-center rounded-full transition ' + onClasses + '">' +
    '<span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition ' + knobPosition + '"></span>' +
    "</button>" +
    "</div>"
  );
}

function renderControlPanel() {
  const panel = document.getElementById("controlPanel");

  if (!selectedRoomId) {
    panel.innerHTML =
      '<div class="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">Select a room above to view its controls.</div>';
    return;
  }

  const controls = Database.getRoomControls(selectedRoomId);

  panel.innerHTML =
    '<div class="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">' +
    '<div class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Device Controls</div>' +
    toggleRow("Lights", "lights", controls.lights, controls.lights ? "On" : "Off") +
    toggleRow("Air Conditioning", "ac", controls.ac, controls.ac ? "On" : "Off") +
    toggleRow("Door Lock", "doorLocked", controls.doorLocked, controls.doorLocked ? "Locked" : "Unlocked") +
    "</div>";

  panel.querySelectorAll("[data-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      const key = button.getAttribute("data-toggle");
      const current = Database.getRoomControls(selectedRoomId);
      current.roomId = selectedRoomId;
      current[key] = !current[key];
      Database.saveRoomControls(current);
      renderControlPanel();
    });
  });
}

renderControlsPage();
