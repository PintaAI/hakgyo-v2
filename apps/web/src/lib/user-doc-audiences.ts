export const userDocAudiences = [
  {
    id: "pengajar",
    label: "Panduan pengelola & pengajar",
    shortLabel: "Panduan pengelola",
    description:
      "Untuk pemilik, admin, dan pengajar yang menyusun kurikulum dan menjalankan kelas.",
  },
  {
    id: "murid",
    label: "Panduan murid",
    shortLabel: "Panduan murid",
    description:
      "Untuk murid yang belajar lewat situs Hakgyo atau aplikasi di ponsel.",
  },
] as const;

export type UserDocAudience = (typeof userDocAudiences)[number]["id"];

export function isUserDocAudience(value: string): value is UserDocAudience {
  return userDocAudiences.some(({ id }) => id === value);
}

export function userDocHref(audience: UserDocAudience, slug?: string) {
  return slug ? `/docs/${audience}/${slug}` : `/docs/${audience}`;
}
