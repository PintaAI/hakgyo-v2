"use client";
import { useId } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { LandingImageUpload } from "~/components/landing-image-upload";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import type { OrganizationLandingConfig } from "~/lib/organization-landing";
import type { RouterOutputs } from "~/trpc/react";
export type EditorSection =
  | "hero"
  | "courses"
  | "about"
  | "features"
  | "testimonials"
  | "faq"
  | "contact"
  | "seo";
export function LandingField({
  label,
  value,
  onChange,
  multiline = false,
  maxLength = 500,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
  hint?: string;
}) {
  const id = useId();
  const props = {
    id,
    value,
    maxLength,
    placeholder,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(event.target.value),
  };
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? <Textarea {...props} rows={4} /> : <Input {...props} />}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

export function LandingContentControls({
  section,
  config,
  update,
  initial,
}: {
  section: EditorSection;
  config: OrganizationLandingConfig;
  update: <K extends keyof OrganizationLandingConfig>(
    key: K,
    value: OrganizationLandingConfig[K],
  ) => void;
  initial: RouterOutputs["organizationLanding"]["get"];
}) {
  const path = `/${initial.organization.slug}`;
  switch (section) {
    case "hero":
      return (
        <div className="grid gap-5">
          <LandingField
            label="Label pembuka"
            value={config.eyebrow}
            onChange={(v) => update("eyebrow", v)}
            maxLength={80}
          />
          <LandingField
            label="Judul utama"
            value={config.headline}
            onChange={(v) => update("headline", v)}
            maxLength={160}
          />
          <LandingField
            label="Deskripsi"
            value={config.description}
            onChange={(v) => update("description", v)}
            multiline
            maxLength={1000}
          />
          <LandingImageUpload
            organizationId={initial.organization.id}
            purpose="hero"
            label="Gambar hero"
            value={config.heroImageUrl}
            onChange={(value) => update("heroImageUrl", value)}
            helpText="JPEG, PNG, atau WebP hingga 10 MB. Disimpan di R2. Kosongkan untuk memakai foto course atau komposisi tipografi."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <LandingField
              label="Teks tombol utama"
              value={config.ctaLabel}
              onChange={(v) => update("ctaLabel", v)}
              maxLength={60}
            />
            <LandingField
              label="Tujuan tombol"
              value={config.ctaUrl}
              onChange={(v) => update("ctaUrl", v)}
              maxLength={2048}
              placeholder="#courses"
              hint="Contoh: #courses atau https://wa.me/…"
            />
          </div>
        </div>
      );
    case "courses":
      return (
        <div className="grid gap-5">
          <LandingField
            label="Judul bagian"
            value={config.coursesTitle}
            onChange={(v) => update("coursesTitle", v)}
            maxLength={160}
          />
          <LandingField
            label="Deskripsi bagian"
            value={config.coursesDescription}
            onChange={(v) => update("coursesDescription", v)}
            multiline
            maxLength={1000}
          />
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={config.selectedCourseIds.length === 0}
              onChange={(event) => {
                if (event.target.checked) update("selectedCourseIds", []);
                else if (initial.courses[0])
                  update("selectedCourseIds", [initial.courses[0].id]);
              }}
            />
            Tampilkan semua course publik (termasuk course baru)
          </label>
          {initial.courses.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Belum ada course publik. Publikasikan course dengan pendaftaran
              terbuka terlebih dahulu.
            </p>
          ) : (
            <div className="grid gap-2">
              {initial.courses.map((course) => (
                <label
                  key={course.id}
                  className="flex items-center gap-3 rounded-xl border p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={
                      config.selectedCourseIds.length === 0 ||
                      config.selectedCourseIds.includes(course.id)
                    }
                    onChange={(event) => {
                      const selected = config.selectedCourseIds.length
                        ? config.selectedCourseIds
                        : initial.courses.map((item) => item.id);
                      const next = event.target.checked
                        ? [...selected, course.id]
                        : selected.filter((id) => id !== course.id);
                      if (next.length === 0) {
                        toast.info(
                          "Untuk menyembunyikan semua course, nonaktifkan bagian Course.",
                        );
                        return;
                      }
                      update("selectedCourseIds", [...new Set(next)]);
                    }}
                  />
                  {course.title}
                </label>
              ))}
            </div>
          )}
          {config.selectedCourseIds.some(
            (id) => !initial.courses.some((course) => course.id === id),
          ) && (
            <Button
              variant="outline"
              onClick={() =>
                update(
                  "selectedCourseIds",
                  config.selectedCourseIds.filter((id) =>
                    initial.courses.some((course) => course.id === id),
                  ),
                )
              }
            >
              Hapus pilihan course yang tidak lagi publik
            </Button>
          )}
          {config.selectedCourseIds.length > 0 && (
            <p className="text-muted-foreground text-xs">
              {config.selectedCourseIds.length} course dipilih. Course yang
              menjadi private atau draft otomatis disembunyikan.
            </p>
          )}
        </div>
      );
    case "about":
      return (
        <div className="grid gap-5">
          <LandingField
            label="Judul bagian"
            value={config.aboutTitle}
            onChange={(v) => update("aboutTitle", v)}
            maxLength={160}
          />
          <LandingField
            label="Cerita organisasi"
            value={config.aboutDescription}
            onChange={(v) => update("aboutDescription", v)}
            multiline
            maxLength={5000}
          />
        </div>
      );
    case "features":
      return (
        <div className="grid gap-5">
          <LandingField
            label="Judul bagian"
            value={config.featuresTitle}
            onChange={(v) => update("featuresTitle", v)}
            maxLength={160}
          />
          {config.features.map((feature, index) => (
            <div key={index} className="grid gap-4 rounded-xl border p-4">
              <LandingField
                label={`Keunggulan ${index + 1}`}
                value={feature.title}
                onChange={(v) =>
                  update(
                    "features",
                    config.features.map((item, i) =>
                      i === index ? { ...item, title: v } : item,
                    ),
                  )
                }
                maxLength={120}
              />
              <LandingField
                label="Penjelasan"
                value={feature.description}
                onChange={(v) =>
                  update(
                    "features",
                    config.features.map((item, i) =>
                      i === index ? { ...item, description: v } : item,
                    ),
                  )
                }
                multiline
                maxLength={600}
              />
              <Button
                variant="ghost"
                className="justify-self-end"
                onClick={() =>
                  update(
                    "features",
                    config.features.filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2Icon />
                Hapus
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            disabled={config.features.length >= 12}
            onClick={() =>
              update("features", [
                ...config.features,
                { title: "", description: "" },
              ])
            }
          >
            <PlusIcon />
            Tambah keunggulan
          </Button>
        </div>
      );
    case "testimonials":
      return (
        <div className="grid gap-5">
          <LandingField
            label="Judul bagian"
            value={config.testimonialsTitle}
            onChange={(v) => update("testimonialsTitle", v)}
            maxLength={160}
          />
          {config.testimonials.map((item, index) => (
            <div key={index} className="grid gap-4 rounded-xl border p-4">
              <LandingField
                label={`Testimoni ${index + 1}`}
                value={item.quote}
                onChange={(v) =>
                  update(
                    "testimonials",
                    config.testimonials.map((row, i) =>
                      i === index ? { ...row, quote: v } : row,
                    ),
                  )
                }
                multiline
                maxLength={1000}
              />
              <LandingField
                label="Nama peserta"
                value={item.name}
                onChange={(v) =>
                  update(
                    "testimonials",
                    config.testimonials.map((row, i) =>
                      i === index ? { ...row, name: v } : row,
                    ),
                  )
                }
                maxLength={100}
              />
              <LandingField
                label="Keterangan peserta"
                value={item.role}
                onChange={(v) =>
                  update(
                    "testimonials",
                    config.testimonials.map((row, i) =>
                      i === index ? { ...row, role: v } : row,
                    ),
                  )
                }
                maxLength={120}
              />
              <Button
                variant="ghost"
                className="justify-self-end"
                onClick={() =>
                  update(
                    "testimonials",
                    config.testimonials.filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2Icon />
                Hapus
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            disabled={config.testimonials.length >= 12}
            onClick={() =>
              update("testimonials", [
                ...config.testimonials,
                { quote: "", name: "", role: "" },
              ])
            }
          >
            <PlusIcon />
            Tambah testimoni
          </Button>
        </div>
      );
    case "faq":
      return (
        <div className="grid gap-5">
          <LandingField
            label="Judul bagian"
            value={config.faqTitle}
            onChange={(v) => update("faqTitle", v)}
            maxLength={160}
          />
          {config.faq.map((item, index) => (
            <div key={index} className="grid gap-4 rounded-xl border p-4">
              <LandingField
                label={`Pertanyaan ${index + 1}`}
                value={item.question}
                onChange={(v) =>
                  update(
                    "faq",
                    config.faq.map((row, i) =>
                      i === index ? { ...row, question: v } : row,
                    ),
                  )
                }
                maxLength={200}
              />
              <LandingField
                label="Jawaban"
                value={item.answer}
                onChange={(v) =>
                  update(
                    "faq",
                    config.faq.map((row, i) =>
                      i === index ? { ...row, answer: v } : row,
                    ),
                  )
                }
                multiline
                maxLength={2000}
              />
              <Button
                variant="ghost"
                className="justify-self-end"
                onClick={() =>
                  update(
                    "faq",
                    config.faq.filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2Icon />
                Hapus
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            disabled={config.faq.length >= 20}
            onClick={() =>
              update("faq", [...config.faq, { question: "", answer: "" }])
            }
          >
            <PlusIcon />
            Tambah pertanyaan
          </Button>
        </div>
      );
    case "contact":
      return (
        <div className="grid gap-5">
          <LandingField
            label="Judul ajakan"
            value={config.contactTitle}
            onChange={(v) => update("contactTitle", v)}
            maxLength={160}
          />
          <LandingField
            label="Pesan penutup"
            value={config.contactDescription}
            onChange={(v) => update("contactDescription", v)}
            multiline
            maxLength={1000}
          />
          <LandingField
            label="Email publik"
            value={config.contactEmail}
            onChange={(v) => update("contactEmail", v)}
            maxLength={254}
          />
          <LandingField
            label="URL kontak / WhatsApp"
            value={config.contactUrl}
            onChange={(v) => update("contactUrl", v)}
            maxLength={2048}
            placeholder="https://wa.me/…"
          />
        </div>
      );
    case "seo":
      return (
        <div className="grid gap-5">
          <LandingField
            label="Judul SEO"
            value={config.seoTitle}
            onChange={(v) => update("seoTitle", v)}
            maxLength={70}
            hint="Kosongkan untuk menggunakan nama organisasi dan judul utama."
          />
          <LandingField
            label="Deskripsi SEO"
            value={config.seoDescription}
            onChange={(v) => update("seoDescription", v)}
            multiline
            maxLength={170}
          />
          <LandingImageUpload
            organizationId={initial.organization.id}
            purpose="social"
            label="Gambar saat dibagikan"
            value={config.socialImageUrl}
            onChange={(value) => update("socialImageUrl", value)}
            helpText="Rekomendasi 1200 × 630 piksel. Kosongkan untuk memakai gambar hero atau logo organisasi."
          />
          <div className="bg-muted/40 rounded-xl border p-4">
            <p className="text-muted-foreground truncate text-xs">{path}</p>
            <p className="text-primary mt-1 text-lg">
              {config.seoTitle ||
                `${initial.organization.name} — ${config.headline}`}
            </p>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {config.seoDescription || config.description}
            </p>
          </div>
        </div>
      );
  }
}
