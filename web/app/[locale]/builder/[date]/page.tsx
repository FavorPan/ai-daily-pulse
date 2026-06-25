import { redirect } from "next/navigation";

export function generateStaticParams() {
  // Return a minimal set — we redirect all builder dates to /insight anyway
  return [{ date: "2026-01-01" }];
}

export default async function BuilderDateRedirect({
  params,
}: {
  params: Promise<{ locale: string; date: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/insight`);
}
