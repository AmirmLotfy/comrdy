import type { Metadata } from "next";
import { CaseView } from "./case-view";

export const metadata: Metadata = { title: "Transaction evidence" };
export default async function CasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ playback?: string }>;
}) {
  const { id } = await params;
  const { playback } = await searchParams;
  return <CaseView id={id} readOnly={playback === "1"} />;
}
