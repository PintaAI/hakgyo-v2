const escapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => escapes[character]!);
}

/**
 * Starter page for organizations that have not generated one with AI yet.
 * It follows the same contract as AI documents and passes the same validator.
 */
export function createDefaultLandingHtml(organization: {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
}) {
  const name = escapeHtml(organization.name);
  const logo = organization.logoUrl
    ? `<img class="logo" src="${escapeHtml(organization.logoUrl)}" alt="${name}">`
    : "";
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title data-hakgyo-edit="seo.title">${name}</title>
<meta name="description" data-hakgyo-edit="seo.description" content="Temukan kelas dari ${name} dan mulai belajar hari ini.">
<style>
:root { --brand: ${organization.primaryColor}; --ink: #18181b; --muted: #52525b; --paper: #fafaf9; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--ink); background: var(--paper); line-height: 1.6; }
a { color: inherit; }
.wrap { width: min(1080px, 100% - 2.5rem); margin-inline: auto; }
header { padding-block: 1.25rem; display: flex; align-items: center; gap: .75rem; font-weight: 600; }
.logo { width: 2.5rem; height: 2.5rem; border-radius: .6rem; object-fit: cover; }
.hero { padding-block: clamp(3rem, 10vw, 7rem); }
.eyebrow { color: var(--brand); font-weight: 600; letter-spacing: .02em; margin: 0 0 1rem; }
h1 { font-size: clamp(2.25rem, 6vw, 4rem); line-height: 1.08; margin: 0; max-width: 16ch; }
.lead { font-size: 1.15rem; color: var(--muted); max-width: 56ch; margin: 1.5rem 0 2rem; }
.cta { display: inline-block; background: var(--brand); color: #fff; padding: .85rem 1.5rem; border-radius: 999px; text-decoration: none; font-weight: 600; }
.cta:focus-visible, .card:focus-visible { outline: 3px solid var(--brand); outline-offset: 3px; }
section { padding-block: 3rem; }
h2 { font-size: clamp(1.6rem, 4vw, 2.25rem); margin: 0 0 .5rem; }
.courses { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); margin-top: 2rem; }
.courses[data-hakgyo-count="0"]::before { content: "Kelas baru segera hadir."; color: var(--muted); }
.card { display: flex; flex-direction: column; background: #fff; border: 1px solid #e4e4e7; border-radius: 1rem; overflow: hidden; text-decoration: none; transition: transform .2s ease; }
.card:hover { transform: translateY(-2px); }
.card img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
.card-body { padding: 1.25rem; display: grid; gap: .5rem; }
.card h3 { margin: 0; font-size: 1.1rem; }
.card p { margin: 0; color: var(--muted); font-size: .95rem; }
.price { font-weight: 600; color: var(--brand); }
footer { padding-block: 2.5rem; color: var(--muted); font-size: .9rem; }
@media (prefers-reduced-motion: reduce) { .card { transition: none; } }
</style>
</head>
<body>
<div class="wrap">
<header>${logo}<span>${name}</span></header>
<main>
<section class="hero">
<p class="eyebrow" data-hakgyo-edit="hero.eyebrow">Mulai belajar hari ini</p>
<h1 data-hakgyo-edit="hero.title">Bertumbuh bersama ${name}</h1>
<p class="lead" data-hakgyo-edit="hero.description">Temukan kelas untuk membangun kepercayaan diri, membuka kemungkinan baru, dan melangkah menuju tujuanmu.</p>
<a class="cta" href="#kelas" data-hakgyo-edit="hero.cta">Lihat kelas</a>
</section>
<section id="kelas">
<h2 data-hakgyo-edit="courses.title">Temukan kelas untukmu</h2>
<p class="lead" data-hakgyo-edit="courses.description">Pilih kelas yang sesuai dengan tujuan belajarmu.</p>
<div class="courses" data-hakgyo-slot="courses">
<template>
<a class="card" data-hakgyo-field="link" href="#kelas">
<img data-hakgyo-field="image" alt="">
<div class="card-body">
<h3 data-hakgyo-field="title">Judul kelas</h3>
<p data-hakgyo-field="description">Deskripsi kelas</p>
<span class="price" data-hakgyo-field="price">Gratis</span>
</div>
</a>
</template>
</div>
</section>
</main>
<footer data-hakgyo-edit="footer.text">© ${name}</footer>
</div>
</body>
</html>
`;
}
