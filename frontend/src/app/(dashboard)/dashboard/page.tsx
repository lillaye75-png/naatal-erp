"use client";

import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

import { DollarSign, Users, Package, TrendingUp } from "lucide-react";

const kpis = [
  { label: "Ventes aujourd'hui", value: "0 F", icon: DollarSign, trend: "+0%", variant: "teranga" },
  { label: "Crédits en cours", value: "0 F", icon: TrendingUp, trend: "", variant: "warning" },
  { label: "Produits", value: "0", icon: Package, trend: "", variant: "info" },
  { label: "Clients", value: "0", icon: Users, trend: "", variant: "neutral" },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Bonjour, {String(user?.displayName || "Utilisateur")}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">Voici votre résumé du jour.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{kpi.value}</p>
                {kpi.trend && (
                  <p className="text-xs font-medium text-success mt-1">{kpi.trend}</p>
                )}
              </div>
              <div className="w-10 h-10 rounded-lg bg-teranga-50 flex items-center justify-center">
                <kpi.icon className="w-5 h-5 text-teranga-500" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Ventes (30 jours)</CardTitle>
          </CardHeader>
          <div className="h-64 flex items-center justify-center text-neutral-400 text-sm">
            Graphique des ventes
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <div className="flex items-center justify-center h-64 text-neutral-400 text-sm">
            Aucune activité récente
          </div>
        </Card>
      </div>
    </div>
  );
}