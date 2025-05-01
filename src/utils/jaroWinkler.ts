export default function jaroWinkler(s1: string, s2: string): number {
  const m = 0.1; // Scaling factor

  function jaro(s1: string, s2: string): number {
    const s1Len = s1.length;
    const s2Len = s2.length;

    if (s1Len === 0 || s2Len === 0) return 0.0;

    const matchDistance = Math.floor(Math.max(s1Len, s2Len) / 2) - 1;

    let matches = 0;
    let transpositions = 0;
    const s2MatchedIndex = new Array(s2Len).fill(false);
    const s1MatchedIndex = new Array(s1Len).fill(false);

    // Find matches
    for (let i = 0; i < s1Len; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, s2Len);

      for (let j = start; j < end; j++) {
        if (s2MatchedIndex[j] || s1[i] !== s2[j]) continue;
        s1MatchedIndex[i] = s2MatchedIndex[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // Find transpositions
    let k = 0;
    for (let i = 0; i < s1Len; i++) {
      if (!s1MatchedIndex[i]) continue;
      while (!s2MatchedIndex[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    transpositions /= 2;

    return (
      (matches / s1Len +
        matches / s2Len +
        (matches - transpositions) / matches) /
      3.0
    );
  }

  const jaroDistance = jaro(s1, s2);

  let prefixLength = 0;
  const maxPrefixLength = Math.min(4, s1.length, s2.length);
  while (
    prefixLength < maxPrefixLength &&
    s1[prefixLength] === s2[prefixLength]
  ) {
    prefixLength++;
  }

  return jaroDistance + prefixLength * m * (1 - jaroDistance);
}
