// The fixed outline of the two linked Hakgyo system curricula: courses, then
// chapters (bab, one course module each), then one short material per pattern.
// Every chapter ends with one vocabulary set (its patterns as entries) and one
// quiz. Keys become stable database ids (see ./ids.ts) and links between
// materials point at them, so never rename a key once imported. Titles are
// the ones learners see, in the "pola • arti · ★" format.

export const POLA_COURSES = {
  "korea-indo": {
    title: "Pola Korea → Indo: Paham Pola",
    description:
      "Pola bahasa Korea yang kepake tiap hari, dijelasin pakai logika bahasa Indonesia. Satu pola, satu materi pendek.",
  },
  "indo-korea": {
    title: "Indo → Korea: Berani Ngomong",
    description:
      "Mulai dari kata yang biasa kamu pakai (padahal, kok, soalnya, ketiduran), terus belajar cara bilangnya dalam bahasa Korea.",
  },
} as const;

export type PolaCourseKey = keyof typeof POLA_COURSES;

export type ManifestMaterial = {
  key: string;
  /** Learner-facing title: "그리고 • dan, terus", the star is added for `star`. */
  title: string;
  /** One of the most used patterns (shown as " · ★"). */
  star?: boolean;
};

export type ManifestBab = {
  key: string;
  course: PolaCourseKey;
  title: string;
  materials: readonly ManifestMaterial[];
};

export const POLA_BABS = [
  // ------------------------------------------------------------ Korea → Indo
  {
    key: "ki-01-kata-sambung",
    course: "korea-indo",
    title: "Kata sambung di awal kalimat",
    materials: [
      { key: "ki-geurigo", title: "그리고 • dan, terus", star: true },
      { key: "ki-geuraeseo", title: "그래서 • jadi, makanya", star: true },
      {
        key: "ki-geureonde",
        title: "그런데 / 근데 • tapi, eh btw",
        star: true,
      },
      { key: "ki-geureom", title: "그럼 • kalau gitu", star: true },
      { key: "ki-geureonikka", title: "그러니까 • makanya, jadi gini" },
      { key: "ki-hajiman", title: "하지만 / 그렇지만 • tetapi" },
      { key: "ki-geuraedo", title: "그래도 • walaupun gitu, tetap aja" },
      { key: "ki-animyeon", title: "아니면 • atau, kalau nggak" },
    ],
  },
  {
    key: "ki-02-penyambung-dasar",
    course: "korea-indo",
    title: "Penyambung dasar: dan, karena, tapi, kalau",
    materials: [
      { key: "ki-go", title: "-고 • dan, lalu", star: true },
      { key: "ki-aseo-karena", title: "-아서/어서 • karena", star: true },
      {
        key: "ki-aseo-lalu",
        title: "-아서/어서 • lalu (masih nyambung)",
        star: true,
      },
      {
        key: "ki-nikka",
        title: "-(으)니까 • karena (boleh + perintah)",
        star: true,
      },
      { key: "ki-jiman", title: "-지만 • tapi", star: true },
      {
        key: "ki-neunde",
        title: "-는데 / -(으)ㄴ데 • nah..., padahal, tapi",
        star: true,
      },
      { key: "ki-neundedo", title: "-는데도 • padahal udah ..., tetap" },
      { key: "ki-myeonseo-padahal", title: "-(으)면서 • padahal (nyalahin)" },
      { key: "ki-myeon", title: "-(으)면 • kalau", star: true },
      { key: "ki-reo", title: "-(으)러 가다/오다 • pergi untuk", star: true },
      { key: "ki-ryeogo", title: "-(으)려고 • supaya, biar" },
      { key: "ki-myeonseo", title: "-(으)면서 • sambil", star: true },
      { key: "ki-geona", title: "-거나 • atau" },
    ],
  },
  {
    key: "ki-03-waktu-sebab",
    course: "korea-indo",
    title: "Waktu dan sebab",
    materials: [
      { key: "ki-gi-jeone", title: "-기 전에 • sebelum", star: true },
      {
        key: "ki-eun-hue",
        title: "-(으)ㄴ 후에 / 다음에 • setelah",
        star: true,
      },
      { key: "ki-eul-ttae", title: "-(으)ㄹ 때 • ketika, waktu", star: true },
      { key: "ki-ado", title: "-아도/어도 • walaupun" },
      { key: "ki-daga", title: "-다가 • lagi ..., eh terus" },
      { key: "ki-jamaja", title: "-자마자 • begitu ..., langsung" },
      { key: "ki-neurago", title: "-느라고 • gara-gara sibuk ..." },
      { key: "ki-gi-ttaemune", title: "-기 때문에 / 때문에 • karena (resmi)" },
      {
        key: "ki-neun-barame",
        title: "-는 바람에 • gara-gara (kejadian mendadak)",
      },
      { key: "ki-neun-gime", title: "-는 김에 • sekalian, mumpung" },
      {
        key: "ki-gineunkeonyeong",
        title: "-기는커녕 • boro-boro, bukannya ... malah",
      },
      { key: "ki-eulsurok", title: "-(으)면 -(으)ㄹ수록 • makin ... makin" },
      { key: "ki-giman-hamyeon", title: "-기만 하면 • asal, yang penting" },
    ],
  },
  {
    key: "ki-04-bisa-harus",
    course: "korea-indo",
    title: "Bisa, harus, boleh",
    materials: [
      { key: "ki-go-sipda", title: "-고 싶다 • ingin", star: true },
      {
        key: "ki-eul-su-itda",
        title: "-(으)ㄹ 수 있다/없다 • bisa, sempat",
        star: true,
      },
      {
        key: "ki-eul-jul-alda",
        title: "-(으)ㄹ 줄 알다/모르다 • bisa (tahu caranya)",
      },
      { key: "ki-aya-hada", title: "-아야/어야 하다 • harus", star: true },
      { key: "ki-ado-doeda", title: "-아도/어도 되다 • boleh", star: true },
      {
        key: "ki-myeon-an-doeda",
        title: "-(으)면 안 되다 • nggak boleh",
        star: true,
      },
      {
        key: "ki-ji-anado-doeda",
        title: "-지 않아도 되다 • nggak usah, nggak perlu",
        star: true,
      },
      { key: "ki-giro-hada", title: "-기로 하다 • memutuskan, janjian" },
    ],
  },
  {
    key: "ki-05-minta-ajak",
    course: "korea-indo",
    title: "Minta, ajak, janji",
    materials: [
      { key: "ki-a-juseyo", title: "-아/어 주세요 • tolong ...", star: true },
      { key: "ki-euseyo", title: "-(으)세요 • silakan, ... ya", star: true },
      { key: "ki-ji-maseyo", title: "-지 마세요 • jangan", star: true },
      {
        key: "ki-eulkkayo",
        title: "-(으)ㄹ까요? • yuk? / gimana kalau?",
        star: true,
      },
      { key: "ki-eupsida", title: "-(으)ㅂ시다 • mari" },
      {
        key: "ki-eulgeyo",
        title: "-(으)ㄹ게요 • aku ... ya (janji)",
        star: true,
      },
      { key: "ki-eullaeyo", title: "-(으)ㄹ래요? • mau ...?", star: true },
    ],
  },
  {
    key: "ki-06-akhiran-rasa",
    course: "korea-indo",
    title: "Akhiran perasaan dan dugaan",
    materials: [
      { key: "ki-janayo", title: "-잖아요 • kan (kamu udah tahu)", star: true },
      { key: "ki-jiyo", title: "-지요 / -죠 • kan?, ya?", star: true },
      { key: "ki-geodeunyo", title: "-거든요 • soalnya", star: true },
      { key: "ki-neyo", title: "-네요 • wah, ternyata", star: true },
      { key: "ki-gunyo", title: "-군요 • oh, gitu ya" },
      {
        key: "ki-geot-gatda",
        title: "-(으)ㄴ/는 것 같다 • kayaknya",
        star: true,
      },
      {
        key: "ki-na-bwa",
        title: "-나 봐요 • kayaknya (dari tanda yang terlihat)",
      },
      { key: "ki-eulgeol", title: "-(으)ㄹ걸요 • kayaknya sih (kurang yakin)" },
      {
        key: "ki-getda",
        title: "-겠다 • pasti (nebak perasaan orang)",
        star: true,
      },
      {
        key: "ki-deora",
        title: "-더라고요 / -더라 • ternyata (dilihat sendiri)",
      },
      {
        key: "ki-daeyo",
        title: "-대요 / -래요 / -재요 • katanya, disuruh, diajak",
        star: true,
      },
    ],
  },
  {
    key: "ki-07-keadaan",
    course: "korea-indo",
    title: "Pengalaman dan keadaan",
    materials: [
      { key: "ki-a-boda", title: "-아/어 보다 • coba ...", star: true },
      { key: "ki-eun-jeok", title: "-(으)ㄴ 적이 있다 • pernah", star: true },
      { key: "ki-go-itda", title: "-고 있다 • sedang (melakukan)", star: true },
      { key: "ki-a-itda", title: "-아/어 있다 • dalam keadaan" },
      { key: "ki-a-beorida", title: "-아/어 버리다 • terlanjur, keburu" },
      { key: "ki-ge-doeda", title: "-게 되다 • jadi, akhirnya", star: true },
      { key: "ki-ajida", title: "-아/어지다 • menjadi (berubah)" },
      {
        key: "ki-eul-ppeonhada",
        title: "-(으)ㄹ 뻔했다 • hampir (tapi nggak jadi)",
      },
      { key: "ki-cheok", title: "-(으)ㄴ/는 척하다 • pura-pura" },
    ],
  },
  {
    key: "ki-08-andai",
    course: "korea-indo",
    title: "Andai-andai dan penyesalan",
    materials: [
      { key: "ki-asseoya", title: "-았/었어야 했는데 • harusnya (tadi) ..." },
      {
        key: "ki-asseumyeon-teonde",
        title: "-았/었으면 좋았을 텐데 • coba / kalau aja ...",
      },
      { key: "ki-neun-ge-natda", title: "-는 게 낫다 • mendingan" },
      {
        key: "ki-ryeogo-haenneunde",
        title: "-(으)려고 했는데 • tadinya mau ... (tapi)",
      },
    ],
  },
  {
    key: "ki-09-kata-waktu",
    course: "korea-indo",
    title: "Kata kecil 1: waktu dan jumlah",
    materials: [
      { key: "ki-jom", title: "좀 • dong, sedikit", star: true },
      {
        key: "ki-beolsseo",
        title: "벌써 / 이미 • udah (kok cepet) / sudah",
        star: true,
      },
      {
        key: "ki-ajik",
        title: "아직 / 아직도 • belum, masih / masih aja",
        star: true,
      },
      {
        key: "ki-bangeum",
        title: "방금 / 이제 막 / 이제야 • baru aja, baru mulai, baru sekarang",
      },
      { key: "ki-bakke", title: "-밖에 안/못 • cuma, baru (jumlah)" },
      { key: "ki-geoui", title: "거의 • hampir (jumlah)" },
      { key: "ki-gyeolguk", title: "결국 • akhirnya" },
    ],
  },
  {
    key: "ki-10-kata-reaksi",
    course: "korea-indo",
    title: "Kata kecil 2: reaksi dan perasaan",
    materials: [
      { key: "ki-ohiryeo", title: "오히려 • malah" },
      { key: "ki-simjieo", title: "심지어 / -조차 / -까지 • bahkan" },
      { key: "ki-charari", title: "차라리 • mendingan (pilih yang ini aja)" },
      { key: "ki-eojjeonji", title: "어쩐지 • pantesan" },
      { key: "ki-algo-boni", title: "알고 보니 • ternyata (setelah tahu)" },
      { key: "ki-hoksi", title: "혹시 / 설마 • jangan-jangan / masa sih" },
      { key: "ki-dahaeng", title: "다행이다 / 다행히 • untung, syukurlah" },
      { key: "ki-aswipgedo", title: "아쉽게도 / 아쉽다 • sayangnya" },
      { key: "ki-hagin", title: "하긴 / 원래 • emang sih / emang dari dulu" },
      { key: "ki-itjana", title: "있잖아 • tau nggak, eh gini" },
      { key: "ki-wae", title: "왜 • kok, kenapa" },
      {
        key: "ki-kkamppak",
        title: "깜빡 / 나도 모르게 / 실수로 • lupa, tanpa sadar, nggak sengaja",
      },
      { key: "ki-dangyeonhaji", title: "당연하지 • ya iya dong" },
      { key: "ki-dwaesseo", title: "됐어 • udah deh, nggak usah" },
      {
        key: "ki-maeumdaero",
        title: "마음대로 해 / 아무거나 • terserah, apa aja",
      },
    ],
  },
  {
    key: "ki-11-banmal",
    course: "korea-indo",
    title: "반말: ngomong santai",
    materials: [
      { key: "ki-banmal-rumus", title: "Rumus 반말 • buang -요", star: true },
      {
        key: "ki-banmal-pengecualian",
        title: "Pengecualian 반말 • yang wajib dihafal",
        star: true,
      },
      {
        key: "ki-banmal-kapan",
        title: "Kapan boleh 반말 • ngoko vs krama ala Korea",
      },
    ],
  },
  // ------------------------------------------------------------ Indo → Korea
  {
    key: "ik-01-padahal",
    course: "indo-korea",
    title: "Padahal",
    materials: [
      {
        key: "ik-padahal-hasil",
        title: "Padahal (hasil nggak sesuai) • -는데, -는데도",
        star: true,
      },
      {
        key: "ik-padahal-protes",
        title: "Padahal (nyalahin) • -(으)면서, -잖아",
      },
      {
        key: "ik-padahal-rencana",
        title: "Padahal tadinya mau • -(으)려고 했는데",
      },
      {
        key: "ik-padahal-kesal",
        title: "Padahal udah ... (kesel) • -이나 ...-는데",
      },
    ],
  },
  {
    key: "ik-02-partikel",
    course: "indo-korea",
    title: "Partikel obrolan",
    materials: [
      { key: "ik-kok", title: "Kok • 왜, -네?, 아니야~", star: true },
      { key: "ik-sih", title: "Sih • -는데?, 나는 -는데", star: true },
      { key: "ik-dong", title: "Dong • 좀, 당연하지", star: true },
      {
        key: "ik-deh",
        title: "Deh • -(으)ㄹ게, 한번 -아 봐, 됐어",
        star: true,
      },
      { key: "ik-kan", title: "Kan • -잖아, -지?", star: true },
      { key: "ik-loh", title: "Loh / tau nggak • 있잖아, -거든" },
      { key: "ik-emang", title: "Emang • 원래, 하긴, 왜?" },
    ],
  },
  {
    key: "ik-03-alasan",
    course: "indo-korea",
    title: "Kasih alasan dan kesempatan",
    materials: [
      {
        key: "ik-soalnya",
        title: "Soalnya • -거든, -아서, -(으)니까",
        star: true,
      },
      {
        key: "ik-gara-gara",
        title: "Gara-gara • -아서, 때문에, -는 바람에",
        star: true,
      },
      { key: "ik-mumpung", title: "Mumpung • -(으)ㄹ 때, -는 김에" },
      { key: "ik-sekalian", title: "Sekalian • -는 김에" },
      { key: "ik-asal", title: "Asal / yang penting • -기만 하면" },
    ],
  },
  {
    key: "ik-04-bandingin",
    course: "indo-korea",
    title: "Bandingin dan kontras",
    materials: [
      { key: "ik-malah", title: "Malah • 오히려, -기는커녕" },
      { key: "ik-bahkan", title: "Bahkan • 심지어, -조차, -까지" },
      { key: "ik-mendingan", title: "Mendingan • -는 게 낫다, 차라리" },
      { key: "ik-makin", title: "Makin ... makin • -(으)면 -(으)ㄹ수록" },
    ],
  },
  {
    key: "ik-05-nebak",
    course: "indo-korea",
    title: "Nebak dan bereaksi",
    materials: [
      {
        key: "ik-kayaknya",
        title: "Kayaknya • -것 같아, -나 봐, -(으)ㄹ걸",
        star: true,
      },
      { key: "ik-jangan-jangan", title: "Jangan-jangan • 혹시, 설마" },
      {
        key: "ik-ternyata",
        title: "Ternyata • -네, 알고 보니, -더라",
        star: true,
      },
      { key: "ik-pantesan", title: "Pantesan • 어쩐지" },
      { key: "ik-untung", title: "Untung • -아서 다행이야" },
      { key: "ik-sayangnya", title: "Sayangnya • 아쉽게도" },
    ],
  },
  {
    key: "ik-06-waktu",
    course: "indo-korea",
    title: "Kata waktu yang licin",
    materials: [
      { key: "ik-udah", title: "Udah • -았/었어, 벌써, 이미", star: true },
      { key: "ik-belum", title: "Belum • 아직 안 -았어", star: true },
      { key: "ik-masih", title: "Masih • 아직, 아직도", star: true },
      {
        key: "ik-baru",
        title: "Baru • 방금, 이제 막, 이제야, -밖에",
        star: true,
      },
      { key: "ik-sempat", title: "Sempat / nggak sempat • -느라고" },
      { key: "ik-keburu", title: "Keburu • 벌써, -기 전에" },
      { key: "ik-nggak-jadi", title: "Nggak jadi • 안 -기로 했어, 결국" },
      { key: "ik-hampir", title: "Hampir • -(으)ㄹ 뻔했다, 거의" },
    ],
  },
  {
    key: "ik-07-nggak-sengaja",
    course: "indo-korea",
    title: "Nggak sengaja dan pura-pura",
    materials: [
      {
        key: "ik-ke-an-rumus",
        title: "Rumus ke-/ter- • 나도 모르게 + -아/어 버렸어",
      },
      { key: "ik-ketiduran", title: "Ketiduran • 잠들어 버렸어" },
      { key: "ik-kelupaan", title: "Kelupaan • 깜빡했어" },
      { key: "ik-keceplosan", title: "Keceplosan • 나도 모르게 말해 버렸어" },
      { key: "ik-kebawa", title: "Kebawa • 실수로 가져왔어" },
      { key: "ik-pura-pura", title: "Pura-pura • -(으)ㄴ/는 척하다" },
    ],
  },
  {
    key: "ik-08-nyesel",
    course: "indo-korea",
    title: "Nyesel dan ngasih pilihan",
    materials: [
      { key: "ik-harusnya", title: "Harusnya • -았/었어야 했는데" },
      {
        key: "ik-kalau-aja",
        title: "Kalau aja / coba • -았/었으면 좋았을 텐데",
      },
      {
        key: "ik-terserah",
        title: "Terserah • 마음대로 해, 아무거나",
        star: true,
      },
      {
        key: "ik-nggak-usah",
        title: "Nggak usah • 안 -아도 돼, 괜찮아",
        star: true,
      },
    ],
  },
] as const satisfies readonly ManifestBab[];

export type PolaBabKey = (typeof POLA_BABS)[number]["key"];
export type PolaMaterialKey =
  (typeof POLA_BABS)[number]["materials"][number]["key"];

/** Every material by key, with its chapter and course. */
export const POLA_MATERIALS: Record<
  PolaMaterialKey,
  ManifestMaterial & { bab: PolaBabKey; course: PolaCourseKey }
> = Object.fromEntries(
  POLA_BABS.flatMap((bab) =>
    bab.materials.map((material) => [
      material.key,
      { ...material, bab: bab.key, course: bab.course },
    ]),
  ),
) as never;

/** The learner-facing title, with " · ★" for the most used patterns. */
export function materialTitle(material: ManifestMaterial): string {
  return material.star ? `${material.title} · ★` : material.title;
}
