import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectSpoiler } from './nodeDetector.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = (...parts) => path.join(ROOT, 'data', ...parts);
const outputPath = (...parts) => path.join(ROOT, 'experiments', ...parts);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function readDataset(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').trim();
  const lines = content.split(/\r?\n/);
  const header = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(header.map((key, index) => [key, values[index]]));
    return {
      id: Number(row.id),
      message: row.message,
      label: Number(row.label)
    };
  });
}

function calculateMetrics(rows) {
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (const row of rows) {
    if (row.label === 1 && row.predicted === 1) tp += 1;
    if (row.label === 0 && row.predicted === 0) tn += 1;
    if (row.label === 0 && row.predicted === 1) fp += 1;
    if (row.label === 1 && row.predicted === 0) fn += 1;
  }

  const total = rows.length;
  const accuracy = total ? (tp + tn) / total : 0;
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  const avgTime = total ? rows.reduce((sum, row) => sum + row.processingTimeMs, 0) / total : 0;
  const avgComparisons = total ? rows.reduce((sum, row) => sum + row.comparisons, 0) / total : 0;

  return {
    total,
    tp,
    tn,
    fp,
    fn,
    accuracy,
    precision,
    recall,
    f1,
    avgTimeMs: avgTime,
    avgComparisons
  };
}

function formatNumber(value) {
  return Number(value).toFixed(4);
}

function csvEscape(value) {
  const str = String(value ?? '').replace(/"/g, '""');
  return `"${str}"`;
}

const rules = {
  phrases: readJson(dataPath('spoiler_phrases.json')),
  entities: readJson(dataPath('spoiler_entities.json')),
  actions: readJson(dataPath('spoiler_actions.json')),
  patterns: readJson(dataPath('spoiler_patterns.json'))
};

const dataset = readDataset(dataPath('sample_dataset.csv'));
const modes = ['phrase', 'entity-action', 'hybrid'];
const summaries = [];
const detailedRows = [];

for (const mode of modes) {
  const rows = dataset.map((item) => {
    const result = detectSpoiler(item.message, rules, mode);
    const row = {
      mode,
      id: item.id,
      message: item.message,
      label: item.label,
      predicted: result.isSpoiler ? 1 : 0,
      method: result.method,
      matchedRule: result.matchedRule,
      processingTimeMs: result.processingTimeMs,
      comparisons: result.comparisons
    };
    detailedRows.push(row);
    return row;
  });

  summaries.push({ mode, ...calculateMetrics(rows) });
}

fs.mkdirSync(outputPath(), { recursive: true });

const resultJson = { generatedAt: new Date().toISOString(), summaries, detailedRows };
fs.writeFileSync(outputPath('results.json'), JSON.stringify(resultJson, null, 2));

const summaryHeader = [
  'mode', 'total', 'tp', 'tn', 'fp', 'fn', 'accuracy', 'precision', 'recall', 'f1', 'avg_time_ms', 'avg_comparisons'
];
const summaryRows = summaries.map((row) => [
  row.mode,
  row.total,
  row.tp,
  row.tn,
  row.fp,
  row.fn,
  formatNumber(row.accuracy),
  formatNumber(row.precision),
  formatNumber(row.recall),
  formatNumber(row.f1),
  formatNumber(row.avgTimeMs),
  formatNumber(row.avgComparisons)
].join(','));

const detailHeader = [
  'mode', 'id', 'message', 'label', 'predicted', 'method', 'matched_rule', 'processing_time_ms', 'comparisons'
];
const detailRows = detailedRows.map((row) => [
  row.mode,
  row.id,
  csvEscape(row.message),
  row.label,
  row.predicted,
  csvEscape(row.method),
  csvEscape(row.matchedRule),
  formatNumber(row.processingTimeMs),
  row.comparisons
].join(','));

fs.writeFileSync(
  outputPath('results.csv'),
  [
    '# Summary',
    summaryHeader.join(','),
    ...summaryRows,
    '',
    '# Details',
    detailHeader.join(','),
    ...detailRows
  ].join('\n')
);

console.table(summaries.map((row) => ({
  mode: row.mode,
  accuracy: formatNumber(row.accuracy),
  precision: formatNumber(row.precision),
  recall: formatNumber(row.recall),
  f1: formatNumber(row.f1),
  avgTimeMs: formatNumber(row.avgTimeMs),
  avgComparisons: formatNumber(row.avgComparisons)
})));
console.log('Saved:', outputPath('results.json'));
console.log('Saved:', outputPath('results.csv'));
