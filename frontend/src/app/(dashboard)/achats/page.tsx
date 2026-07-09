"use client";

import { useCollection } from "@/hooks/use-firestore";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingBag } from "lucide-react";

export default function PurchasesPage() {
  useCollection("purchases");

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-semibold text-[var(--text-primary)]">Achats</h1><p className="text-sm text-neutral-500 mt-1">Bons de commande et réceptions</p></div>
      <Card>
        <EmptyState icon={<ShoppingBag />} title="Aucun achat" description="Créez des bons de commande pour vos fournisseurs" />
      </Card>
    </div>
  );
}