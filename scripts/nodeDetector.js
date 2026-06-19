import { performance } from 'node:perf_hooks';

export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/@/g, 'a')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/(.)\1{2,}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildBadCharacterTable(pattern) {
  const table = new Map();
  for (let i = 0; i < pattern.length; i += 1) {
    table.set(pattern[i], i);
  }
  return table;
}

export function boyerMooreSearch(textInput, patternInput) {
  const text = normalizeText(textInput);
  const pattern = normalizeText(patternInput);
  const n = text.length;
  const m = pattern.length;
  let comparisons = 0;

  if (m === 0) return { found: true, position: 0, comparisons };
  if (m > n) return { found: false, position: -1, comparisons };

  const badChar = buildBadCharacterTable(pattern);
  let shift = 0;

  while (shift <= n - m) {
    let j = m - 1;

    while (j >= 0) {
      comparisons += 1;
      if (pattern[j] !== text[shift + j]) break;
      j -= 1;
    }

    if (j < 0) return { found: true, position: shift, comparisons };

    const mismatchedChar = text[shift + j];
    const lastOccurrence = badChar.has(mismatchedChar) ? badChar.get(mismatchedChar) : -1;
    shift += Math.max(1, j - lastOccurrence);
  }

  return { found: false, position: -1, comparisons };
}

export function hasTokenBoundary(text, position, length) {
  const before = position <= 0 ? ' ' : text[position - 1];
  const after = position + length >= text.length ? ' ' : text[position + length];
  return /\s/.test(before) && /\s/.test(after);
}

export function findFirstBoyerMoore(text, patterns) {
  let totalComparisons = 0;
  const normalizedText = normalizeText(text);

  for (const pattern of patterns) {
    const result = boyerMooreSearch(text, pattern);
    totalComparisons += result.comparisons;
    if (result.found && hasTokenBoundary(normalizedText, result.position, normalizeText(pattern).length)) {
      return { found: true, matched: pattern, position: result.position, comparisons: totalComparisons };
    }
  }

  return { found: false, matched: null, position: -1, comparisons: totalComparisons };
}

export function regexSearch(textInput, patternStrings) {
  const text = normalizeText(textInput);

  for (const patternString of patternStrings) {
    const regex = new RegExp(patternString, 'i');
    if (regex.test(text)) {
      return { found: true, matched: patternString };
    }
  }

  return { found: false, matched: null };
}

export function detectSpoiler(message, rules, mode = 'hybrid') {
  const start = performance.now();
  let totalComparisons = 0;

  const phraseResult = findFirstBoyerMoore(message, rules.phrases);
  totalComparisons += phraseResult.comparisons;

  if (phraseResult.found) {
    return {
      isSpoiler: true,
      method: 'Boyer-Moore Phrase',
      matchedRule: phraseResult.matched,
      processingTimeMs: performance.now() - start,
      comparisons: totalComparisons
    };
  }

  if (mode === 'phrase') {
    return {
      isSpoiler: false,
      method: 'None',
      matchedRule: null,
      processingTimeMs: performance.now() - start,
      comparisons: totalComparisons
    };
  }

  const entityResult = findFirstBoyerMoore(message, rules.entities);
  totalComparisons += entityResult.comparisons;

  const actionResult = findFirstBoyerMoore(message, rules.actions);
  totalComparisons += actionResult.comparisons;

  if (entityResult.found && actionResult.found) {
    return {
      isSpoiler: true,
      method: 'Boyer-Moore Entity-Action',
      matchedRule: `${entityResult.matched} + ${actionResult.matched}`,
      processingTimeMs: performance.now() - start,
      comparisons: totalComparisons
    };
  }

  if (mode === 'entity-action') {
    return {
      isSpoiler: false,
      method: 'None',
      matchedRule: null,
      processingTimeMs: performance.now() - start,
      comparisons: totalComparisons
    };
  }

  const regexResult = regexSearch(message, rules.patterns);
  if (regexResult.found) {
    return {
      isSpoiler: true,
      method: 'Regex Pattern',
      matchedRule: regexResult.matched,
      processingTimeMs: performance.now() - start,
      comparisons: totalComparisons
    };
  }

  return {
    isSpoiler: false,
    method: 'None',
    matchedRule: null,
    processingTimeMs: performance.now() - start,
    comparisons: totalComparisons
  };
}
