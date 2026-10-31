import type { Metadata } from "next";
import { DemoStore } from "./storefront";

export const metadata: Metadata = { title: "Northpath Supply — Demo store" };
export default function StorePage() {
  return <DemoStore />;
}
