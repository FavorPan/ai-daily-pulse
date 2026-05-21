import Link from "next/link";
import { ProjectCard } from "@/components/ProjectCard";
import { getDaily, isUsingMockData } from "@/lib/api";

const TRENDING_MIN_SCORE = 5;

type PageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { date } = await searchParams;
  const data = await getDaily(date);
  const mock = isUsingMockData(date);
  const trending = data.items.filter((item) => item.score >= TRENDING_MIN_SCORE);

  return (
    <div className="space-y-8">
      {mock && (
        <p className="text-sm text-amber-400/90 bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-2">
          暂无 output 数据，显示示例内容。运行 <code className="text-amber-200">python main.py</code> 或等待 CI 生成 digest JSON。
        </p>
      )}

      <div className="bg-gradient-to-r from-purple-600 to-blue-500 p-6 rounded-2xl">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h1 className="text-2xl font-bold">今日 AI 脉搏</h1>
          <span className="text-sm text-white/80">{data.date}</span>
        </div>
        <ul className="space-y-1 text-sm md:text-base">
          {data.highlights.map((h, i) => (
            <li key={i}>• {h}</li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">精选 ({trending.length})</h2>
          <Link href="/explore" className="text-sm text-purple-400 hover:text-purple-300">
            查看全部 →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trending.map((item) => (
            <ProjectCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
