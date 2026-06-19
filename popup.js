const statusText = document.getElementById('statusText');
const logText = document.getElementById('logText');
const toggleBtn = document.getElementById('toggleBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');

async function getStorage(keys) {
  return await chrome.storage.local.get(keys);
}

async function setStorage(values) {
  return await chrome.storage.local.set(values);
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

async function refresh() {
  const { spoilerDetectorEnabled = false, spoilerDetectionLogs = [] } = await getStorage([
    'spoilerDetectorEnabled',
    'spoilerDetectionLogs'
  ]);

  statusText.textContent = spoilerDetectorEnabled ? 'Active' : 'Inactive';
  toggleBtn.textContent = spoilerDetectorEnabled ? 'Deactivate' : 'Activate';
  logText.textContent = `${spoilerDetectionLogs.length} processed messages`;
}

toggleBtn.addEventListener('click', async () => {
  const { spoilerDetectorEnabled = false } = await getStorage(['spoilerDetectorEnabled']);
  await setStorage({ spoilerDetectorEnabled: !spoilerDetectorEnabled });
  await refresh();
});

clearBtn.addEventListener('click', async () => {
  await setStorage({ spoilerDetectionLogs: [] });
  await refresh();
});

downloadBtn.addEventListener('click', async () => {
  const { spoilerDetectionLogs = [] } = await getStorage(['spoilerDetectionLogs']);
  const header = [
    'timestamp',
    'channel',
    'username',
    'message',
    'is_spoiler',
    'method',
    'matched_rule',
    'processing_time_ms',
    'comparisons'
  ];

  const rows = spoilerDetectionLogs.map((row) => [
    row.timestamp,
    row.channel,
    row.username,
    row.message,
    row.isSpoiler,
    row.method,
    row.matchedRule,
    row.processingTimeMs,
    row.comparisons
  ].map(csvEscape).join(','));

  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'twitch_spoiler_detection_log.csv';
  a.click();
  URL.revokeObjectURL(url);
});

refresh();
