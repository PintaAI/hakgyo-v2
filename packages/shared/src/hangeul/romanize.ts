// Revised Romanization of one precomposed syllable read on its own, used as
// scaffolding under the cells of a hangeulSyllableGrid. Sound changes across
// syllables (연음, 비음화 and so on) are out of scope: a word's romanization
// is authored by hand on letter cards and contrast items.

const initials = [
  "g",
  "kk",
  "n",
  "d",
  "tt",
  "r",
  "m",
  "b",
  "pp",
  "s",
  "ss",
  "",
  "j",
  "jj",
  "ch",
  "k",
  "t",
  "p",
  "h",
];
const vowels = [
  "a",
  "ae",
  "ya",
  "yae",
  "eo",
  "e",
  "yeo",
  "ye",
  "o",
  "wa",
  "wae",
  "oe",
  "yo",
  "u",
  "wo",
  "we",
  "wi",
  "yu",
  "eu",
  "ui",
  "i",
];
// A final is pronounced as one of seven sounds when the syllable stands alone.
const finals = [
  "",
  "k",
  "k",
  "k",
  "n",
  "n",
  "n",
  "t",
  "l",
  "k",
  "m",
  "l",
  "l",
  "l",
  "p",
  "l",
  "m",
  "p",
  "p",
  "t",
  "t",
  "ng",
  "t",
  "t",
  "k",
  "t",
  "p",
  "t",
];

/** `가` → "ga", `한` → "han"; empty for anything but one modern syllable. */
export function romanizeHangeulSyllable(syllable: string) {
  if (syllable.length !== 1) return "";
  const code = syllable.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return "";
  const initial = Math.floor(code / (21 * 28));
  const vowel = Math.floor((code % (21 * 28)) / 28);
  const final = code % 28;
  return `${initials[initial]}${vowels[vowel]}${finals[final]}`;
}
