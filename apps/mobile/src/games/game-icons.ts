import {
  getContrastRatio,
  mixHexColors,
  normalizeHexColor,
} from "@hakgyo/shared";

/**
 * Flat game icons for the Latihan tiles and the source sheet. Each is drawn
 * in four colors taken from the organization theme: `{main}`, a `{dark}` and
 * a `{light}` shade of it, and `{on}` for letters on top of them. Generated
 * as SVG by gpt-image-2.6 in a fixed four-color palette, recolored here.
 */
const GAME_ICON_SVGS = {
  cards:
    '<svg viewBox="24 41 966 966" fill="none" xmlns="http://www.w3.org/2000/svg"><title>Stacked Korean flashcards</title><g><path fill="{dark}" d="M205 310 622 252C708 240 781 298 794 384L848 771C860 853 807 917 726 928L281 969C198 981 130 928 117 846L65 493C52 406 116 323 205 310Z" /><path fill="{main}" d="M373 141 789 207C878 221 936 294 922 383L852 788C837 882 760 943 665 928L278 868C189 854 130 781 144 691L210 276C224 187 286 127 373 141Z" /><g fill="{on}"><path d="M350 344H522C563 344 580 362 580 400 580 555 493 681 350 737 322 748 295 738 283 714 269 687 281 657 310 645 408 605 458 548 475 467 479 447 477 437 461 437H347C316 437 300 421 300 392 300 365 321 344 350 344Z" /><path d="M617 362C617 332 636 315 667 315 700 315 718 332 718 362V471H748C781 471 797 487 797 519 797 552 780 569 748 569H716V736C716 770 698 787 666 787 634 787 617 770 617 738Z" /></g></g><path fill="{light}" d="M808 98C814 70 850 70 857 98L865 128C875 155 896 175 928 184 956 191 957 222 929 231 892 243 869 267 859 305L856 315C849 338 817 338 809 314L802 290C792 260 770 241 733 233 705 227 703 196 731 186 773 172 796 148 804 114Z" /></svg>',
  assessment:
    '<svg viewBox="53 78 916 916" xmlns="http://www.w3.org/2000/svg"><title>Checked paper</title><g><path fill="{light}" d="M270 112H600C626 112 646 123 666 143L824 301C844 321 854 340 854 355V790C854 884 779 960 685 960H271C177 960 102 884 102 790V282C102 188 177 112 270 112Z" /><path fill="{dark}" d="M600 112C626 112 646 123 666 143L824 301C844 321 854 340 854 355H699C644 355 600 311 600 256Z" /><rect x="184" y="308" width="403" height="90" rx="45" fill="{dark}" /><rect x="182" y="450" width="330" height="87" rx="43.5" fill="{dark}" /></g><path fill="{main}" d="M322 771C286 735 286 679 322 643C358 608 414 608 450 643L529 722L765 489C800 454 856 454 892 489C927 524 927 581 892 616L593 902C556 940 497 940 459 902Z" /></svg>',
  "word-fall":
    '<svg viewBox="17 25 990 990" xmlns="http://www.w3.org/2000/svg"><title>Falling Hangeul tile and flying saucer</title><g transform="rotate(-11 512 365)"><rect x="220" y="94" width="584" height="550" rx="112" fill="{main}" /><g fill="{on}"><path d="M354 232H481C506 232 520 248 518 273C510 374 453 443 366 483C346 492 325 484 317 465C309 446 317 426 337 416C397 387 436 346 446 301H354C332 301 319 288 319 267C319 246 332 232 354 232Z" /><path d="M600 210C621 210 635 224 635 245V333H667C688 333 702 347 702 367C702 388 688 402 667 402H635V493C635 514 621 528 600 528C579 528 565 514 565 493V245C565 224 579 210 600 210Z" /></g></g><g><ellipse cx="512" cy="876" rx="330" ry="103" fill="{dark}" /><path d="M350 805C370 741 435 697 512 697C589 697 654 741 674 805C677 815 671 821 657 824C584 837 440 837 367 824C353 821 347 815 350 805Z" fill="{light}" /><rect x="301" y="859" width="90" height="73" rx="36.5" fill="{light}" /><rect x="467" y="867" width="90" height="73" rx="36.5" fill="{light}" /><rect x="633" y="859" width="90" height="73" rx="36.5" fill="{light}" /></g></svg>',
  sentences:
    '<svg viewBox="29 55 950 950" xmlns="http://www.w3.org/2000/svg"><g><path fill="{main}" d="M392 144H620C799 144 944 281 944 455C944 640 786 788 586 788H406C394 788 386 792 378 801C340 845 295 883 246 910C210 930 164 903 174 862L201 768C114 713 64 621 64 509V468C64 289 211 144 392 144Z" /><g fill="{on}"><circle cx="263" cy="473" r="102" /><path d="M480 385C492 364 520 364 532 385L614 531C626 552 612 574 588 574H420C396 574 383 552 395 531Z" /><rect x="651" y="370" width="192" height="204" rx="41" /></g></g></svg>',
  match:
    '<svg viewBox="42 42 940 940" xmlns="http://www.w3.org/2000/svg"><g><rect x="443" y="476" width="138" height="72" fill="{dark}" /><rect x="77" y="313" width="398" height="398" rx="104" fill="{light}" /><rect x="549" y="313" width="398" height="398" rx="104" fill="{main}" /><circle cx="276" cy="512" r="116" fill="{dark}" /><circle cx="748" cy="512" r="116" fill="{on}" /></g></svg>',
  "stroke-master":
    '<svg viewBox="41 47 945 945" xmlns="http://www.w3.org/2000/svg"><title>Hangeul tile and pencil</title><g><rect x="76" y="86" width="820" height="820" rx="190" fill="{main}" /><path d="M246 279H607C646 279 674 307 674 346V640C674 680 645 709 605 709C565 709 536 680 536 640V417H246C208 417 177 386 177 348C177 310 208 279 246 279Z" fill="{on}" /></g><g><path d="M787 483C811 445 851 437 886 459L916 478C951 500 961 540 939 576L791 835C779 856 767 871 749 881L637 939C616 950 598 937 602 914L621 795C623 783 627 774 634 762Z" fill="{dark}" /><path d="M750 544L787 483C811 445 851 437 886 459L916 478C951 500 961 540 939 576L916 614Z" fill="{light}" /><path d="M621 795C623 784 628 780 640 786C675 802 719 832 747 858C756 867 758 876 749 881L637 939C616 950 598 937 602 914Z" fill="{light}" /><path d="M609 880C615 873 625 875 636 881C660 894 679 911 682 928L637 950C617 960 598 946 602 923Z" fill="{dark}" /></g></svg>',
  "syllable-forge":
    '<svg viewBox="41 41 942 942" xmlns="http://www.w3.org/2000/svg"><title>Hangul tile progression</title><g><rect x="76" y="415" width="296" height="308" rx="88" fill="{dark}" /><rect x="370" y="223" width="578" height="578" rx="166" fill="{main}" /></g><g fill="none" stroke="{on}" stroke-linecap="round" stroke-linejoin="round"><path d="M145 526H250V618" stroke-width="46" /><path d="M532 397H665C665 500 628 566 538 628" stroke-width="76" /><path d="M777 361V674M777 493H850" stroke-width="78" /></g><path fill="{light}" d="M337 476C325 464 308 464 297 476C286 488 287 505 298 517L311 532H289C266 532 251 550 251 574C251 598 266 616 289 616H311L298 631C287 643 286 660 297 672C308 684 325 684 337 672L426 591C438 580 438 565 426 553Z" transform="translate(48 -14)" /></svg>',
  "word-builder":
    '<svg viewBox="42 42 941 941" fill="none" xmlns="http://www.w3.org/2000/svg"><title>Interlocking Hangul game tiles</title><g transform="translate(67 57.5) scale(.87)"><g><rect x="500" y="261" width="512" height="523" rx="120" fill="{dark}" /><path d="M140 261H398C465 261 518 314 518 381V444C563 444 597 481 597 527C597 573 562 611 518 611V664C518 731 465 784 398 784H140C69 784 12 727 12 656V389C12 318 69 261 140 261Z" fill="{main}" /></g><g fill="{on}"><path fill-rule="evenodd" d="M181 390V384C181 366 195 353 213 353C231 353 245 366 245 384V390H289C307 390 319 402 319 419C319 436 307 449 289 449H282C296 462 304 479 304 498C304 544 265 578 213 578C161 578 122 544 122 498C122 479 130 462 144 449H134C116 449 104 437 104 420C104 403 116 390 134 390ZM213 459C194 459 180 473 180 491C180 510 194 522 213 522C232 522 245 509 245 491C245 473 232 459 213 459Z" /><path d="M334 391C334 371 347 358 367 358C387 358 400 371 400 391V445H415C435 445 447 458 447 477C447 496 435 509 415 509H400V574C400 594 387 607 367 607C347 607 334 594 334 574Z" /><path d="M140 615C140 595 153 582 173 582C193 582 207 595 207 615V631H378C398 631 410 644 410 661C410 679 398 692 378 692H174C152 692 140 680 140 658Z" /></g><g fill="{on}"><path d="M663 365H857C881 365 893 378 893 401C893 423 889 445 883 466H893C911 466 921 477 921 494C921 510 910 522 893 522H646C628 522 617 511 617 494C617 477 628 466 646 466H820C824 451 826 436 825 420H662C644 420 634 409 634 393C634 377 645 365 663 365Z" /><path d="M668 536H858C883 536 894 549 894 574V596C894 622 883 635 859 635H704C701 635 700 637 700 640V648H881C898 648 907 657 907 671C907 685 897 694 880 694L668 696C643 696 631 682 631 654V640C631 612 643 598 668 598H820C823 598 824 597 824 594V588C824 585 823 584 820 584H668C651 584 640 575 640 560C640 546 651 536 668 536Z" /></g></g></svg>',
} as const;

export type GameIconKey = keyof typeof GAME_ICON_SVGS;

export type GameIconPalette = {
  main: string;
  dark: string;
  light: string;
  on: string;
};

const FALLBACK_PRIMARY = "#2563EB";

const WHITE = "#FFFFFF";
const BLACK = "#000000";
/** White letters sit on the main and dark shapes; keep them readable. */
const MIN_LETTER_CONTRAST = 3;

/** The primary, darkened just enough for white letters on top of it. */
function darkenForWhite(color: string) {
  for (let step = 0; step <= 20; step += 1) {
    const candidate = mixHexColors(color, BLACK, step * 0.05) ?? color;
    if (getContrastRatio(candidate, WHITE) >= MIN_LETTER_CONTRAST) {
      return candidate;
    }
  }
  return BLACK;
}

/**
 * The four icon colors for a theme's primary. Letters are always white, so a
 * light primary (amber) is darkened until they read. A near-black primary
 * (the default zinc theme) has no darker shade left, so it becomes the dark
 * one and the main shape is lifted toward white instead.
 */
export function gameIconPalette(primary: string): GameIconPalette {
  const base = normalizeHexColor(primary) ?? FALLBACK_PRIMARY;
  const veryDark = getContrastRatio(base, BLACK) < 2.2;
  const main = veryDark
    ? (mixHexColors(base, WHITE, 0.3) ?? base)
    : darkenForWhite(base);
  const dark = veryDark ? base : (mixHexColors(main, BLACK, 0.4) ?? main);
  const light = mixHexColors(main, WHITE, 0.72) ?? main;
  return { main, dark, light, on: WHITE };
}

export function hasGameIcon(key: string): key is GameIconKey {
  return Object.hasOwn(GAME_ICON_SVGS, key);
}

/** The icon's SVG in the palette's colors. */
export function gameIconSvg(key: GameIconKey, palette: GameIconPalette) {
  return GAME_ICON_SVGS[key].replace(
    /\{(main|dark|light|on)\}/g,
    (_, token: keyof GameIconPalette) => palette[token],
  );
}

/** A data URI expo-image can draw. The SVGs are ASCII, so btoa is safe. */
export function gameIconUri(key: GameIconKey, palette: GameIconPalette) {
  return `data:image/svg+xml;base64,${btoa(gameIconSvg(key, palette))}`;
}
