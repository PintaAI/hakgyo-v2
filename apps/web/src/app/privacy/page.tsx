import type { Metadata } from "next";
import type { ReactNode } from "react";

import { BrandLink } from "~/components/brand/brand-link";
import { landingContainer } from "~/components/landing/layout";
import { WhatsAppLink } from "~/components/landing/slide";
import { ThemeToggle } from "~/components/theme-toggle";

const title = "Kebijakan Privasi";
const description =
  "Data apa yang dikumpulkan Hakgyo, untuk apa dipakai, kepada siapa dibagikan, berapa lama disimpan, dan kendali yang Anda miliki.";
const lastUpdated = "3 Oktober 2026";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy" },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-foreground text-xl font-medium tracking-[-0.03em]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function List({ children }: { children: ReactNode }) {
  return <ul className="grid list-disc gap-2 pl-5">{children}</ul>;
}

export default function PrivacyPage() {
  return (
    <div className="min-h-svh">
      <header
        className={`${landingContainer} flex h-16 items-center justify-between gap-4 sm:h-20`}
      >
        <BrandLink />
        <ThemeToggle />
      </header>
      <main
        className={`${landingContainer} text-muted-foreground grid max-w-3xl gap-10 pt-8 pb-24 text-[15px] leading-7 sm:pt-14 2xl:max-w-3xl`}
      >
        <div className="grid gap-3">
          <h1 className="text-foreground text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
            {title}
          </h1>
          <p>Terakhir diperbarui {lastUpdated}.</p>
          <p>
            Hakgyo adalah platform yang dipakai lembaga dan pengajar untuk
            menjalankan kelas bahasa Korea: kurikulum, group belajar, tugas,
            tryout, kosakata, dan aplikasi murid. Kebijakan ini berlaku untuk
            situs web Hakgyo, aplikasi mobile Hakgyo, dan koneksi Hakgyo ke
            asisten AI seperti ChatGPT dan Claude.
          </p>
        </div>

        <Section title="Peran Hakgyo dan lembaga">
          <p>
            Setiap kelas di Hakgyo dijalankan oleh sebuah lembaga (organisasi).
            Lembaga menentukan siapa yang terdaftar di kursus dan group belajar
            mereka serta mengelola materi, tugas, dan penilaian. Hakgyo
            menyimpan dan memproses data tersebut untuk menjalankan layanan bagi
            lembaga dan penggunanya. Untuk pertanyaan tentang data Anda di kelas
            tertentu, Anda juga dapat menghubungi lembaga penyelenggaranya.
          </p>
        </Section>

        <Section title="Data yang kami kumpulkan">
          <List>
            <li>
              <strong className="text-foreground">Akun:</strong> nama, alamat
              email, foto profil, dan kata sandi (disimpan dalam bentuk hash,
              bukan teks asli). Jika Anda masuk dengan Google, kami menerima
              nama, email, dan foto profil dari Google.
            </li>
            <li>
              <strong className="text-foreground">
                Keanggotaan dan kelas:
              </strong>{" "}
              peran Anda di lembaga (pemilik, admin, pengajar), kursus dan group
              belajar yang Anda ikuti, serta status pendaftaran.
            </li>
            <li>
              <strong className="text-foreground">Aktivitas belajar:</strong>{" "}
              progres materi, latihan dan penguasaan kosakata, jawaban tugas dan
              tryout, nilai, umpan balik pengajar, poin, dan streak.
            </li>
            <li>
              <strong className="text-foreground">Konten:</strong> materi,
              tugas, kosakata, file, gambar, audio, dan halaman promosi yang
              dibuat atau diunggah pengguna.
            </li>
            <li>
              <strong className="text-foreground">Pembayaran:</strong> jumlah,
              status, dan bukti transfer yang Anda unggah untuk kelas berbayar.
              Pembayaran dilakukan langsung ke rekening atau QRIS lembaga;
              Hakgyo tidak menyimpan data kartu pembayaran.
            </li>
            <li>
              <strong className="text-foreground">Integrasi:</strong> jika
              lembaga menghubungkan Zoom atau Google Calendar, kami menyimpan
              token akses terenkripsi dan data jadwal pertemuan.
            </li>
            <li>
              <strong className="text-foreground">Perangkat:</strong> token
              notifikasi push jika Anda mengizinkan notifikasi, serta data
              teknis yang diperlukan untuk menjaga sesi masuk dan keamanan.
            </li>
          </List>
          <p>
            Kami tidak meminta nomor identitas resmi, data kesehatan, atau data
            kartu pembayaran, dan tidak memakai data Anda untuk iklan atau
            profil perilaku.
          </p>
        </Section>

        <Section title="Cara kami memakai data">
          <List>
            <li>
              Menjalankan layanan: menampilkan kursus, menyimpan progres,
              menilai tugas, dan menyinkronkan aplikasi mobile.
            </li>
            <li>
              Membantu lembaga mengelola kelas: pendaftaran, laporan, pertemuan,
              dan pembayaran.
            </li>
            <li>Mengirim notifikasi yang berkaitan dengan kelas Anda.</li>
            <li>
              Menjalankan fitur AI yang Anda pilih, seperti membuat contoh
              kosakata atau mengimpor soal dari dokumen.
            </li>
            <li>Menjaga keamanan akun dan mencegah penyalahgunaan.</li>
          </List>
        </Section>

        <Section title="Asisten AI (ChatGPT, Claude, dan lainnya)">
          <p>
            Anda dapat menghubungkan akun Hakgyo ke asisten AI melalui server
            MCP Hakgyo. Koneksi hanya dibuat setelah Anda masuk dan menyetujui
            akses di halaman persetujuan Hakgyo. Asisten AI hanya dapat membaca
            dan mengubah data yang memang boleh Anda akses dengan peran Anda
            saat ini, dan setiap permintaan diperiksa ulang.
          </p>
          <p>
            Data yang dikirim ke asisten AI diproses oleh penyedia asisten
            tersebut sesuai kebijakan privasinya. Melalui asisten AI, murid
            tidak dapat mengerjakan atau membaca soal tugas; tugas hanya
            dikerjakan di aplikasi Hakgyo. Anda dapat memutus koneksi kapan saja
            dari pengaturan asisten AI Anda, dan anggota lembaga juga dapat
            mencabutnya dari pengaturan MCP di Hakgyo.
          </p>
        </Section>

        <Section title="Kepada siapa data dibagikan">
          <List>
            <li>
              <strong className="text-foreground">Lembaga Anda:</strong>{" "}
              pemilik, admin, dan pengajar dapat melihat data kelas yang mereka
              kelola, termasuk progres dan jawaban tugas murid.
            </li>
            <li>
              <strong className="text-foreground">Penyedia layanan:</strong>{" "}
              hosting dan database (Neon), penyimpanan file (Cloudflare R2),
              masuk dengan Google, Zoom dan Google Calendar untuk pertemuan,
              OpenAI untuk fitur AI, serta layanan notifikasi push dari
              peramban, Apple, dan Google. Mereka hanya memproses data yang
              diperlukan untuk fungsinya.
            </li>
            <li>
              <strong className="text-foreground">Asisten AI</strong> yang Anda
              hubungkan sendiri, seperti dijelaskan di atas.
            </li>
            <li>Pihak berwenang jika diwajibkan oleh hukum yang berlaku.</li>
          </List>
          <p>Kami tidak menjual data pribadi.</p>
        </Section>

        <Section title="Penyimpanan dan penghapusan">
          <p>
            Data akun dan kelas disimpan selama akun Anda aktif atau selama
            lembaga masih memakai Hakgyo. Anda dapat menghapus akun dari
            pengaturan akun; jika Anda masih menjadi pemilik lembaga, pindahkan
            kepemilikan terlebih dulu. Setelah akun dihapus, data pribadi Anda
            dihapus dari sistem aktif, kecuali catatan yang wajib kami simpan
            secara hukum atau yang diperlukan lembaga untuk catatan pembayaran.
            Token akses asisten AI berumur pendek dan berhenti berlaku saat
            akses dicabut.
          </p>
        </Section>

        <Section title="Hak dan kendali Anda">
          <List>
            <li>Melihat dan memperbarui nama serta foto profil Anda.</li>
            <li>Mematikan notifikasi push di perangkat Anda.</li>
            <li>Memutus koneksi asisten AI yang terhubung.</li>
            <li>Meminta salinan atau penghapusan data pribadi Anda.</li>
          </List>
        </Section>

        <Section title="Anak-anak">
          <p>
            Hakgyo tidak ditujukan untuk anak di bawah 13 tahun, dan kami tidak
            dengan sengaja mengumpulkan data pribadi anak di bawah 13 tahun.
            Jika Anda mengetahui ada akun seperti itu, hubungi kami agar dapat
            kami hapus.
          </p>
        </Section>

        <Section title="Keamanan">
          <p>
            Koneksi ke Hakgyo dienkripsi dengan HTTPS, kata sandi disimpan dalam
            bentuk hash, token Zoom dan Google Calendar disimpan terenkripsi,
            dan akses data dibatasi sesuai peran di setiap lembaga.
          </p>
        </Section>

        <Section title="Perubahan kebijakan">
          <p>
            Jika kebijakan ini berubah, kami memperbarui tanggal di atas dan
            memberi tahu pengguna untuk perubahan yang penting.
          </p>
        </Section>

        <Section title="Hubungi kami">
          <p>
            Untuk pertanyaan atau permintaan terkait privasi, hubungi tim
            Hakgyo.
          </p>
          <div>
            <WhatsAppLink>Hubungi via WhatsApp</WhatsAppLink>
          </div>
        </Section>
      </main>
    </div>
  );
}
