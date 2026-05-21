import { Suspense } from "react";
import { ExploreClient } from "@/components/ExploreClient";
import { getItems, isUsingMockData } from "@/lib/api";

type PageProps = {
  searchParams?: { date?: string };
};

export default async function ExplorePage({ searchParams }: PageProps) {
  const date = searchParams?.date;
  const items = await getItems(date);
  const mock = isUsingMockData(date);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">探索</h1>
        <p className="text-gray-400 text-sm mt-1">按主题筛选，或使用顶部搜索</p>
      </div>
      {mock && (
        <p className="text-sm text-amber-400/90">当前为示例数据</p>
      )}
      <Suspense fallback={<p className="text-gray-500">加载中...</p>}>
        <ExploreClient items={items} />
      </Suspense>
    </div>
  );
}
