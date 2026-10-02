/**
 * Banks operating in Indonesia, keyed by their Bank Indonesia bank code
 * (sandi bank), which payment gateways also use for transfers. Banks that
 * are not listed (BPR, newer banks) are saved with OTHER and a custom name.
 */
export const OTHER_BANK_CODE = "OTHER";

export const indonesianBanks = [
  { code: "002", name: "Bank Rakyat Indonesia (BRI)" },
  { code: "008", name: "Bank Mandiri" },
  { code: "009", name: "Bank Negara Indonesia (BNI)" },
  { code: "014", name: "Bank Central Asia (BCA)" },
  { code: "200", name: "Bank Tabungan Negara (BTN)" },
  { code: "451", name: "Bank Syariah Indonesia (BSI)" },
  { code: "022", name: "Bank CIMB Niaga" },
  { code: "011", name: "Bank Danamon" },
  { code: "013", name: "Bank Permata" },
  { code: "016", name: "Maybank Indonesia" },
  { code: "019", name: "Bank Panin" },
  { code: "023", name: "Bank UOB Indonesia" },
  { code: "028", name: "Bank OCBC Indonesia" },
  { code: "031", name: "Citibank" },
  { code: "032", name: "JPMorgan Chase Bank" },
  { code: "033", name: "Bank of America" },
  { code: "036", name: "Bank China Construction Bank Indonesia" },
  { code: "037", name: "Bank Artha Graha Internasional" },
  { code: "040", name: "Bangkok Bank" },
  { code: "042", name: "MUFG Bank" },
  { code: "046", name: "Bank DBS Indonesia" },
  { code: "047", name: "Bank Resona Perdania" },
  { code: "048", name: "Bank Mizuho Indonesia" },
  { code: "050", name: "Standard Chartered Bank" },
  { code: "054", name: "Bank Capital Indonesia" },
  { code: "057", name: "Bank BNP Paribas Indonesia" },
  { code: "061", name: "Bank ANZ Indonesia" },
  { code: "067", name: "Deutsche Bank" },
  { code: "069", name: "Bank of China (Hong Kong)" },
  { code: "076", name: "Bank Bumi Arta" },
  { code: "087", name: "Bank HSBC Indonesia" },
  { code: "095", name: "Bank JTrust Indonesia" },
  { code: "097", name: "Bank Mayapada Internasional" },
  { code: "110", name: "Bank BJB" },
  { code: "111", name: "Bank DKI (Bank Jakarta)" },
  { code: "112", name: "Bank BPD DIY" },
  { code: "113", name: "Bank Jateng" },
  { code: "114", name: "Bank Jatim" },
  { code: "115", name: "Bank Jambi" },
  { code: "116", name: "Bank Aceh Syariah" },
  { code: "117", name: "Bank Sumut" },
  { code: "118", name: "Bank Nagari" },
  { code: "119", name: "Bank Riau Kepri Syariah" },
  { code: "120", name: "Bank Sumsel Babel" },
  { code: "121", name: "Bank Lampung" },
  { code: "122", name: "Bank Kalsel" },
  { code: "123", name: "Bank Kalbar" },
  { code: "124", name: "Bank Kaltimtara" },
  { code: "125", name: "Bank Kalteng" },
  { code: "126", name: "Bank Sulselbar" },
  { code: "127", name: "Bank SulutGo" },
  { code: "128", name: "Bank NTB Syariah" },
  { code: "129", name: "Bank BPD Bali" },
  { code: "130", name: "Bank NTT" },
  { code: "131", name: "Bank Maluku Malut" },
  { code: "132", name: "Bank Papua" },
  { code: "133", name: "Bank Bengkulu" },
  { code: "134", name: "Bank Sulteng" },
  { code: "135", name: "Bank Sultra" },
  { code: "137", name: "Bank Banten" },
  { code: "146", name: "Bank of India Indonesia" },
  { code: "147", name: "Bank Muamalat Indonesia" },
  { code: "151", name: "Bank Mestika Dharma" },
  { code: "152", name: "Bank Shinhan Indonesia" },
  { code: "153", name: "Bank Sinarmas" },
  { code: "157", name: "Bank Maspion Indonesia" },
  { code: "161", name: "Bank Ganesha" },
  { code: "164", name: "Bank ICBC Indonesia" },
  { code: "167", name: "Bank QNB Indonesia" },
  { code: "212", name: "Bank Woori Saudara" },
  { code: "213", name: "Bank SMBC Indonesia (d/h BTPN)" },
  { code: "405", name: "Bank Victoria Syariah" },
  { code: "425", name: "Bank BJB Syariah" },
  { code: "426", name: "Bank Mega" },
  { code: "441", name: "KB Bank (d/h Bank Bukopin)" },
  { code: "459", name: "Krom Bank Indonesia" },
  { code: "472", name: "Bank Jasa Jakarta (Bank Saqu)" },
  { code: "484", name: "Bank KEB Hana Indonesia (LINE Bank)" },
  { code: "485", name: "Bank MNC Internasional (MotionBank)" },
  { code: "490", name: "Bank Neo Commerce" },
  { code: "494", name: "Bank Raya Indonesia" },
  { code: "498", name: "Bank SBI Indonesia" },
  { code: "501", name: "Bank Digital BCA (blu)" },
  { code: "503", name: "Bank Nationalnobu" },
  { code: "506", name: "Bank Mega Syariah" },
  { code: "513", name: "Bank Ina Perdana" },
  { code: "517", name: "Bank Panin Dubai Syariah" },
  { code: "520", name: "Bank Prima Master" },
  { code: "521", name: "Bank KB Syariah (d/h Bukopin Syariah)" },
  { code: "523", name: "Bank Sahabat Sampoerna" },
  { code: "526", name: "Bank Oke Indonesia" },
  { code: "531", name: "Bank Amar Indonesia" },
  { code: "535", name: "SeaBank Indonesia" },
  { code: "536", name: "Bank BCA Syariah" },
  { code: "542", name: "Bank Jago" },
  { code: "547", name: "Bank BTPN Syariah" },
  { code: "548", name: "Bank Multiarta Sentosa" },
  { code: "553", name: "Bank Hibank Indonesia (d/h Bank Mayora)" },
  { code: "555", name: "Bank Index Selindo" },
  { code: "562", name: "Superbank (d/h Bank Fama)" },
  { code: "564", name: "Bank Mandiri Taspen" },
  { code: "566", name: "Bank Victoria International" },
  { code: "567", name: "Allo Bank Indonesia" },
  { code: "945", name: "Bank IBK Indonesia" },
  { code: "947", name: "Bank Aladin Syariah" },
  { code: "949", name: "Bank CTBC Indonesia" },
] as const;

export type IndonesianBankCode = (typeof indonesianBanks)[number]["code"];

const banksByCode = new Map<string, string>(
  indonesianBanks.map(({ code, name }) => [code, name]),
);

export function isKnownBankCode(code: string) {
  return banksByCode.has(code);
}

/** The listed name for `code`, or null for OTHER and unknown codes. */
export function bankNameForCode(code: string) {
  return banksByCode.get(code) ?? null;
}

/**
 * Short label and brand colour for a bank badge. Hakgyo does not ship bank
 * logos (they are trademarks, and the open logo sets forbid commercial use),
 * so banks are shown as a coloured initials badge instead.
 */
const bankBrands: Record<string, { label: string; color: string }> = {
  "002": { label: "BRI", color: "#00529C" },
  "008": { label: "MDR", color: "#003D79" },
  "009": { label: "BNI", color: "#F15A23" },
  "014": { label: "BCA", color: "#0060AF" },
  "200": { label: "BTN", color: "#0057A8" },
  "451": { label: "BSI", color: "#00A39D" },
  "022": { label: "CIMB", color: "#7B1113" },
  "011": { label: "DMN", color: "#F7941D" },
  "013": { label: "PMT", color: "#009845" },
  "016": { label: "MBI", color: "#FFC72C" },
  "019": { label: "PNN", color: "#0054A6" },
  "023": { label: "UOB", color: "#0B3B8C" },
  "028": { label: "OCBC", color: "#E30613" },
  "087": { label: "HSBC", color: "#DB0011" },
  "110": { label: "BJB", color: "#005BAA" },
  "111": { label: "DKI", color: "#E31E24" },
  "114": { label: "JTM", color: "#D71920" },
  "147": { label: "BMI", color: "#7B2C83" },
  "426": { label: "MEGA", color: "#F58220" },
  "501": { label: "blu", color: "#00A3E0" },
  "535": { label: "SEA", color: "#EE4D2D" },
  "536": { label: "BCAS", color: "#00A99D" },
  "542": { label: "JAGO", color: "#FDB813" },
  "490": { label: "BNC", color: "#FF6B00" },
  "567": { label: "ALLO", color: "#E5007E" },
  "213": { label: "SMBC", color: "#004831" },
  "562": { label: "SUPR", color: "#4B1E9E" },
};

const neutralBankColors = ["#475569", "#57534E", "#4B5563", "#52525B"];

/** Uppercase initials of the bank's distinctive words, e.g. "Bank Ina Perdana" → "IP". */
function bankInitials(name: string) {
  const acronym = /\(([A-Z]{2,5})\)/.exec(name)?.[1];
  if (acronym) return acronym;
  const words = name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(
      (word) =>
        word &&
        !["bank", "indonesia", "pt", "tbk", "d/h"].includes(word.toLowerCase()),
    );
  if (words.length === 0) return "BANK";
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

function isLight(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

export function bankBadge(bankCode: string, bankName: string) {
  const brand = bankBrands[bankCode];
  const color =
    brand?.color ??
    neutralBankColors[
      [...bankCode].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        neutralBankColors.length
    ]!;
  return {
    label: brand?.label ?? bankInitials(bankName),
    background: color,
    foreground: isLight(color) ? "#111827" : "#FFFFFF",
  };
}
