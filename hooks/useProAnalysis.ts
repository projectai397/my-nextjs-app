"use client";
import useSWR from "swr";
import type { AnalysisDoc } from "@/types/proAnalysis";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useProAnalysis() {
  const { data, error, isLoading, mutate } = useSWR<AnalysisDoc[]>("/api/analysis", fetcher, {
    revalidateOnFocus: false,
  });
  return { data: data ?? [], error, isLoading, refresh: mutate };
}
