"use client";
import RulesRegulation from "@/components/rules-&-regulation";
import dynamic from "next/dynamic";

const RulesPage = dynamic(() => import("@/components/rules-&-regulation"), { ssr: false });
// import RulesRegulation from "";

export default function Rules(){
    return <RulesPage/>
}