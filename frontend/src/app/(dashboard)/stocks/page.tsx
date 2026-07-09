"use client";

import { useCollection } from "@/hooks/use-firestore";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Warehouse } from "lucide-react";

export default function StockPage() {
  const { data: products, loading } = useCollection("products");

  const lowStock = products.filter((p) => p.stock <= 5 && p.stock > 0);
  const outOfStock = products.filter((p) => p.stock <= 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Stocks</h1>
        <p className="text-sm text-neutral-500 mt-1">{products.length} produits</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Stock faible ({lowStock.length})</CardTitle></CardHeader>
          {lowStock.length === 0 ? (
            <p className="text-sm text-neutral-400 py-4 text-center">Aucun produit en stock faible</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-1">
                  <span className="text-sm text-[var(--text-primary)]">{p.name}</span>
                  <Badge variant="warning">{p.stock} unités</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>Rupture de stock ({outOfStock.length})</CardTitle></CardHeader>
          {outOfStock.length === 0 ? (
            <p className="text-sm text-neutral-400 py-4 text-center">Aucune rupture de stock</p>
          ) : (
            <div className="space-y-2">
              {outOfStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-1">
                  <span className="text-sm text-[var(--text-primary)]">{p.name}</span>
                  <Badge variant="error">Rupture</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-4 pt-4"><CardTitle>Tous les stocks</CardTitle></CardHeader>
        {loading ? (
          <div className="p-6"><SkeletonTable /></div>
        ) : products.length === 0 ? (
          <EmptyState icon={<Warehouse />} title="Aucun produit" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Produit</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Prix</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-card)]">
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{p.name}</td>
                    <td className={`px-4 py-3 text-sm text-right ${p.stock <= 0 ? "text-error font-medium" : "text-[var(--text-primary)]"}`}>{p.stock}</td>
                    <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)]">{p.sellingPrice?.toLocaleString()} F</td>
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