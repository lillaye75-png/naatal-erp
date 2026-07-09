"use client";

import { useState } from "react";
import { useCollection, useFirestoreMutations } from "@/hooks/use-firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { Package, Plus, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductsPage() {
  const { data: products, loading } = useCollection("products");
  const { add } = useFirestoreMutations();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    sellingPrice: 0,
    stock: 0,
    description: "",
  });

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await add("products", formData);
      setShowAdd(false);
      setFormData({ name: "", sku: "", sellingPrice: 0, stock: 0, description: "" });
      toast("success", "Produit ajouté!");
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Produits</h1>
          <p className="text-sm text-neutral-500 mt-1">{products.length} produits</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="search"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-3 text-sm rounded border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-neutral-400 focus:outline-none focus:border-teranga-500"
          aria-label="Rechercher un produit"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonTable />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title={search ? "Aucun résultat" : "Aucun produit"}
            description={search ? `Aucun produit pour "${search}"` : "Commencez par ajouter votre premier produit"}
            action={
              !search ? <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Ajouter un produit</Button> : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" role="table" aria-label="Liste des produits">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Produit</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">SKU</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Prix</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Stock</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-neutral-500 font-mono">{product.sku}</td>
                    <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)]">{product.sellingPrice?.toLocaleString()} F</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={product.stock <= 0 ? "text-error font-medium" : "text-[var(--text-primary)]"}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={product.stock > 0 ? "success" : "error"}>
                        {product.stock > 0 ? "En stock" : "Rupture"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setShowAdd(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-lg rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Ajouter un produit</h2>
                  <button onClick={() => setShowAdd(false)} className="text-neutral-400 hover:text-neutral-600" aria-label="Fermer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleAdd} className="space-y-4">
                  <Input label="Nom du produit" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="iPhone 15" />
                  <Input label="SKU" required value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder="APH-001" />
                  <Input label="Prix de vente (F CFA)" type="number" value={formData.sellingPrice || ""} onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })} />
                  <Input label="Stock initial" type="number" value={formData.stock || ""} onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })} />
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" type="button" onClick={() => setShowAdd(false)}>Annuler</Button>
                    <Button type="submit">Enregistrer</Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}