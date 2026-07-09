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
import { Wallet, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const categories = [
  "Loyer", "Électricité", "Salaires", "Transport",
  "Marketing", "Fournitures", "Impôts", "Autres"
];

export default function ExpensesPage() {
  const { data: expenses, loading } = useCollection("expenses");
  const { add } = useFirestoreMutations();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: categories[0], amount: 0, description: "" });

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await add("expenses", { ...form, date: new Date() });
      setShowAdd(false);
      setForm({ category: categories[0], amount: 0, description: "" });
      toast("success", "Dépense ajoutée!");
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-semibold text-[var(--text-primary)]">Dépenses</h1><p className="text-sm text-neutral-500 mt-1">Total: {total.toLocaleString()} F</p></div>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Ajouter</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const catTotal = expenses.filter((e) => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0);
          return (
            <Card key={cat} className="p-4">
              <p className="text-xs text-neutral-500">{cat}</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">{catTotal.toLocaleString()} F</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-6"><SkeletonTable /></div>
        : expenses.length === 0 ? <EmptyState icon={<Wallet />} title="Aucune dépense" description="Ajoutez vos dépenses" />
        : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-[var(--border)]"><th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Description</th><th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Catégorie</th><th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Montant</th></tr></thead><tbody>{expenses.map((e) => (<tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-card)]"><td className="px-4 py-3 text-sm text-[var(--text-primary)]">{e.description}</td><td className="px-4 py-3 text-center"><Badge>{e.category}</Badge></td><td className="px-4 py-3 text-sm text-right font-medium text-[var(--text-primary)]">{e.amount?.toLocaleString()} F</td></tr>))}</tbody></table></div>}
      </Card>

      <AnimatePresence>
        {showAdd && (<><motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-40" onClick={() => setShowAdd(false)} /><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="w-full max-w-lg rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-lg"><div className="flex items-center justify-between mb-6"><h2 className="text-base font-semibold text-[var(--text-primary)]">Ajouter une dépense</h2><button onClick={() => setShowAdd(false)} className="text-neutral-400 hover:text-neutral-600" aria-label="Fermer"><X className="w-4 h-4" /></button></div><form onSubmit={handleAdd} className="space-y-4"><label className="text-sm font-medium text-neutral-700">Catégorie</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-10 px-3 text-sm rounded border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)]"><option>Loyer</option><option>Électricité</option><option>Salaires</option><option>Transport</option><option>Marketing</option><option>Fournitures</option><option>Impôts</option><option>Autres</option></select><Input label="Montant (F CFA)" type="number" required value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /><Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Facture électricité juillet" /><div className="flex justify-end gap-3 pt-2"><Button variant="ghost" type="button" onClick={() => setShowAdd(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div></form></div></motion.div></>)}
      </AnimatePresence>
    </div>
  );
}