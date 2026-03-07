"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../features/firebase";

interface SettlementDoc {
  firestoreId: string;
  settlementId: string;
  statusCode: number;
  rawJsonString: string;
  txHash: string;
  createdAt: number;
  delayed: boolean;
  flightId: string;
}

const ITEMS_LIMIT = 10;

const truncateHash = (hash: string) => {
  if (
    hash ===
    "0x0000000000000000000000000000000000000000000000000000000000000000"
  ) {
    return "0x00000... (simulated)";
  }

  if (!hash || hash.length < 18) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
};

const formatDateTime = (value: number) => {
  return new Date(value).toLocaleString();
};

const statusCodeClass = (statusCode: number) => {
  if (statusCode >= 200 && statusCode < 300) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (statusCode >= 400) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

const delayedClass = (delayed: boolean) => {
  return delayed
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";
};

export const DataDetails = () => {
  const [docs, setDocs] = useState<SettlementDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const q = query(
          collection(db, "demo"),
          orderBy("createdAt", "desc"),
          limit(ITEMS_LIMIT),
        );

        const querySnapshot = await getDocs(q);

        const docsData = querySnapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            firestoreId: doc.id,
            settlementId: String(data.id ?? doc.id),
            statusCode: Number(data.statusCode ?? 0),
            rawJsonString: String(data.rawJsonString ?? ""),
            txHash: String(data.txHash ?? ""),
            createdAt: Number(data.createdAt ?? 0),
            delayed: Boolean(data.delayed),
            flightId: String(data.flightId ?? "-"),
          } satisfies SettlementDoc;
        });

        setDocs(docsData);
      } catch (err) {
        console.error(err);

        if (err instanceof Error) {
          setError(
            `Failed to fetch data: ${err.message}. Ensure your Firebase configuration and security rules are set up correctly.`,
          );
        } else {
          setError("An unknown error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, []);

  const delayedCount = useMemo(
    () => docs.filter((doc) => doc.delayed).length,
    [docs],
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-600">
                Settlement Feed
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Recent Market Settlements
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Latest settlement records fetched from Firestore, including
                flight ID, delay result, response code, transaction hash, and
                raw evidence JSON.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Loaded
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {loading ? "..." : docs.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Delayed
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {loading ? "..." : delayedCount}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Limit
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {ITEMS_LIMIT}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="animate-pulse">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                  <div className="h-4 w-48 rounded bg-slate-200" />
                </div>

                <div className="space-y-3 px-6 py-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-12 rounded-lg bg-slate-100" />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
              {error}
            </div>
          ) : null}

          {!loading && !error && docs.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                No settlement records found
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Once your workflow writes settlement data to Firestore, it will
                appear here.
              </p>
            </div>
          ) : null}

          {!loading && !error && docs.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Settlement Records
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Showing the latest {docs.length} entries from Firestore.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Flight
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Settlement ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Created At
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Delayed
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Tx Hash
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Evidence
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white">
                    {docs.map((doc) => (
                      <tr
                        key={doc.firestoreId}
                        className="align-top transition hover:bg-slate-50/80"
                      >
                        <td className="whitespace-nowrap px-4 py-4 text-sm">
                          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-800">
                            {doc.flightId}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          <span className="font-mono text-xs break-all">
                            {doc.settlementId}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                          {formatDateTime(doc.createdAt)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${delayedClass(
                              doc.delayed,
                            )}`}
                          >
                            {doc.delayed ? "Delayed" : "On time"}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusCodeClass(
                              doc.statusCode,
                            )}`}
                          >
                            HTTP {doc.statusCode}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          <span className="font-mono text-xs">
                            {truncateHash(doc.txHash)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          <details className="group min-w-[260px]">
                            <summary className="cursor-pointer list-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100">
                              View JSON
                            </summary>

                            <div className="mt-2 max-w-[420px] overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-3">
                              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-100">
                                {doc.rawJsonString}
                              </pre>
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
};
