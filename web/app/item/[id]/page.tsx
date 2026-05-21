import Link from "next/link";
import { notFound } from "next/navigation";
import { SummaryBlock } from "@/components/SummaryBlock";
import { getItem } from "@/lib/api";

type PageProps = {
  params: { id: string };
  searchParams?: { date?: string };
};

export default async function ItemPage({ params, searchParams }: PageProps) {
  const item = await getItem(params.id, searchParams?.date);
  if (!item) notFound();

  const backQs = searchParams?.date ? `?date=${searchParams.date}` : "";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href={`/explore${backQs}`}
        className="text-sm text-gray-400 hover:text-white"
      >
        ← 返回探索
      </Link>
      <h1 className="text-2xl font-bold leading-snug">{item.title}</h1>
      <SummaryBlock item={item} />
    </div>
  );
}
