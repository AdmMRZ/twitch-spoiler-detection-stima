(function attachDetector(global) {
  function createDetectionResult({ isSpoiler, method, matchedRule, processingTimeMs, comparisons, details }) {
    return {
      isSpoiler,
      method: method || 'None',
      matchedRule: matchedRule || null,
      processingTimeMs,
      comparisons: comparisons || 0,
      details: details || {}
    };
  }

  function detectSpoiler(message, rules) {
    const start = performance.now();
    let totalComparisons = 0;

    const phraseResult = global.SpoilerBoyerMoore.findFirstBoyerMoore(message, rules.phrases);
    totalComparisons += phraseResult.comparisons;

    if (phraseResult.found) {
      return createDetectionResult({
        isSpoiler: true,
        method: 'Boyer-Moore Phrase',
        matchedRule: phraseResult.matched,
        processingTimeMs: Number((performance.now() - start).toFixed(4)),
        comparisons: totalComparisons,
        details: { position: phraseResult.position }
      });
    }

    const entityResult = global.SpoilerBoyerMoore.findFirstBoyerMoore(message, rules.entities);
    totalComparisons += entityResult.comparisons;

    const actionResult = global.SpoilerBoyerMoore.findFirstBoyerMoore(message, rules.actions);
    totalComparisons += actionResult.comparisons;

    if (entityResult.found && actionResult.found) {
      return createDetectionResult({
        isSpoiler: true,
        method: 'Boyer-Moore Entity-Action',
        matchedRule: `${entityResult.matched} + ${actionResult.matched}`,
        processingTimeMs: Number((performance.now() - start).toFixed(4)),
        comparisons: totalComparisons,
        details: {
          entity: entityResult.matched,
          action: actionResult.matched
        }
      });
    }

    const regexResult = global.SpoilerRegexMatcher.regexSearch(message, rules.patterns);

    if (regexResult.found) {
      return createDetectionResult({
        isSpoiler: true,
        method: 'Regex Pattern',
        matchedRule: regexResult.matched,
        processingTimeMs: Number((performance.now() - start).toFixed(4)),
        comparisons: totalComparisons
      });
    }

    return createDetectionResult({
      isSpoiler: false,
      method: 'None',
      matchedRule: null,
      processingTimeMs: Number((performance.now() - start).toFixed(4)),
      comparisons: totalComparisons
    });
  }

  global.SpoilerDetector = {
    detectSpoiler
  };
})(typeof window !== 'undefined' ? window : globalThis);
