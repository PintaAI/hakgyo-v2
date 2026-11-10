// Pictures of the Hangeul Mastery course: one per chapter opener (`lessonPage`) and one per
// dialogue (`conversation`). `hangeul:images` makes each with OpenAI, uploads it and records it in
// image-manifest.json; content refers to a picture as `image("<key>")`. Changing a prompt or the
// style makes a new picture on the next run.

/**
 * One look for every picture. No text at all: generated Hangeul comes out wrong, and a course that
 * teaches the letters must not show broken ones.
 */
export const HANGEUL_IMAGE_STYLE =
  "Warm, minimal editorial illustration with flat shapes and a subtle paper grain, muted palette of cream, coral, sage green and deep navy, soft daylight, calm and premium, generous empty space around a centred subject so it can be cropped to 16:9 and 4:3. People are young Indonesian adults (some women wear a hijab) with friendly, natural expressions, simple modern clothes. Absolutely no text, letters, numbers, writing, signs with words, logos or watermarks anywhere in the image.";

export type HangeulImageSpec = {
  /** What the picture shows (the style is added). */
  prompt: string;
  /** Short description for screen readers, in Indonesian. */
  alt: string;
};

export const hangeulImages: Record<string, HangeulImageSpec> = {
  "chapter-1": {
    prompt:
      "A young woman at a wooden desk in the evening, a small round mirror and an open notebook in front of her, practising mouth shapes with a gentle smile, a warm desk lamp and a cup of tea.",
    alt: "Murid berlatih bentuk mulut di depan cermin kecil",
  },
  "chapter-2": {
    prompt:
      "Two friends sitting on a low table building a little structure from plain wooden blocks without any markings, one hands a block to the other, playful and focused.",
    alt: "Dua teman menyusun balok kayu bersama",
  },
  "chapter-3": {
    prompt:
      "A cosy small café counter seen from the side, a customer orders with a friendly wave while a barista smiles behind the counter with a coffee machine and cups, plain menu boards without writing.",
    alt: "Pembeli memesan di konter kafe",
  },
  "chapter-4": {
    prompt:
      "Two friends practising pronunciation, one holds a single tissue in front of her mouth and it flutters from her breath, the other laughs and claps, light and cheerful.",
    alt: "Teman berlatih dengan tisu di depan mulut",
  },
  "chapter-5": {
    prompt:
      "A fruit stall at a bright market, a young man holds up a red apple with a surprised, delighted expression while his friend points at it, baskets of fruit around them.",
    alt: "Teman kagum melihat apel di pasar buah",
  },
  "chapter-consonants": {
    prompt:
      "A young woman at a desk at home on a video call with a smiling tutor on her laptop screen, she points to her lips while practising a sound, a notebook and a cup of tea beside her, warm evening light.",
    alt: "Murid berlatih bicara bersama tutor lewat panggilan video",
  },
  "chapter-6": {
    prompt:
      "A bright desk from above: an open notebook with abstract pen strokes (no readable letters), a pencil, and a smartphone being typed on with both thumbs, a plant in the corner.",
    alt: "Menulis di buku dan mengetik di ponsel",
  },
  "chapter-7": {
    prompt:
      "A quiet Seoul side street at dusk with warm shop lights and blank shop signs, a young woman with a backpack looks up at the signs with curiosity, holding her phone.",
    alt: "Murid memperhatikan papan toko di jalan Seoul",
  },
  "chapter-8": {
    prompt:
      "A young man on a park bench wearing headphones, eyes closed and smiling while listening, soft abstract sound waves drifting around him, autumn trees.",
    alt: "Murid mendengarkan dengan headphone di taman",
  },
  "chapter-9": {
    prompt:
      "A confident young woman at a tidy desk by a sunlit window finishing an exam paper with abstract lines (no writing), stretching her arms happily, a small trophy-like ceramic cup beside her.",
    alt: "Murid menyelesaikan ujian dengan senang",
  },
  "dialogue-cafe": {
    prompt:
      "Inside a small café: a barista behind the counter greets a customer who is pointing at a pastry in the display case, two cups on the counter, warm and welcoming.",
    alt: "Pelayan kafe menyapa pembeli yang menunjuk kue",
  },
  "dialogue-thanks": {
    prompt:
      "Two friends meeting on a Seoul street with traditional rooftops in the background, one hands a small wrapped gift, the other bows slightly with a grateful smile.",
    alt: "Dua teman bertemu dan memberi hadiah di Seoul",
  },
};
