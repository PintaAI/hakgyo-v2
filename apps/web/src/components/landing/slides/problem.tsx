import {
  ActivityIcon,
  BriefcaseIcon,
  CheckIcon,
  ClipboardListIcon,
  FolderIcon,
  LinkIcon,
  MessagesSquareIcon,
  MonitorPlayIcon,
  PrinterIcon,
  UsersRoundIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react";

import { Headline } from "~/components/brand/typography";

import { slideLabel } from "../deck";
import { Panel, SlidePanels } from "../panels";
import { reveal } from "../reveal";
import { Eyebrow, Slide } from "../slide";

type Problem = {
  icon: LucideIcon;
  title: string;
  detail: string;
  solution: string;
};

type Segment = {
  icon: LucideIcon;
  name: string;
  /** Short label on the arrow that leads to this segment. */
  navLabel: string;
  headline: string;
  description: string;
  promise: string;
  problems: readonly Problem[];
};

const segments: readonly Segment[] = [
  {
    icon: BriefcaseIcon,
    name: "LPK",
    navLabel: "LPK",
    headline: "Persiapan ujian masih serba manual.",
    description:
      "Murid datang bergelombang, soal dicetak berulang, dan informasi tersebar di banyak grup.",
    promise: "Hakgyo membantu digitalisasi LPK Anda.",
    problems: [
      {
        icon: PrinterIcon,
        title: "Cetak soal makan biaya",
        detail: "Latihan dan tryout dicetak ulang untuk setiap angkatan.",
        solution: "Tryout digital berwaktu, tanpa kertas",
      },
      {
        icon: UsersRoundIcon,
        title: "Pembagian kelas manual",
        detail:
          "Setiap murid baru datang, batch disusun ulang lewat catatan atau spreadsheet.",
        solution: "Kelas per angkatan, murid masuk lewat link",
      },
      {
        icon: MessagesSquareIcon,
        title: "Pengumuman tercecer di WhatsApp",
        detail: "Jadwal, materi, dan info ujian tenggelam di banyak grup.",
        solution: "Notifikasi otomatis langsung ke aplikasi murid",
      },
      {
        icon: ActivityIcon,
        title: "Progres murid sulit dipantau",
        detail: "Sulit tahu siapa yang tertinggal sebelum ujian tiba.",
        solution: "Rekap nilai dan peringkat tryout per angkatan",
      },
    ],
  },
  {
    icon: MonitorPlayIcon,
    name: "Program kelas online",
    navLabel: "Online class",
    headline: "Satu program, terlalu banyak aplikasi.",
    description:
      "Setiap bagian kelas berjalan di alat yang berbeda, dan murid harus berpindah-pindah.",
    promise: "Hakgyo menyatukan semuanya dalam satu platform.",
    problems: [
      {
        icon: FolderIcon,
        title: "Materi di Google Drive",
        detail: "Murid mencari file di folder dan link yang terus bertambah.",
        solution: "Kurikulum per bab dengan urutan belajar yang jelas",
      },
      {
        icon: ClipboardListIcon,
        title: "Kuis di Google Form",
        detail: "Nilai direkap manual, tanpa riwayat per murid.",
        solution: "Tugas dan tryout dinilai otomatis",
      },
      {
        icon: VideoIcon,
        title: "Link Zoom dikirim manual",
        detail: "Setiap sesi berarti membuat dan membagikan link baru.",
        solution: "Link Zoom atau Meet dibuat otomatis per jadwal",
      },
      {
        icon: LinkIcon,
        title: "Promosi lewat Linktree",
        detail: "Info kelas dan harga tersebar di bio dan pesan pribadi.",
        solution: "Halaman promosi dengan daftar kelas yang selalu terbaru",
      },
    ],
  },
];

function ProblemCard({
  problem: { icon: Icon, title, detail, solution },
  index,
}: {
  problem: Problem;
  index: number;
}) {
  return (
    <li
      {...reveal(5 + index)}
      className="border-border bg-card relative flex flex-col overflow-hidden rounded-xl border shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:rounded-2xl"
    >
      <span
        className="text-muted-foreground/70 absolute top-5 right-5 hidden font-mono text-[10px] tracking-[0.18em] sm:block"
        aria-hidden="true"
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      {/* Phones get one compact row: icon, problem, and solution. */}
      <div className="grid flex-1 grid-cols-[auto_1fr] items-center gap-x-3 p-3 sm:block sm:p-5">
        <span className="bg-destructive/10 text-destructive ring-destructive/15 row-span-2 grid size-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset">
          <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <p className="text-sm leading-snug font-medium tracking-[-0.01em] sm:mt-4 sm:text-base lg:text-[17px]">
          {title}
        </p>
        <p className="text-muted-foreground mt-0.5 flex items-start gap-1.5 text-[13px] leading-5 sm:hidden">
          <CheckIcon
            className="text-foreground mt-0.5 size-3.5 shrink-0"
            aria-hidden="true"
          />
          <span>
            <span className="sr-only">Solusi Hakgyo: </span>
            {solution}
          </span>
        </p>
        <p className="text-muted-foreground mt-1.5 hidden text-sm leading-6 sm:block">
          {detail}
        </p>
      </div>
      <div className="border-border bg-muted/60 hidden items-start gap-2.5 border-t px-5 py-3.5 sm:flex">
        <span className="bg-primary text-primary-foreground mt-px grid size-4 shrink-0 place-items-center rounded-full">
          <CheckIcon className="size-2.5" strokeWidth={3} aria-hidden="true" />
        </span>
        <p className="text-sm">
          <span className="sr-only">Solusi Hakgyo: </span>
          <span className="font-medium">{solution}</span>
        </p>
      </div>
    </li>
  );
}

function SegmentPage({ segment, index }: { segment: Segment; index: number }) {
  const Icon = segment.icon;
  return (
    <div className="grid gap-4 sm:gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-14">
      <div>
        <Eyebrow
          slide="masalah"
          label={`Masalah ${index + 1} dari ${segments.length}`}
        />
        <p
          {...reveal(1)}
          className="border-border bg-background mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium sm:mt-6 sm:py-1.5 sm:text-sm"
        >
          <Icon className="size-4" aria-hidden="true" />
          {segment.name}
        </p>
        <h3
          {...reveal(2)}
          className="mt-2.5 text-[1.625rem] leading-[1.1] font-medium tracking-[-0.04em] sm:mt-4 sm:text-4xl xl:text-5xl"
        >
          {segment.headline}
        </h3>
        <p
          {...reveal(3)}
          className="text-muted-foreground mt-5 hidden text-base leading-7 sm:block lg:text-lg lg:leading-8"
        >
          {segment.description}
        </p>
        <p
          {...reveal(4)}
          className="mt-6 hidden items-center gap-2 text-sm font-medium sm:flex"
        >
          <span className="bg-primary h-px w-6" />
          {segment.promise}
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        {segment.problems.map((problem, problemIndex) => (
          <ProblemCard
            key={problem.title}
            problem={problem}
            index={problemIndex}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * The problem slide: a title page followed by one page per customer segment,
 * each with its own problems and Hakgyo's answer to them.
 */
export function ProblemSlide() {
  const labels = [
    slideLabel("masalah"),
    ...segments.map(({ navLabel }) => navLabel),
  ];
  return (
    <Slide id="masalah">
      <SlidePanels labels={labels} pages={labels} className="lg:items-center">
        <Panel>
          <Eyebrow slide="masalah" />
          <Headline
            {...reveal(1)}
            id="masalah-title"
            title="Masalah yang Hakgyo"
            muted="coba selesaikan."
            className="mt-3 max-w-5xl text-[2.25rem] leading-[1.05] tracking-[-0.05em] sm:mt-5 sm:text-6xl sm:leading-[1.05] sm:tracking-[-0.05em] xl:text-7xl"
          />
          <p
            {...reveal(2)}
            className="text-muted-foreground mt-3 max-w-xl text-[15px] leading-6 sm:mt-6 sm:text-lg sm:leading-8"
          >
            Dua jenis program, dua masalah yang berbeda. Keduanya berawal dari
            pekerjaan yang masih manual dan tersebar.
          </p>
        </Panel>
        {segments.map((segment, index) => (
          <Panel key={segment.name}>
            <SegmentPage segment={segment} index={index} />
          </Panel>
        ))}
      </SlidePanels>
    </Slide>
  );
}
