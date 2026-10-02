"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

export function LearnerBreadcrumb() {
  const pathname = usePathname();
  const currentLabel = pathname.startsWith("/learn/payments")
    ? "Pembayaran"
    : pathname.startsWith("/learn/checkout")
      ? "Checkout"
      : pathname.includes("/attempts/")
        ? "Tugas"
        : pathname.startsWith("/learn/assessments") ||
            pathname.startsWith("/learn/practice")
          ? "Latihan"
          : pathname.startsWith("/learn/vocabulary")
            ? "Kosakata"
            : pathname.includes("/items/")
              ? "Aktivitas"
              : pathname === "/learn"
                ? "Hari ini"
                : pathname === "/learn/courses"
                  ? "Belajar"
                  : "Course";

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:inline-flex">
          <BreadcrumbLink render={<Link href="/learn" />}>
            Ruang belajar
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
