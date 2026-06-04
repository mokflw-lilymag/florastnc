/** Shared sync status (main process) for IPC + diagnostics */
const state = {
  ordersCount: 0,
  customersCount: 0,
  lastSyncAt: null,
  lastError: null,
  supabaseConfigured: false,
};

function updateSyncState(patch) {
  Object.assign(state, patch);
}

function getSyncState() {
  return { ...state };
}

module.exports = { updateSyncState, getSyncState };
