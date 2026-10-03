"""Draws the sample files the kurikulum recording uploads: a course cover, a small
PDF textbook (cover, table of contents, six numbered pages), a photographed-style
word list for "Impor AI", a question sheet for the tugas "Impor AI", and an illustration. Everything is made up.
Run after `bun run setup` (needs the Noto Sans KR font).
"""
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "assets")
FONT = os.path.join(HERE, "..", "demo", "assets", "NotoSansKR.ttf")
os.makedirs(OUT, exist_ok=True)


def font(size):
    return ImageFont.truetype(FONT, size)


def cover():
    im = Image.new("RGB", (1536, 864), "#0f172a")
    d = ImageDraw.Draw(im)
    for y in range(864):  # soft diagonal gradient
        c = int(15 + 50 * y / 864)
        d.line([(0, y), (1536, y)], fill=(c, c + 8, c + 40))
    d.text((110, 150), "한국어", font=font(260), fill="#ffffff")
    d.text((120, 520), "Bahasa Korea untuk Pemula", font=font(72), fill="#e2e8f0")
    d.text((120, 620), "Dari Hangeul sampai percakapan sehari-hari", font=font(40), fill="#94a3b8")
    im.save(os.path.join(OUT, "cover.png"))


def page(number, title, lines, toc=False):
    im = Image.new("RGB", (900, 1260), "#fffdf7")
    d = ImageDraw.Draw(im)
    d.rectangle([40, 40, 860, 1220], outline="#d6cfc2", width=3)
    d.text((90, 110), title, font=font(54), fill="#1f2937")
    y = 240
    for line in lines:
        d.text((90, y), line, font=font(34), fill="#374151")
        y += 64 if not toc else 80
    if number:
        d.text((430, 1150), str(number), font=font(34), fill="#6b7280")
    return im


def textbook():
    pages = [
        page(None, "한국어 기초", ["Buku Bahasa Korea Pemula", "", "Penerbit Contoh"]),
        page(None, "Daftar Isi", ["Bab 1  Makanan dan Minuman ........ 1", "Bab 2  Transportasi ........ 5"], toc=True),
        page(1, "Bab 1  Makanan dan Minuman", ["밥  (nasi)", "물  (air)", "김치  (kimci)", "이거 주세요  (Tolong yang ini)"]),
        page(2, "Bab 1  Dialog di Restoran", ["A: 어서 오세요.", "B: 비빔밥 하나 주세요.", "A: 네, 알겠습니다."]),
        page(3, "Bab 1  Latihan", ["Terjemahkan ke bahasa Indonesia:", "1. 맛있어요", "2. 물 주세요", "3. 계산해 주세요"]),
        page(4, "Bab 1  Rangkuman", ["Menyebut nama makanan", "Memesan makanan", "Meminta bon"]),
        page(5, "Bab 2  Transportasi", ["버스  (bus)", "지하철  (kereta bawah tanah)", "역이 어디예요?  (Di mana stasiunnya?)"]),
        page(6, "Bab 2  Latihan", ["Tulis dalam bahasa Korea:", "bus   taksi   stasiun"]),
    ]
    pages[0].save(os.path.join(OUT, "buku-contoh.pdf"), save_all=True, append_images=pages[1:], resolution=100)


def word_list():
    im = Image.new("RGB", (1200, 900), "#fefce8")
    d = ImageDraw.Draw(im)
    d.text((60, 40), "Kosakata Pekerjaan", font=font(56), fill="#1f2937")
    rows = [("공장", "gongjang", "pabrik"), ("안전", "anjeon", "keselamatan"), ("기계", "gigye", "mesin"), ("월급", "wolgeup", "gaji bulanan"),
            ("휴가", "hyuga", "cuti"), ("회사", "hoesa", "perusahaan"), ("일하다", "ilhada", "bekerja")]
    y = 150
    for ko, rom, idn in rows:
        d.text((80, y), ko, font=font(54), fill="#111827")
        d.text((420, y + 8), rom, font=font(40), fill="#4b5563")
        d.text((760, y + 8), idn, font=font(40), fill="#111827")
        d.line([(60, y + 85), (1140, y + 85)], fill="#e5e7eb", width=2)
        y += 100
    im.save(os.path.join(OUT, "daftar-kosakata.png"))


def question_sheet():
    """A worksheet photo: the first two questions have their answer circled, the third has none (so AI proposes it)."""
    im = Image.new("RGB", (1200, 1000), "#fffdf5")
    d = ImageDraw.Draw(im)
    d.text((60, 40), "Latihan Hangeul - Konsonan", font=font(52), fill="#1f2937")
    qs = [("1. Huruf ㄱ dibaca ...", ["g / k", "n", "d / t", "m"], 0),
          ("2. Huruf ㄴ dibaca ...", ["r / l", "n", "s", "b / p"], 1),
          ("3. Huruf ㅅ dibaca ...", ["j", "s", "h", "ch"], None)]
    y = 150
    for q, opts, key in qs:
        d.text((60, y), q, font=font(44), fill="#111827")
        y += 80
        for i, o in enumerate(opts):
            x = 100 + i * 270
            label = f"{'abcd'[i]}. {o}"
            d.text((x, y), label, font=font(40), fill="#111827")
            if key == i:
                d.ellipse([x - 22, y - 6, x + 175, y + 62], outline="#dc2626", width=5)
        y += 160
    im.save(os.path.join(OUT, "lembar-soal.png"))


def illustration():
    im = Image.new("RGB", (800, 600), "#dbeafe")
    d = ImageDraw.Draw(im)
    d.ellipse([220, 120, 580, 480], fill="#3b82f6")
    d.text((300, 230), "공장", font=font(120), fill="#ffffff")
    im.save(os.path.join(OUT, "ilustrasi-pabrik.png"))


cover(); textbook(); word_list(); question_sheet(); illustration()
print("samples:", sorted(os.listdir(OUT)))
