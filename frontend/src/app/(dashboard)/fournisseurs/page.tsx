"use client";

import { useState } from "react";
import { useCollection, useFirestoreMutations } from "@/hooks/use-firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { Truck, Plus, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SuppliersPage() {
  const { data: suppliers, loading } = useCollection("suppliers");
  const { add } = useFirestoreMutations();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  const filtered = suppliers.filter((s) => s.name?.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await add("suppliers", { ...form, balance: 0 });
      setShowAdd(false);
      setForm({ name: "", phone: "", address: "" });
      toast("success", "Fournisseur ajouté!");
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-semibold text-[var(--text-primary)]">Fournisseurs</h1><p className="text-sm text-neutral-500 mt-1">{suppliers.length} fournisseurs</p></div>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Ajouter</Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input type="search" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 pl-9 pr-3 text-sm rounded border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-neutral-400 focus:outline-none focus:border-teranga-500" />
      </div>
      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-6"><SkeletonTable /></div>
        : filtered.length === 0 ? <EmptyState icon={<Truck />} title={search ? "Aucun résultat" : "Aucun fournisseur"} description="Ajoutez vos fournisseurs" action={!search ? <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Ajouter</Button> : undefined} />
        : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-[var(--border)]"><th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Nom</th><th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Téléphone</th><th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Solde</th></tr></thead><tbody>{filtered.map((s) => (<tr key={s.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-card)]"><td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{s.name}</td><td className="px-4 py-3 text-sm text-neutral-500">{s.phone}</td><td className="px-4 py-3 text-sm text-right text-[var(--text-primary)]">{s.balance?.toLocaleString()} F</td></tr>))}</tbody></table></div>}
      </Card>
      <AnimatePresence>
        {showAdd && (<><motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-40" onClick={() => setShowAdd(false)} /><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="w-full max-w-lg rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-lg"><div className="flex items-center justify-between mb-6"><h2 className="text-base font-semibold text-[var(--text-primary)]">Ajouter un fournisseur</h2><button onClick={() => setShowAdd(false)} className="text-neutral-400 hover:text-neutral-600" aria-label="Fermer"><X className="w-4 h-4" /></button></div><form onSubmit={handleAdd} className="space-y-4"><Input label="Nom" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Fournisseur Sénégal" /><Input label="Téléphone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+221 77 XXX XX XX" /><Input label="Adresse" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /><div className="flex justify-end gap-3 pt-2"><Button variant="ghost" type="button" onClick={() => setShowAdd(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div></form></div></motion.div></>)}
      </AnimatePresence>
    </div>
  );
}