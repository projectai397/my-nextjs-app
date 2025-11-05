"use client";
import dynamic from "next/dynamic";

const DashboardContent = dynamic(
  () => import("@/components/sidebar/dashboard-content"),
  { ssr: false }
);

// import { DashboardContent } from '@/components/sidebar/dashboard-content';

export default function AdminPage() {
  return <DashboardContent currentPage={""} />;
}
