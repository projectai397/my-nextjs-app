"use client"

import dynamic from "next/dynamic";

const MarketTiming = dynamic(() => import("@/components/view/marketTiming"), { ssr: false });
// import MarketTiming from "";

export default function MarketTimePage() {
  return <MarketTiming />;
}
