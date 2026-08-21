"use client";

import { useRouter } from "next/navigation";
import { ArrowRightIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

export function CatalogEnrollmentButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const enroll = api.enrollment.enrollOpenCourse.useMutation({
    onSuccess: () => router.push(`/learn/${courseId}`),
    onError: (error) => {
      toast.error(
        error.data?.code === "CONFLICT"
          ? "Pendaftaran course sedang diproses. Coba lagi."
          : error.message || "Course belum dapat diikuti.",
      );
    },
  });

  return (
    <Button
      className="w-full sm:w-auto"
      size="lg"
      disabled={enroll.isPending}
      onClick={() => enroll.mutate({ courseId })}
    >
      {enroll.isPending ? (
        <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
      ) : (
        <ArrowRightIcon aria-hidden="true" />
      )}
      {enroll.isPending ? "Mendaftarkan..." : "Mulai belajar"}
    </Button>
  );
}
