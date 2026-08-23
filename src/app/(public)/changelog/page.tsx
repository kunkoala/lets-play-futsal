import type { Metadata } from "next";
import { ChangelogView } from "@/components/views/ChangelogView";

export const metadata: Metadata = {
  title: "What's new",
  description: "Recent changes to Liga Minggu, and what they mean for your stats.",
};

export default function ChangelogPage() {
  return <ChangelogView />;
}
