import { describe, expect, test } from "bun:test";

import { createDefaultLandingHtml } from "./default-template";
import {
  applyLandingCopy,
  extractLandingFields,
  extractLandingMetadata,
  renderLandingDocument,
  validateLandingHtml,
  type LandingUrlPolicy,
} from "./html";

const policy: LandingUrlPolicy = {
  appOrigin: "https://hakgyo.test",
  links: ["https://hakgyo.test/catalog/c1", "hakgyo://courses/c1"],
  assetOrigins: ["https://cdn.hakgyo.test"],
};

function page(body: string, head = "") {
  return `<!doctype html><html lang="id"><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title data-hakgyo-edit="seo.title">Academy</title>
<meta name="description" data-hakgyo-edit="seo.description" content="Belajar Korea">
${head}</head><body><h1 id="top-title" data-hakgyo-edit="hero.title">Halo</h1>${body}</body></html>`;
}

function messages(html: string) {
  return validateLandingHtml(html, policy).errors.map((issue) => issue.message);
}

describe("landing HTML validation", () => {
  test("accepts the starter template", () => {
    const html = createDefaultLandingHtml({
      name: `Kim's <Academy>`,
      logoUrl: "https://cdn.hakgyo.test/logo.png",
      primaryColor: "#123456",
    });
    expect(validateLandingHtml(html, policy)).toEqual({
      errors: [],
      warnings: [],
    });
  });

  test("requires the document structure and editable copy", () => {
    const errors = messages("<p>Hi</p>");
    expect(errors).toContain("Start the document with <!doctype html>");
    expect(errors).toContain(
      'Add a lang attribute to <html>, e.g. <html lang="id">',
    );
    expect(errors).toContain("Add a non-empty <title>");
    expect(errors.some((error) => error.includes("data-hakgyo-edit"))).toBe(
      true,
    );
  });

  test("rejects forms, frames, external scripts, and forbidden APIs", () => {
    const errors = messages(
      page(`<form><input name="email"></form>
<iframe src="https://cdn.hakgyo.test/x"></iframe>
<script src="https://evil.test/x.js"></script>
<script>fetch("/api/trpc"); document.cookie; localStorage.x = 1; window.parent.postMessage(1)</script>`),
    );
    expect(errors.some((error) => error.startsWith("<form>"))).toBe(true);
    expect(errors.some((error) => error.startsWith("<input>"))).toBe(true);
    expect(errors.some((error) => error.startsWith("<iframe>"))).toBe(true);
    expect(errors).toContain(
      "External scripts are not allowed; inline the script",
    );
    for (const label of [
      "network requests",
      "document.cookie",
      "browser storage",
      "parent windows",
    ])
      expect(errors).toContain(`Scripts must not use ${label}`);
  });

  test("allows harmless scripts that mention similar words", () => {
    expect(
      messages(
        page(
          `<script>const node = { parent: 1 }; node.parent.toFixed; document.querySelector("h1").classList.add("in")</script>`,
        ),
      ),
    ).toEqual([]);
  });

  test("only links to allowlisted Hakgyo URLs and existing anchors", () => {
    const result = validateLandingHtml(
      page(`<a href="https://hakgyo.test/catalog/c1?ref=landing">ok</a>
<a href="hakgyo://courses/c1">app</a>
<a href="#top-title">anchor</a>
<a href="mailto:hi@academy.test">mail</a>
<a href="https://instagram.com/academy">ig</a>
<a href="https://hakgyo.test/admin">bad</a>
<a href="/catalog">relative</a>
<a href="#missing">missing</a>
<a href="javascript:alert(1)">js</a>`),
      policy,
    );
    expect(result.errors.map((issue) => issue.message)).toEqual([
      'Link "https://hakgyo.test/admin" is not a Hakgyo URL from hakgyo.landing.get_context',
      'Link "/catalog" must be an absolute URL from hakgyo.landing.get_context',
      'Link "#missing" points to a missing id',
      'Link "javascript:alert(1)" must use https://',
    ]);
    expect(result.warnings).toEqual([
      {
        message:
          "External link https://instagram.com/academy is not verified by Hakgyo; confirm it with the owner",
      },
    ]);
  });

  test("only loads assets from allowed origins", () => {
    const errors = messages(
      page(
        `<img src="https://cdn.hakgyo.test/a.jpg" alt=""><img src="https://tracker.test/p.gif" alt="">
<div style="background:url('http://cdn.hakgyo.test/b.jpg')"></div>`,
        `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">
<style>@import url("https://evil.test/x.css");</style>`,
      ),
    );
    expect(errors).toHaveLength(3);
    expect(errors[0]).toBe(
      "@import is only allowed for https://fonts.googleapis.com",
    );
    expect(errors[1]).toContain("https://tracker.test/p.gif");
    expect(errors[2]).toContain("must be an https:// URL");
  });

  test("reports line numbers and edit marker mistakes", () => {
    const result = validateLandingHtml(
      page(`
<p data-hakgyo-edit="hero.title">Duplicate</p>
<p data-hakgyo-edit="Bad Key">x</p>
<p data-hakgyo-edit="about.body">Hi <b>there</b></p>`),
      policy,
    );
    expect(result.errors).toEqual([
      {
        message: 'data-hakgyo-edit="hero.title" is used more than once',
        line: 6,
      },
      {
        message:
          'data-hakgyo-edit="Bad Key" must be lowercase words joined by "." or "-", e.g. hero.title',
        line: 7,
      },
      {
        message:
          'data-hakgyo-edit="about.body" must contain only text; move nested elements outside it',
        line: 8,
      },
    ]);
  });

  test("requires a course card template with a title and link", () => {
    expect(
      messages(
        page(
          `<div data-hakgyo-slot="courses"><template><p data-hakgyo-field="price"></p></template></div><div data-hakgyo-slot="teachers"></div><p data-hakgyo-field="title"></p>`,
        ),
      ),
    ).toEqual([
      'The course card <template> needs a data-hakgyo-field="title" element',
      'The course card <template> needs a data-hakgyo-field="link" <a>',
      'Unknown slot "teachers"; supported: courses',
      'Slot "teachers" must contain exactly one <template> card',
      "data-hakgyo-field is only allowed inside a slot <template>",
    ]);
  });

  test("rejects documents over the size limit", () => {
    expect(messages("x".repeat(500_001))[0]).toContain("the limit is 500000");
  });
});

describe("landing copy", () => {
  const html = page(
    `<div data-hakgyo-slot="courses"><template><a data-hakgyo-field="link" href="#top-title"><h3 data-hakgyo-field="title" data-hakgyo-edit="ignored">x</h3></a></template></div>`,
  );

  test("extracts editable fields in document order, outside templates", () => {
    expect(extractLandingFields(html)).toEqual([
      { key: "seo.title", text: "Academy" },
      { key: "seo.description", text: "Belajar Korea" },
      { key: "hero.title", text: "Halo" },
    ]);
  });

  test("replaces text as plain text and meta content as an attribute", () => {
    const updated = applyLandingCopy(html, {
      "hero.title": "<script>alert(1)</script> Annyeong",
      "seo.description": 'Kelas "terbaik"',
    });
    expect(updated).toContain(
      "&lt;script&gt;alert(1)&lt;/script&gt; Annyeong</h1>",
    );
    expect(extractLandingMetadata(updated)).toEqual({
      title: "Academy",
      description: 'Kelas "terbaik"',
      image: null,
    });
    expect(() => applyLandingCopy(html, { "nope.key": "x" })).toThrow(
      "Unknown copy fields: nope.key",
    );
  });
});

describe("landing rendering", () => {
  test("fills the course slot and targets the top window", () => {
    const html = page(
      `<div data-hakgyo-slot="courses"><template><a data-hakgyo-field="link" href="#top-title"><img data-hakgyo-field="image" alt=""><h3 data-hakgyo-field="title">x</h3><p data-hakgyo-field="description">d</p><span data-hakgyo-field="price">p</span></a></template></div>`,
    );
    const rendered = renderLandingDocument(html, {
      courses: [
        {
          id: "c1",
          title: "Korean <1>",
          description: null,
          thumbnailUrl: "https://cdn.hakgyo.test/c1.jpg",
          price: 150000,
          currency: "IDR",
          url: "https://hakgyo.test/catalog/c1",
        },
        {
          id: "c2",
          title: "Free",
          description: "Gratis untuk semua",
          thumbnailUrl: null,
          price: 0,
          currency: "IDR",
          url: "https://hakgyo.test/catalog/c2",
        },
      ],
    });
    expect(rendered).toContain('<head><base target="_top">');
    expect(rendered).not.toContain("<template>");
    expect(rendered).toContain('data-hakgyo-count="2"');
    expect(rendered).toContain(
      '<a data-hakgyo-field="link" href="https://hakgyo.test/catalog/c1"><img data-hakgyo-field="image" alt="Korean <1>" src="https://cdn.hakgyo.test/c1.jpg"><h3 data-hakgyo-field="title">Korean &lt;1&gt;</h3><span data-hakgyo-field="price">Rp',
    );
    expect(rendered).toContain(
      '<a data-hakgyo-field="link" href="https://hakgyo.test/catalog/c2"><h3 data-hakgyo-field="title">Free</h3><p data-hakgyo-field="description">Gratis untuk semua</p><span data-hakgyo-field="price">Gratis</span></a>',
    );
  });
});
