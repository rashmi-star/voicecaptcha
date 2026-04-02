/** Split display words (preserve punctuation on tokens). */
export function splitPhraseWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

function normalizeWord(w: string): string {
  return stripDiacritics(w)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']/gu, "");
}

export function tokenizeTranscript(s: string): string[] {
  const t = stripDiacritics(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ");
  return t.trim().split(/\s+/).filter(Boolean);
}

function wordsMatch(expected: string, heard: string): boolean {
  const a = normalizeWord(expected);
  const b = normalizeWord(heard);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 2 && b.length >= 2 && (a.startsWith(b) || b.startsWith(a))) return true;
  if (a.length > 3 && b.length > 3) {
    let diff = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) if (a[i] !== b[i]) diff++;
    diff += Math.abs(a.length - b.length);
    return diff <= 1;
  }
  return false;
}

/**
 * Longest number of leading phrase words matched in order as a subsequence of
 * transcript tokens (handles fillers like “um” between words).
 */
export function countReadProgress(phraseWords: string[], transcript: string): number {
  if (phraseWords.length === 0) return 0;
  const tokens = tokenizeTranscript(transcript);
  let pi = 0;
  for (let ti = 0; ti < tokens.length && pi < phraseWords.length; ti++) {
    if (wordsMatch(phraseWords[pi], tokens[ti])) pi++;
  }
  return pi;
}
