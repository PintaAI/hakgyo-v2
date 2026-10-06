import type { Metadata } from "next";
import Link from "next/link";
import { supportEmail } from "@hakgyo/shared";

import {
  EmailLink,
  LegalList as List,
  LegalPage,
  LegalSection as Section,
} from "~/components/legal-page";

const title = "Bantuan";
const description =
  "Cara menghubungi tim Hakgyo dan jawaban untuk pertanyaan umum tentang akun, kelas, dan aplikasi mobile.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <LegalPage
      title={title}
      intro={
        <p>
          Butuh bantuan dengan Hakgyo? Kirim email ke{" "}
          <EmailLink email={supportEmail} />. Sertakan email akun Anda, nama
          lembaga atau kelas, dan jenis perangkat jika masalahnya terjadi di
          aplikasi mobile.
        </p>
      }
    >
      <Section title="Akun">
        <List>
          <li>
            <strong className="text-foreground">Membuat akun:</strong> daftar
            gratis dengan email atau Google di situs web dan aplikasi mobile,
            atau dengan Apple di aplikasi iPhone dan iPad.
          </li>
          <li>
            <strong className="text-foreground">Lupa kata sandi:</strong> kirim
            email ke tim bantuan dari alamat email akun Anda, atau masuk dengan
            Google jika akun Anda memakai alamat Gmail yang sama.
          </li>
          <li>
            <strong className="text-foreground">Menghapus akun:</strong> di
            aplikasi mobile buka Profil &gt; Pengaturan &gt; Detail akun &gt;
            Hapus akun. Di situs web buka pengaturan akun &gt; Zona berbahaya.
            Pemilik lembaga perlu memindahkan kepemilikan terlebih dahulu.
          </li>
        </List>
      </Section>

      <Section title="Kelas dan materi">
        <List>
          <li>
            Kelas, materi, jadwal, dan nilai dikelola oleh lembaga Anda. Untuk
            pertanyaan tentang isi kelas atau pendaftaran, hubungi lembaga
            penyelenggara.
          </li>
          <li>
            Akun baru langsung mendapat kurikulum Hangeul Mastery. Kelas lain
            muncul setelah lembaga mendaftarkan Anda atau Anda bergabung lewat
            tautan undangan.
          </li>
        </List>
      </Section>

      <Section title="Aplikasi mobile">
        <List>
          <li>
            Materi yang sudah diunduh tetap bisa dipelajari tanpa internet.
            Progres disinkronkan otomatis saat perangkat kembali online, atau
            lewat Profil &gt; Pengaturan &gt; Sinkronkan materi dan progres.
          </li>
          <li>
            Notifikasi tugas, tryout, dan pertemuan dapat diatur di Profil &gt;
            Pengaturan &gt; Notifikasi.
          </li>
          <li>
            Latihan dengan suara memerlukan izin mikrofon dan pengenalan suara.
            Jika izin ditolak, Anda tetap bisa mengetik jawaban.
          </li>
        </List>
      </Section>

      <Section title="Privasi dan ketentuan">
        <p>
          Baca{" "}
          <Link
            href="/privacy"
            className="text-foreground underline underline-offset-4"
          >
            Kebijakan Privasi
          </Link>{" "}
          dan{" "}
          <Link
            href="/terms"
            className="text-foreground underline underline-offset-4"
          >
            Syarat dan Ketentuan
          </Link>{" "}
          Hakgyo.
        </p>
      </Section>
    </LegalPage>
  );
}
