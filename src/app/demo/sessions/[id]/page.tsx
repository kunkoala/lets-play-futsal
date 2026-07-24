import { notFound } from "next/navigation";
import { getDemoSession } from "@/lib/demoData";
import { SessionDetailView } from "@/components/views/SessionDetailView";

export default async function DemoSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const session = getDemoSession(Number(idParam));
  if (!session) notFound();

  return <SessionDetailView session={session} basePath="/demo" />;
}
