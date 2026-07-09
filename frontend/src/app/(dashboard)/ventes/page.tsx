"use client";

import { useState } from "react";
import { useCollection } from "@/hooks/use-firestore";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Receipt, Search } from "lucide-react";

export default function SalesPage() {
  const { data: sales, loading } = useCollection("sales");
  const [search, setSearch] = useState("");

  const filtered = sales.filter((s) =>
    s.items?.some((item: Record<string, unknown>) => (item.name as string)?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Ventes</h1>
        <p className="text-sm text-neutral-500 mt-1">{sales.length} ventes</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input type="search" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 pl-9 pr-3 text-sm rounded border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-neutral-400 focus:outline-none focus:border-teranga-500" />
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-6"><SkeletonTable /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Receipt />} title="Aucune vente" description="Les ventes apparaîtront ici" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Articles</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Paiement</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale) => (
                  <tr key={sale.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-card)] transition-colors">
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                      {sale.items?.slice(0, 2).map((i: Record<string, unknown>) => i.name as string).join(", ")}
                      {sale.items?.length > 2 && ` +${sale.items.length - 2}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-[var(--text-primary)]">{sale.total?.toLocaleString()} F</td>
                    <td className="px-4 py-3 text-center"><Badge>{sale.paymentMethod}</Badge></td>
                    <td className="px-4 py-3 text-sm text-right text-neutral-500">{sale.createdAt?.toDate?.()?.toLocaleDateString?.() || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}