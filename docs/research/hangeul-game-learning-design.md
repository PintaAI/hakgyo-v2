# Hangeul Game: Learning Design Research

## Scope

The game is for Indonesian beginners. The goal is to introduce Hangeul's consonant and vowel families, teach syllable-block construction, and make learners reliably recall the core building blocks.

## Findings

### 1. Teach Hangeul as a system, not as isolated symbols

Hangeul is a phonemic writing system whose consonant and vowel letters are combined into syllabic units. The Korean National Institute of Korean Language lists 19 standard consonants and 21 standard vowels. This supports a progression from individual jamo to explicitly constructed syllable blocks, rather than jumping straight to whole-word memorization.

Sources: [National Institute of Korean Language: About Hangeul](https://www.korean.go.kr/eng_hangeul/principle/001.html), [National Institute of Korean Language: Standard Pronunciation Rules](https://www.korean.go.kr/front/page/pageView.do?page_id=P000098)

### 2. Use family relationships as the teaching hook

The National Institute of Korean Language explains that basic consonant shapes relate to the speech organs used to pronounce them, and that related sounds can be understood as variations of a basic shape. A 2025 peer-reviewed study reported that teaching sequences based on Hunminjeongeum's design principles produced significantly higher consonant/vowel test and learner-perception scores than teaching by the standard alphabetic order (p < .001).

Implication: introduce a small base family, then reveal how added strokes or doubled shapes create related letters. This gives the learner a reason for the shape instead of requiring arbitrary memorization.

Source: [National Institute of Korean Language: How Hangeul Works](https://www.korean.go.kr/eng_hangeul/principle/002.html), [Choi, 2025, Hangeul Society / KCI](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003185955)

### 3. Make the learner retrieve, not only recognize

Learning-science reviews consistently support retrieval practice and spaced practice for durable retention. Recognition-only activities such as tapping the matching letter should therefore be followed by recall activities: hearing a sound and choosing or producing the letter, seeing a letter and recalling its sound, and assembling a block from memory. Feedback should be immediate and the item should return later when it is weak.

Sources: [Karpicke, 2012, The critical role of retrieval practice](https://doi.org/10.1016/j.tics.2010.09.012), [Carpenter et al., 2022, Nature Reviews Psychology](https://doi.org/10.1038/s44159-022-00089-1), [Spacing repetitions over long timescales](https://pmc.ncbi.nlm.nih.gov/articles/PMC5476736/)

### 4. Syllable blocks need a visual construction rule

Beginner materials commonly teach that a syllable contains at least a consonant and a vowel, with the layout determined by the vowel shape. Vertical vowels are placed beside the initial consonant; horizontal vowels are placed below it. A final consonant (batchim) is added at the bottom. The learner should manipulate these parts directly, see the block snap into place, and then hear the result.

Source: [NSW Department of Education, Hangeul coursebook](https://education.nsw.gov.au/content/dam/main-education/teaching-and-learning/curriculum/key-learning-areas/languages/media/documents/languages-s4-s5-Hangeul-coursebook.pdf)

## Indonesian learner adaptation

Use three simultaneous representations:

1. **Hangul**: the authoritative form, always largest.
2. **Bunyi bantu Indonesia**: a short, readable approximation such as `a`, `i`, `u`, `o`, `ya`, `yo`, `yu`, `m`, `n`, `s`, and `h`.
3. **Audio**: the canonical pronunciation, with replay and slow playback.

Do not present Indonesian-friendly spelling as exact romanization. Some Korean sounds have no direct Indonesian equivalent, especially `ㅓ`, `ㅡ`, aspirated consonants, and tense consonants. Label it as “bunyi kira-kira” and use examples/audio to prevent learners from treating the approximation as the real spelling.

Suggested beginner labels:

| Hangul | Indonesian-friendly cue | Note |
| --- | --- | --- |
| ㅏ | a | like `a` in *apa* |
| ㅣ | i | like `i` in *ini* |
| ㅗ | o | rounded `o` |
| ㅜ | u | like `u` in *umur* |
| ㅑ / ㅛ / ㅠ | ya / yo / yu | teach as a `y` glide |
| ㅓ | eo | approximate only; audio is essential |
| ㅡ | eu | approximate only; audio is essential |
| ㄴ / ㅁ / ㅅ / ㅎ | n / m / s / h | useful early anchors |
| ㄱ / ㄷ / ㅂ / ㅈ | g-k / d-t / b-p / j | show positional variation later |
| ㅇ | silent / ng | two roles must be taught separately |

Avoid asking beginners to memorize long RR-style strings before they can connect sound, shape, and block position. Indonesian explanations and examples should be the interface language; Korean letter names and technical terminology can be secondary details.

## Recommended game concept

### A. Learn: “Keluarga huruf”

Each short lesson introduces one consonant or vowel family. Animate the base shape, show the related letters, play the sound, and let the learner trace or reveal the strokes. End with a two- or three-item retrieval check.

### B. Build: “Susun 한글”

Give the learner draggable consonant and vowel tiles. The learner chooses the correct layout, snaps them into a syllable block, and hears the syllable. Start with CV blocks, then add batchim only after the layout rule is stable. Include a “why this position?” hint rather than merely marking an answer wrong.

### C. Recall: “Hangeul”

Mix prompts instead of repeating one exercise:

- audio → choose the matching jamo;
- jamo → choose the sound cue;
- block → identify initial/vowel/final;
- component tiles → construct the block;
- short delayed review of weak items.

### D. Mastery

Track separate mastery dimensions: visual recognition, sound recall, family relationship, block construction, and optional stroke order. A learner should not be marked complete merely because they can recognize a card. Require repeated success across mixed prompt types and at least one spaced revisit.

## MVP recommendation

Build the smallest complete loop first:

1. 10 basic vowels and 14 basic consonants;
2. family lesson for base letters and related forms;
3. audio + Indonesian-friendly cue on every item;
4. CV block builder with vertical/horizontal layout feedback;
5. retrieval quiz with immediate correction;
6. weak-item queue for later reviews;
7. progress map showing which letters and skills are mastered.

Defer handwriting recognition, speed scoring, complex batchim pronunciation, and a large word game until the core letter-to-sound and block-construction loop is reliable.
