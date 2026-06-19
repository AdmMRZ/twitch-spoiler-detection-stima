(function attachBoyerMoore(global) {
  function normalizeText(value) {
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

  function buildBadCharacterTable(pattern) {
    const table = new Map();
    for (let i = 0; i < pattern.length; i += 1) {
      table.set(pattern[i], i);
    }
    return table;
  }

  function boyerMooreSearch(textInput, patternInput) {
    const text = normalizeText(textInput);
    const pattern = normalizeText(patternInput);
    const n = text.length;
    const m = pattern.length;
    let comparisons = 0;

    if (m === 0) {
      return { found: true, position: 0, comparisons };
    }

    if (m > n) {
      return { found: false, position: -1, comparisons };
    }

    const badChar = buildBadCharacterTable(pattern);
    let shift = 0;

    while (shift <= n - m) {
      let j = m - 1;

      while (j >= 0) {
        comparisons += 1;
        if (pattern[j] !== text[shift + j]) break;
        j -= 1;
      }

      if (j < 0) {
        return { found: true, position: shift, comparisons };
      }

      const mismatchedChar = text[shift + j];
      const lastOccurrence = badChar.has(mismatchedChar) ? badChar.get(mismatchedChar) : -1;
      shift += Math.max(1, j - lastOccurrence);
    }

    return { found: false, position: -1, comparisons };
  }

  function hasTokenBoundary(text, position, length) {
    const before = position <= 0 ? ' ' : text[position - 1];
    const after = position + length >= text.length ? ' ' : text[position + length];
    return /\s/.test(before) && /\s/.test(after);
  }

  function findFirstBoyerMoore(text, patterns) {
    let totalComparisons = 0;
    const normalizedText = normalizeText(text);

    for (const pattern of patterns) {
      const result = boyerMooreSearch(text, pattern);
      totalComparisons += result.comparisons;

      if (result.found && hasTokenBoundary(normalizedText, result.position, normalizeText(pattern).length)) {
        return {
          found: true,
          matched: pattern,
          position: result.position,
          comparisons: totalComparisons
        };
      }
    }

    return {
      found: false,
      matched: null,
      position: -1,
      comparisons: totalComparisons
    };
  }

  global.SpoilerBoyerMoore = {
    normalizeText,
    buildBadCharacterTable,
    boyerMooreSearch,
    hasTokenBoundary,
    findFirstBoyerMoore
  };
})(typeof window !== 'undefined' ? window : globalThis);
