(function attachRegexMatcher(global) {
  function regexSearch(textInput, patternStrings) {
    const text = global.SpoilerBoyerMoore.normalizeText(textInput);

    for (const patternString of patternStrings) {
      const regex = new RegExp(patternString, 'i');
      if (regex.test(text)) {
        return {
          found: true,
          matched: patternString
        };
      }
    }

    return {
      found: false,
      matched: null
    };
  }

  global.SpoilerRegexMatcher = {
    regexSearch
  };
})(typeof window !== 'undefined' ? window : globalThis);
