"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function BuilderRedirect() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";

  useEffect(() => {
    router.replace(`/${locale}/insight`);
  }, [router, locale]);

  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm text-muted">Redirecting to Insight...</p>
    </div>
  );
}
