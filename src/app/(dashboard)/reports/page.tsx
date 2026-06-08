"use client"

import { useState, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { SalesReport } from "./SalesReport"
import { InventoryReport } from "@/features/reports/InventoryReport"
import { ProfitReport } from "@/features/reports/ProfitReport"
import { DebtReport } from "@/features/reports/DebtReport"
import { CashRegisterReport } from "@/features/reports/CashRegisterReport"
import { cn } from "@/lib/utils"

type ReportTab = 'sales' | 'inventory' | 'profit' | 'debt' | 'cash'

const TABS: { key: ReportTab; label: string }[] = [
  { key: 'sales', label: 'Ventes' },
  { key: 'profit', label: 'Profit' },
  { key: 'inventory', label: 'Stock' },
  { key: 'debt', label: 'Dettes' },
  { key: 'cash', label: 'Caisse' },
]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales')
  const [period, setPeriod] = useState("month")

  const dateRange = useMemo(() => {
    const now = Date.now()
    switch (period) {
      case 'day': return { start: now - 86400000, end: now }
      case 'week': return { start: now - 604800000, end: now }
      case 'month': return { start: now - 2592000000, end: now }
      case 'year': return { start: now - 31536000000, end: now }
      default: return { start: now - 2592000000, end: now }
    }
  }, [period])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Rapports</h1>
          <p className="text-sm text-muted-foreground mt-1">Analyses et indicateurs</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v ?? 'month')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'sales' && <SalesReport startDate={dateRange.start} endDate={dateRange.end} />}
      {activeTab === 'inventory' && <InventoryReport />}
      {activeTab === 'profit' && <ProfitReport startDate={dateRange.start} endDate={dateRange.end} />}
      {activeTab === 'debt' && <DebtReport />}
      {activeTab === 'cash' && <CashRegisterReport startDate={dateRange.start} endDate={dateRange.end} />}
    </div>
  )
}
