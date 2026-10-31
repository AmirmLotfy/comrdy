import type { Metadata } from "next";
import { ComparisonView } from "./comparison-view";

export const metadata: Metadata = { title: "Compare runs" };
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ left?: string; right?: string }>;
}) {
  const { left, right } = await searchParams;
  return <ComparisonView initialLeft={left} initialRight={right} />;
}
