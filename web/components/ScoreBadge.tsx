type Props = {
  score: number;
  size?: "sm" | "lg";
};

export function ScoreBadge({ score, size = "sm" }: Props) {
  const isLg = size === "lg";
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-semibold ${
        isLg ? "text-lg" : "text-xs"
      }`}
      style={{ color: "var(--accent)" }}
    >
      <span className={isLg ? "text-base" : "text-[10px]"}>&#9733;</span>
      {score}
    </span>
  );
}
