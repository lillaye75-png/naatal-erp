"use client";

import { useState, useMemo } from "react";
import { useCollection } from "@/hooks/use-firestore";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsPage() {
  const { data: sales, loading } = useCollection("sales");
  const [tab, setTab] = useState<"ventes" | "top" | "tendances">("ventes");

  const totalRevenue = useMemo(() => sales.reduce((sum, s) => sum + (s.total || 0), 0), [sales]);
  const totalSales = sales.length;

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    sales.forEach((sale) => {
      sale.items?.forEach((item: Record<string, unknown>) => {
        const existing = map.get(item.productId as string) || { name: item.name as string, quantity: 0, revenue: 0 };
        existing.quantity += (item.quantity as number);
        existing.revenue += (item.total as number) || (item.price as number) * (item.quantity as number);
        map.set(item.productId as string, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }, [sales]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Rapports</h1>
        <p className="text-sm text-neutral-500 mt-1">Analysez vos performances</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><p className="text-xs font-medium text-neutral-500">Revenu total</p><p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{totalRevenue.toLocaleString()} F</p></Card>
        <Card><p className="text-xs font-medium text-neutral-500">Ventes</p><p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{totalSales}</p></Card>
        <Card><p className="text-xs font-medium text-neutral-500">Panier moyen</p><p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{totalSales > 0 ? Math.round(totalRevenue / totalSales).toLocaleString() : "0"} F</p></Card>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {(["ventes", "top", "tendances"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-teranga-500 text-teranga-500" : "border-transparent text-neutral-500 hover:text-[var(--text-primary)]"}`}>
            {t === "ventes" ? "Ventes" : t === "top" ? "Top Produits" : "Tendances"}
          </button>
        ))}
      </div>

      {tab === "ventes" && (
        <Card>
          {loading ? (
            <div className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
          ) : sales.length === 0 ? (
            <EmptyState icon={<BarChart3 />} title="Pas encore de données" description="Les rapports apparaîtront après vos premières ventes" />
          ) : (
            <div className="space-y-2">
              {sales.slice(0, 20).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <span className="text-sm text-[var(--text-primary)]">{sale.items?.[0]?.name || "Vente"}</span>
                  <span className="text-sm font-medium">{sale.total?.toLocaleString()} F</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "top" && (
        <Card>
          {topProducts.length === 0 ? (
            <EmptyState icon={<BarChart3 />} title="Aucune donnée" />
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-3"><span className="text-xs font-bold text-neutral-400 w-5">#{i + 1}</span><span className="text-sm text-[var(--text-primary)]">{p.name}</span></div>
                  <div className="text-right"><span className="text-sm font-medium">{p.quantity} vendus</span><span className="text-xs text-neutral-500 ml-2">{p.revenue.toLocaleString()} F</span></div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "tendances" && (
        <Card>
          <EmptyState icon={<BarChart3 />} title="Tendances" description="Graphique des tendances à venir avec Recharts" />
        </Card>
      )}
    </div>
  );
}