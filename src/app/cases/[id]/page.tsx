import type { Metadata } from "next";
import { CaseView } from "./case-view";

export const metadata: Metadata = { title: "Transaction evidence" };
export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CaseView id={id} />;
}
