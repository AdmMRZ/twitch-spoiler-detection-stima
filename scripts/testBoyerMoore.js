import assert from 'node:assert/strict';
import { boyerMooreSearch, detectSpoiler, normalizeText } from './nodeDetector.js';

const cases = [
  ['tony stark mati di akhir', 'tony stark mati', true],
  ['film ini aman', 'tony stark mati', false],
  ['gojo nanti disegel', 'gojo', true],
  ['G0J0 nanti di-segel!!!', 'gojo', true],
  ['iroooon-man dies pas ending', 'iron man dies', true],
  ['plot_twist dia MATIII', 'plot twist dia mati', true]
];

for (const [text, pattern, expected] of cases) {
  const result = boyerMooreSearch(text, pattern);
  assert.equal(
    result.found,
    expected,
    `Expected "${text}" ${expected ? 'to match' : 'not to match'} "${pattern}"`
  );
  console.log({
    text,
    normalizedText: normalizeText(text),
    pattern,
    normalizedPattern: normalizeText(pattern),
    result
  });
}

const rules = {
  phrases: ['iron man dies', 'plot twist dia mati'],
  entities: ['gojo', 'tony stark'],
  actions: ['segel', 'tewas', 'mati'],
  patterns: ['.*ternyata .*(villain|pengkhianat).*']
};

const detectionCases = [
  ['G0J0 nanti di-segel!!!', true],
  ['tony stark tewas di ending', true],
  ['visual stream ini aman banget', false]
];

for (const [message, expected] of detectionCases) {
  const result = detectSpoiler(message, rules);
  assert.equal(
    result.isSpoiler,
    expected,
    `Expected detector ${expected ? 'to flag' : 'not to flag'} "${message}"`
  );
  console.log({ message, normalizedMessage: normalizeText(message), result });
}
