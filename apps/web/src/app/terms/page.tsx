import type { Metadata } from "next";
import Link from "next/link";
import { supportEmail } from "@hakgyo/shared";

import {
  EmailLink,
  LegalList as List,
  LegalPage,
  LegalSection as Section,
} from "~/components/legal-page";

const title = "Syarat dan Ketentuan";
const description =
  "Aturan pemakaian situs web dan aplikasi mobile Hakgyo untuk murid, pengajar, dan lembaga.";
const lastUpdated = "6 Oktober 2026";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title={title}
      intro={
        <>
          <p>Terakhir diperbarui {lastUpdated}.</p>
          <p>
            Syarat ini berlaku saat Anda memakai situs web Hakgyo, aplikasi
            mobile Hakgyo, atau koneksi Hakgyo ke asisten AI. Dengan membuat
            akun atau memakai Hakgyo, Anda menyetujui syarat ini dan{" "}
            <Link
              href="/privacy"
              className="text-foreground underline underline-offset-4"
            >
              Kebijakan Privasi
            </Link>
            .
          </p>
        </>
      }
    >
      <Section title="Layanan Hakgyo">
        <p>
          Hakgyo adalah platform tempat lembaga dan pengajar menjalankan kelas
          bahasa Korea: kurikulum, group belajar, tugas, tryout, kosakata, dan
          aplikasi murid. Materi kelas dibuat dan dikelola oleh lembaga masing-
          masing. Aplikasi mobile Hakgyo ditujukan untuk murid; pengelolaan
          kelas dilakukan di situs web.
        </p>
      </Section>

      <Section title="Akun">
        <List>
          <li>
            Anda harus berusia minimal 13 tahun, atau memakai Hakgyo dengan izin
            dan pendampingan orang tua atau wali.
          </li>
          <li>
            Berikan data yang benar dan jaga kerahasiaan kata sandi Anda. Anda
            bertanggung jawab atas aktivitas di akun Anda.
          </li>
          <li>
            Anda dapat menghapus akun kapan saja dari pengaturan akun di situs
            web atau di aplikasi mobile.
          </li>
        </List>
      </Section>

      <Section title="Lembaga dan kelas">
        <p>
          Lembaga menentukan siapa yang terdaftar di kelasnya, isi materi,
          jadwal, penilaian, dan harga kelas. Pertanyaan tentang isi kelas,
          nilai, atau pendaftaran sebaiknya diajukan ke lembaga
          penyelenggaranya. Lembaga dapat mengakhiri pendaftaran Anda di
          kelasnya sesuai aturan lembaga tersebut.
        </p>
      </Section>

      <Section title="Pembayaran kelas">
        <p>
          Kelas berbayar dibayar langsung ke rekening atau QRIS lembaga melalui
          situs web, bukan melalui aplikasi mobile. Hakgyo tidak memungut
          pembayaran tersebut dan tidak menyimpan data kartu pembayaran.
          Konfirmasi pembayaran, harga, dan pengembalian dana menjadi tanggung
          jawab lembaga penyelenggara.
        </p>
      </Section>

      <Section title="Aturan pemakaian">
        <p>Saat memakai Hakgyo, Anda tidak boleh:</p>
        <List>
          <li>
            mengunggah atau mengirim konten yang melanggar hukum, menyinggung,
            melecehkan, atau melanggar hak orang lain;
          </li>
          <li>
            mencontek atau membagikan soal tugas dan tryout tanpa izin lembaga;
          </li>
          <li>
            mencoba mengakses akun, kelas, atau data yang bukan milik Anda;
          </li>
          <li>mengganggu, membebani, atau merekayasa balik layanan Hakgyo.</li>
        </List>
        <p>
          Kami dapat menangguhkan atau menutup akun yang melanggar aturan ini.
        </p>
      </Section>

      <Section title="Konten">
        <p>
          Materi, soal, dan file tetap menjadi milik pembuatnya atau lembaga
          masing-masing. Jawaban dan hasil belajar Anda dapat dilihat oleh
          lembaga dan pengajar kelas Anda. Anda memberi Hakgyo izin untuk
          menyimpan dan menampilkan konten tersebut sejauh diperlukan untuk
          menjalankan layanan.
        </p>
      </Section>

      <Section title="Fitur AI">
        <p>
          Beberapa fitur memakai AI untuk membantu membuat contoh kosakata atau
          mengimpor soal. Hasil AI dapat keliru, jadi periksa kembali sebelum
          dipakai. Koneksi ke asisten AI pihak ketiga tunduk pada kebijakan
          penyedia asisten tersebut.
        </p>
      </Section>

      <Section title="Ketersediaan dan tanggung jawab">
        <p>
          Kami berusaha menjaga Hakgyo tetap tersedia dan aman, tetapi layanan
          disediakan sebagaimana adanya dan dapat terganggu sementara untuk
          pemeliharaan atau karena hal di luar kendali kami. Sejauh diizinkan
          hukum, Hakgyo tidak bertanggung jawab atas kerugian tidak langsung
          yang timbul dari pemakaian layanan.
        </p>
      </Section>

      <Section title="Perubahan syarat">
        <p>
          Jika syarat ini berubah, kami memperbarui tanggal di atas dan memberi
          tahu pengguna untuk perubahan yang penting. Syarat ini diatur oleh
          hukum Republik Indonesia.
        </p>
      </Section>

      <Section title="Hubungi kami">
        <p>
          Pertanyaan tentang syarat ini dapat dikirim ke{" "}
          <EmailLink email={supportEmail} />.
        </p>
      </Section>
    </LegalPage>
  );
}
