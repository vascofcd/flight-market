export const Banner = ({
  tone,
  title,
  children,
}: {
  tone: "error" | "warn" | "info" | "success";
  title: string;
  children?: React.ReactNode;
}) => {
  const styles =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className={`rounded-xl border p-4 text-sm ${styles}`}>
      <div className="font-semibold break-words">{title}</div>
      {children ? (
        <div className="mt-1 opacity-90 break-words">{children}</div>
      ) : null}
    </div>
  );
};
