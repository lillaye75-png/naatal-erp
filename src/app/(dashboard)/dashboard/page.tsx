"use client"

import { useMemo } from "react"
import { DollarSign, ShoppingCart, Users, AlertTriangle, RefreshCw, LayoutDashboard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KPICard } from "@/features/dashboard/KPICards"
import { SalesChart } from "@/features/dashboard/SalesChart"
import { AlertsPanel } from "@/features/dashboard/AlertsPanel"
import { RecentSales } from "@/features/dashboard/RecentSales"
import { OnboardingWizard } from "@/features/onboarding/OnboardingWizard"
import { ChecklistPopup } from "@/features/onboarding/ChecklistPopup"
import { useDashboard } from "@/features/dashboard/hooks/useDashboard"
import { useAuthStore } from "@/stores/auth.store"
import { KPICardSkeleton } from "@/components/shared/Skeleton"
import { formatXOF } from "@/lib/currency"

export default function DashboardPage() {
  const { todaySales, totalCustomers, totalProducts, totalDebt, alerts, recentSales, chartData, todaySalesCount, totalUsers, settings, loading, error } = useDashboard()
  const authLoading = useAuthStore((s) => s.isLoading)
  const tenant = useAuthStore((s) => s.tenant)

  const checklistItems = useMemo(() => {
    const hasWaveKey = !!settings?.waveApiKey
    const hasOMKey = !!settings?.orangeMoneyKey
    return [
      { key: 'products', label: 'Ajouter vos produits', done: totalProducts > 0 },
      { key: 'customers', label: 'Ajouter vos clients', done: totalCustomers > 0 },
      { key: 'firstSale', label: 'Effectuer votre première vente', done: todaySalesCount > 0 },
      { key: 'payments', label: 'Configurer vos paiements', done: hasWaveKey || hasOMKey },
      { key: 'team', label: 'Inviter un membre de l\'équipe', done: totalUsers > 1 },
    ]
  }, [totalProducts, totalCustomers, todaySalesCount, totalUsers, settings])

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )
  if (loading) return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground mt-1">Bienvenue sur Naatal ERP</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>
    </div>
  )
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <LayoutDashboard className="w-12 h-12 mb-3 text-destructive opacity-40" />
      <p className="text-destructive mb-4">Erreur de chargement du tableau de bord</p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        <RefreshCw className="w-4 h-4 mr-1" /> Réessayer
      </Button>
    </div>
  )
  if (totalProducts === 0 && !tenant?.onboardingCompleted) return <OnboardingWizard />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground mt-1">Bienvenue sur Naatal ERP</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Ventes aujourd'hui" value={formatXOF(todaySales)} icon={<DollarSign className="w-4 h-4" />} />
        <KPICard title="Clients" value={totalCustomers.toString()} icon={<Users className="w-4 h-4" />} />
        <KPICard title="Dettes totales" value={formatXOF(totalDebt)} icon={<AlertTriangle className="w-4 h-4" />} />
        <KPICard title="Produits" value={totalProducts.toString()} icon={<ShoppingCart className="w-4 h-4" />} />
      </div>
      <ChecklistPopup items={checklistItems} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesChart data={chartData} />
        </div>
        <AlertsPanel alerts={alerts} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
        <RecentSales sales={recentSales} />
      </div>
    </div>
  )
}
