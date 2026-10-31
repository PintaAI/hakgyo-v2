// The fixed outline of the two linked Hakgyo system curricula. Material and
// section keys become stable database and block ids (see ./ids.ts), and links
// between materials point at them, so never rename a key once imported.
// Titles here are only for orientation; the content files set the real ones.

export const POLA_COURSES = {
  "korea-indo": {
    title: "Pola Korea → Indo: Paham Pola",
    description:
      "Pola bahasa Korea yang kepake tiap hari, dijelasin pakai logika bahasa Indonesia. Buat paham dulu, baru ngomong.",
  },
  "indo-korea": {
    title: "Indo → Korea: Berani Ngomong",
    description:
      "Mulai dari kata yang biasa kamu pakai (padahal, kok, soalnya, ketiduran), terus belajar cara bilangnya dalam bahasa Korea.",
  },
} as const;

export type PolaCourseKey = keyof typeof POLA_COURSES;

type ManifestMaterial = {
  course: PolaCourseKey;
  module: string;
  title: string;
  sections: readonly string[];
};

export const POLA_MODULES = {
  "ki-sambung": { course: "korea-indo", title: "Nyambungin kalimat" },
  "ki-modal": { course: "korea-indo", title: "Bisa, harus, minta, ajak" },
  "ki-rasa": { course: "korea-indo", title: "Perasaan, keadaan, dan andai" },
  "ki-santai": { course: "korea-indo", title: "Kata kecil dan 반말" },
  "ik-mulai": { course: "indo-korea", title: "Mulai dari padahal" },
  "ik-obrolan": { course: "indo-korea", title: "Partikel dan penghubung" },
  "ik-keadaan": { course: "indo-korea", title: "Waktu, nggak sengaja, andai" },
} as const satisfies Record<string, { course: PolaCourseKey; title: string }>;

export const POLA_MATERIALS = {
  // Korea → Indo
  "ki-kata-sambung": {
    course: "korea-indo",
    module: "ki-sambung",
    title: "Kata sambung di awal kalimat",
    sections: [
      "geurigo",
      "geuraeseo",
      "geureonde",
      "geureom",
      "geureonikka",
      "hajiman",
      "geuraedo",
      "animyeon",
    ],
  },
  "ki-alasan-urutan": {
    course: "korea-indo",
    module: "ki-sambung",
    title: "Penyambung 1: dan, karena, tapi, kalau",
    sections: [
      "go",
      "aseo-karena",
      "aseo-lalu",
      "nikka",
      "jiman",
      "neunde",
      "neundedo",
      "myeonseo-padahal",
      "myeon",
      "reo",
      "ryeogo",
      "myeonseo",
      "geona",
    ],
  },
  "ki-waktu-sebab": {
    course: "korea-indo",
    module: "ki-sambung",
    title: "Penyambung 2: waktu, sebab, dan makin-makin",
    sections: [
      "gi-jeone",
      "eun-hue",
      "eul-ttae",
      "ado",
      "daga",
      "jamaja",
      "neurago",
      "gi-ttaemune",
      "neun-barame",
      "neun-gime",
      "gineunkeonyeong",
      "eulsurok",
      "giman-hamyeon",
    ],
  },
  "ki-bisa-harus": {
    course: "korea-indo",
    module: "ki-modal",
    title: "Bisa, harus, boleh",
    sections: [
      "go-sipda",
      "eul-su-itda",
      "eul-jul-alda",
      "aya-hada",
      "ado-doeda",
      "myeon-an-doeda",
      "ji-anado-doeda",
      "giro-hada",
    ],
  },
  "ki-minta-ajak": {
    course: "korea-indo",
    module: "ki-modal",
    title: "Minta, ajak, janji",
    sections: [
      "a-juseyo",
      "euseyo",
      "ji-maseyo",
      "eulkkayo",
      "eupsida",
      "eulgeyo",
      "eullaeyo",
    ],
  },
  "ki-akhiran-rasa": {
    course: "korea-indo",
    module: "ki-rasa",
    title: "Akhiran perasaan dan dugaan",
    sections: [
      "janayo",
      "jiyo",
      "geodeunyo",
      "neyo",
      "gunyo",
      "geot-gatda",
      "na-bwa",
      "eulgeol",
      "getda",
      "deora",
      "daeyo",
    ],
  },
  "ki-keadaan": {
    course: "korea-indo",
    module: "ki-rasa",
    title: "Pengalaman dan keadaan",
    sections: [
      "a-boda",
      "eun-jeok",
      "go-itda",
      "a-itda",
      "a-beorida",
      "ge-doeda",
      "ajida",
      "eul-ppeonhada",
      "cheok",
    ],
  },
  "ki-andai": {
    course: "korea-indo",
    module: "ki-rasa",
    title: "Andai-andai dan penyesalan",
    sections: [
      "asseoya",
      "asseumyeon-teonde",
      "neun-ge-natda",
      "ryeogo-haenneunde",
    ],
  },
  "ki-kata-kecil": {
    course: "korea-indo",
    module: "ki-santai",
    title: "Kata keterangan obrolan",
    sections: [
      "jom",
      "beolsseo",
      "ajik",
      "bangeum",
      "bakke",
      "geoui",
      "gyeolguk",
      "ohiryeo",
      "simjieo",
      "charari",
      "eojjeonji",
      "algo-boni",
      "hoksi",
      "dahaeng",
      "aswipgedo",
      "hagin",
      "itjana",
      "wae",
      "kkamppak",
      "dangyeonhaji",
      "dwaesseo",
      "maeumdaero",
    ],
  },
  "ki-banmal": {
    course: "korea-indo",
    module: "ki-santai",
    title: "반말: ngomong santai",
    sections: ["rumus", "pengecualian", "kapan"],
  },
  // Indo → Korea
  "ik-padahal": {
    course: "indo-korea",
    module: "ik-mulai",
    title: "Padahal",
    sections: ["hasil", "protes", "rencana", "kesal"],
  },
  "ik-partikel": {
    course: "indo-korea",
    module: "ik-obrolan",
    title: "Partikel obrolan: kok, sih, dong, deh",
    sections: ["kok", "sih", "dong", "deh", "kan", "loh", "emang"],
  },
  "ik-alasan": {
    course: "indo-korea",
    module: "ik-obrolan",
    title: "Soalnya, gara-gara, malah, mendingan",
    sections: [
      "soalnya",
      "gara-gara",
      "malah",
      "bahkan",
      "mendingan",
      "sekalian",
      "mumpung",
      "asal",
    ],
  },
  "ik-dugaan": {
    course: "indo-korea",
    module: "ik-obrolan",
    title: "Kayaknya, ternyata, pantesan",
    sections: [
      "makin",
      "pantesan",
      "ternyata",
      "jangan-jangan",
      "untung",
      "sayangnya",
      "kayaknya",
    ],
  },
  "ik-waktu": {
    course: "indo-korea",
    module: "ik-keadaan",
    title: "Udah, belum, masih, baru",
    sections: [
      "udah",
      "belum",
      "masih",
      "baru",
      "sempat",
      "keburu",
      "nggak-jadi",
      "hampir",
    ],
  },
  "ik-nggak-sengaja": {
    course: "indo-korea",
    module: "ik-keadaan",
    title: "Ketiduran, kelupaan, keceplosan",
    sections: ["rumus", "ketiduran", "kelupaan", "keceplosan", "kebawa"],
  },
  "ik-andai": {
    course: "indo-korea",
    module: "ik-keadaan",
    title: "Harusnya, coba, terserah",
    sections: ["harusnya", "kalau-aja", "pura-pura", "terserah", "nggak-usah"],
  },
} as const satisfies Record<string, ManifestMaterial>;

export type PolaMaterialKey = keyof typeof POLA_MATERIALS;
export type PolaSectionKey<M extends PolaMaterialKey> =
  (typeof POLA_MATERIALS)[M]["sections"][number];
