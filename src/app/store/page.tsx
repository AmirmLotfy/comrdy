import type { Metadata } from "next";
import { DemoStore } from "./storefront";

export const metadata: Metadata = {
  title: "Northpath Supply — Test store",
  description:
    "Explore the fictional Northpath collection. Choose an Ocean Shell size and review a controlled merchant checkout in the COMRDY test lab.",
};
export default function StorePage() {
  return <DemoStore />;
}
