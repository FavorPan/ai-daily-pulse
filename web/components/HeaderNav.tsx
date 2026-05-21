import Link from "next/link";

export function HeaderNav() {
  return (
    <nav className="flex items-center gap-6 text-sm text-gray-400">
      <Link href="/" className="hover:text-white">
        首页
      </Link>
      <Link href="/explore" className="hover:text-white">
        探索
      </Link>
    </nav>
  );
}
