/**
 * Jaro–Winkler string similarity in [0, 1].
 *
 * The Winkler prefix boost (scaling factor 0.1, max prefix 4) is only
 * applied when the base Jaro similarity exceeds 0.7, per the original
 * algorithm — this avoids inflating scores for dissimilar strings that
 * merely share a first letter.
 */
const SCALING_FACTOR = 0.1;
const BOOST_THRESHOLD = 0.7;
const MAX_PREFIX = 4;

function jaro(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;
  if (s1 === s2) return 1;

  const matchDistance = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
  const matched1 = new Array<boolean>(len1).fill(false);
  const matched2 = new Array<boolean>(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (matched2[j] || s1[i] !== s2[j]) continue;
      matched1[i] = matched2[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!matched1[i]) continue;
    while (!matched2[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  return (
    (matches / len1 + matches / len2 + (matches - transpositions) / matches) / 3
  );
}

export function jaroWinkler(s1: string, s2: string): number {
  const jaroScore = jaro(s1, s2);
  if (jaroScore <= BOOST_THRESHOLD) return jaroScore;

  let prefix = 0;
  const maxPrefix = Math.min(MAX_PREFIX, s1.length, s2.length);
  while (prefix < maxPrefix && s1[prefix] === s2[prefix]) prefix++;

  return jaroScore + prefix * SCALING_FACTOR * (1 - jaroScore);
}

export default jaroWinkler;
