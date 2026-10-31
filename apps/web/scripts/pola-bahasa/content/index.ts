// Every chapter file, by key. Type-checking this file checks that every chapter of ./manifest.ts has its file.
// The importer loads the files one by one (../load-content.ts) so a broken file is reported by name.
import type { BabContent } from "../blocks";
import type { PolaBabKey } from "../manifest";

import ki01KataSambung from "./ki-01-kata-sambung";
import ki02PenyambungDasar from "./ki-02-penyambung-dasar";
import ki03WaktuSebab from "./ki-03-waktu-sebab";
import ki04BisaHarus from "./ki-04-bisa-harus";
import ki05MintaAjak from "./ki-05-minta-ajak";
import ki06AkhiranRasa from "./ki-06-akhiran-rasa";
import ki07Keadaan from "./ki-07-keadaan";
import ki08Andai from "./ki-08-andai";
import ki09KataWaktu from "./ki-09-kata-waktu";
import ki10KataReaksi from "./ki-10-kata-reaksi";
import ki11Banmal from "./ki-11-banmal";
import ik01Padahal from "./ik-01-padahal";
import ik02Partikel from "./ik-02-partikel";
import ik03Alasan from "./ik-03-alasan";
import ik04Bandingin from "./ik-04-bandingin";
import ik05Nebak from "./ik-05-nebak";
import ik06Waktu from "./ik-06-waktu";
import ik07NggakSengaja from "./ik-07-nggak-sengaja";
import ik08Nyesel from "./ik-08-nyesel";

export const POLA_CONTENT = {
  "ki-01-kata-sambung": ki01KataSambung,
  "ki-02-penyambung-dasar": ki02PenyambungDasar,
  "ki-03-waktu-sebab": ki03WaktuSebab,
  "ki-04-bisa-harus": ki04BisaHarus,
  "ki-05-minta-ajak": ki05MintaAjak,
  "ki-06-akhiran-rasa": ki06AkhiranRasa,
  "ki-07-keadaan": ki07Keadaan,
  "ki-08-andai": ki08Andai,
  "ki-09-kata-waktu": ki09KataWaktu,
  "ki-10-kata-reaksi": ki10KataReaksi,
  "ki-11-banmal": ki11Banmal,
  "ik-01-padahal": ik01Padahal,
  "ik-02-partikel": ik02Partikel,
  "ik-03-alasan": ik03Alasan,
  "ik-04-bandingin": ik04Bandingin,
  "ik-05-nebak": ik05Nebak,
  "ik-06-waktu": ik06Waktu,
  "ik-07-nggak-sengaja": ik07NggakSengaja,
  "ik-08-nyesel": ik08Nyesel,
} satisfies { [K in PolaBabKey]: BabContent<K> };
