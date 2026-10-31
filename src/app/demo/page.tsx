import type { Metadata } from "next";
import { DemoWorkspace } from "./workspace";

export const metadata: Metadata = { title: "Test lab" };
export default function DemoPage() {
  return <DemoWorkspace />;
}
