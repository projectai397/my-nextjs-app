// app/admin/account-setting/page.tsx
"use client";

import dynamic from "next/dynamic";

// load the profile screen only on the client
const ProfilePage = dynamic(
  () => import("@/components/profile").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#0e0e10] text-gray-100 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading account settings...</p>
      </div>
    ),
  }
);

export default function AccountSettingPage() {
  return <ProfilePage />;
}
