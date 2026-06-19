(function attachLogger(global) {
  const STORAGE_KEY = 'spoilerDetectionLogs';
  const MAX_LOGS = 1500;

  async function appendDetectionLog(row) {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const logs = result[STORAGE_KEY] || [];
    logs.push(row);

    if (logs.length > MAX_LOGS) {
      logs.splice(0, logs.length - MAX_LOGS);
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: logs });
  }

  function getCurrentChannel() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts[0] || 'unknown';
  }

  global.SpoilerLogger = {
    appendDetectionLog,
    getCurrentChannel
  };
})(typeof window !== 'undefined' ? window : globalThis);
