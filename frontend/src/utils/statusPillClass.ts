export const statusPillClass = (status: string) => {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";
  const s = status.toLowerCase();

  if (s.includes("open") || s.includes("trading"))
    return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200`;
  if (s.includes("closed") || s.includes("await") || s.includes("request"))
    return `${base} bg-amber-50 text-amber-800 ring-amber-200`;
  if (s.includes("resolved") || s.includes("settled"))
    return `${base} bg-slate-100 text-slate-800 ring-slate-200`;

  return `${base} bg-slate-50 text-slate-700 ring-slate-200`;
};
