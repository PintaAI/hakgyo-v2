import { ConversationDemo } from "../demos/conversation";
import { LearnerAppDemo } from "../demos/learner-app";
import { Panel, SlidePanels } from "../panels";
import { reveal } from "../reveal";
import { CheckList, Headline, Slide, SlideHeading } from "../slide";

const games = [
  {
    glyph: "한",
    name: "Hangeul",
    description: "Kenali 10 vokal dan 14 konsonan dasar Hangeul.",
  },
  {
    glyph: "글",
    name: "Susun 한글",
    description: "Ketik huruf dan susun menjadi blok suku kata.",
  },
  {
    glyph: "가나",
    name: "Susun kata",
    description: "Susun kata Korea dari blok suku kata Hangeul.",
  },
  {
    glyph: "↔",
    name: "Susun makna",
    description: "Susun kata menjadi contoh kalimat dari kosakata.",
  },
  {
    glyph: "⌁",
    name: "Cocokkan Kata",
    description: "Hubungkan setiap kata dengan artinya.",
  },
  {
    glyph: "↓",
    name: "Hujan Kata",
    description: "Ketik setiap kata sebelum mengenai kapal.",
  },
  {
    glyph: "Aa",
    name: "Kartu",
    description: "Balik kartu dan ingat setiap kata.",
  },
];

/** The learner app, its practice games, and a Korean conversation block. */
export function LearnerAppSlide() {
  return (
    <Slide id="aplikasi">
      {/* Large screens page through: the app, the games, an example. */}
      <SlidePanels
        labels={["Fitur", "Aplikasi", "Game", "Contoh"]}
        pages={["Aplikasi", "Game", "Contoh"]}
        className="lg:items-center"
      >
        <Panel page={1} className="lg:w-[46%]">
          <SlideHeading
            id="aplikasi"
            descriptionOnPhones={false}
            title="Aplikasi murid,"
            muted="khusus bahasa Korea."
            description="Aplikasi dengan brand Anda, dirancang untuk belajar bahasa Korea: dari Hangeul, percakapan, sampai latihan pengucapan."
          />
          <CheckList
            items={[
              "Logo dan warna lembaga Anda, tema dibuat dari logo",
              "Blok percakapan, tata bahasa, dan budaya di editor materi",
              "Latihan mengucapkan kosakata dengan pengenalan suara",
              "XP, streak, notifikasi, dan tetap jalan saat offline",
            ]}
          />
        </Panel>
        <Panel page={1} sharesPage className="lg:mr-[10%] lg:justify-self-end">
          <div {...reveal(3)} className="py-1 sm:py-4 lg:py-0">
            <LearnerAppDemo />
          </div>
        </Panel>
        <Panel page={2}>
          <p
            {...reveal(6)}
            className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase sm:text-xs lg:hidden"
          >
            {games.length} game latihan di aplikasi
          </p>
          <Headline
            as="h3"
            revealOrder={0}
            title={`${games.length} game latihan`}
            muted="di aplikasi murid."
            className="hidden max-w-3xl lg:block"
          />
          {/* A list on phones, a grid of cards on large screens. */}
          <ul className="mt-3 grid gap-2 lg:mt-12 lg:grid-cols-4 lg:gap-4">
            {games.map(({ glyph, name, description }, index) => (
              <li
                key={name}
                {...reveal(2 + index)}
                className="border-border bg-card flex items-center gap-3 rounded-xl border p-1.5 lg:flex-col lg:items-start lg:gap-0 lg:rounded-2xl lg:p-5"
              >
                <span className="bg-secondary grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold lg:h-12 lg:w-auto lg:min-w-12 lg:rounded-xl lg:px-3 lg:text-lg">
                  {glyph}
                </span>
                <span className="min-w-0 text-sm lg:mt-6">
                  <span className="block font-medium lg:text-lg lg:tracking-tight">
                    {name}
                  </span>
                  <span className="text-muted-foreground block text-[13px] leading-5 lg:mt-1 lg:text-sm lg:leading-6">
                    {description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          page={3}
          className="lg:w-[72%] lg:max-w-4xl lg:justify-self-center"
        >
          <figure {...reveal(0)} className="min-w-0">
            <ConversationDemo />
            <figcaption className="text-muted-foreground mt-2 text-center text-xs sm:mt-4">
              Blok percakapan asli dari editor materi Hakgyo
            </figcaption>
          </figure>
        </Panel>
      </SlidePanels>
    </Slide>
  );
}
