export type UserDocHeading = {
  id: string;
  text: string;
  level: 2 | 3;
  /** 1-based line of the heading in the Markdown source. */
  line: number;
};

const fencePattern = /^\s{0,3}(`{3,}|~{3,})/;
const headingLinePattern = /^\s{0,3}(#{2,3})\s+(.+?)\s*#*\s*$/;

/** Plain heading text: inline Markdown and HTML removed. */
export function headingText(markdown: string) {
  return markdown
    .replace(/<[^>]+>/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__|\*|_|~~|`)/g, "")
    .trim();
}

export function slugifyHeading(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** `##` and `###` headings outside fenced code blocks, with unique ids. */
export function getDocHeadings(content: string): UserDocHeading[] {
  const headings: UserDocHeading[] = [];
  const used = new Map<string, number>();
  let fence: string | null = null;

  content.split(/\r?\n/).forEach((rawLine, index) => {
    const fenceMatch = fencePattern.exec(rawLine);
    if (fenceMatch?.[1]) {
      const marker = fenceMatch[1];
      if (!fence) fence = marker[0]!.repeat(3);
      else if (marker.startsWith(fence)) fence = null;
      return;
    }
    if (fence) return;

    const match = headingLinePattern.exec(rawLine);
    if (!match?.[1] || !match[2]) return;

    const text = headingText(match[2]);
    const base = slugifyHeading(text) || "bagian";
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);

    headings.push({
      id: count ? `${base}-${count}` : base,
      text,
      level: match[1].length === 2 ? 2 : 3,
      line: index + 1,
    });
  });

  return headings;
}
