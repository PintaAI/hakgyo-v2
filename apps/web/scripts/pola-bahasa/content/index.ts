// Every material of the Pola Bahasa curricula, by key. One file per material in ../manifest.ts order, each
// default-exporting defineMaterial({...}). The record type makes tsc reject a missing material or a file whose key
// does not match; ../validate.ts loads the files one by one and reports what is missing or broken.
import type { MaterialContent } from "../blocks";
import type { PolaMaterialKey } from "../manifest";

import kiKataSambung from "./ki-kata-sambung";
import kiAlasanUrutan from "./ki-alasan-urutan";
import kiWaktuSebab from "./ki-waktu-sebab";
import kiBisaHarus from "./ki-bisa-harus";
import kiMintaAjak from "./ki-minta-ajak";
import kiAkhiranRasa from "./ki-akhiran-rasa";
import kiKeadaan from "./ki-keadaan";
import kiAndai from "./ki-andai";
import kiKataKecil from "./ki-kata-kecil";
import kiBanmal from "./ki-banmal";
import ikPadahal from "./ik-padahal";
import ikPartikel from "./ik-partikel";
import ikAlasan from "./ik-alasan";
import ikDugaan from "./ik-dugaan";
import ikWaktu from "./ik-waktu";
import ikNggakSengaja from "./ik-nggak-sengaja";
import ikAndai from "./ik-andai";

export type PolaContent = { [K in PolaMaterialKey]: MaterialContent<K> };

export const POLA_CONTENT: PolaContent = {
  "ki-kata-sambung": kiKataSambung,
  "ki-alasan-urutan": kiAlasanUrutan,
  "ki-waktu-sebab": kiWaktuSebab,
  "ki-bisa-harus": kiBisaHarus,
  "ki-minta-ajak": kiMintaAjak,
  "ki-akhiran-rasa": kiAkhiranRasa,
  "ki-keadaan": kiKeadaan,
  "ki-andai": kiAndai,
  "ki-kata-kecil": kiKataKecil,
  "ki-banmal": kiBanmal,
  "ik-padahal": ikPadahal,
  "ik-partikel": ikPartikel,
  "ik-alasan": ikAlasan,
  "ik-dugaan": ikDugaan,
  "ik-waktu": ikWaktu,
  "ik-nggak-sengaja": ikNggakSengaja,
  "ik-andai": ikAndai,
};

export default POLA_CONTENT;
