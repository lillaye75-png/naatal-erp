"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PaymentStatusBadge } from "@/components/shared/PaymentStatusBadge"
import { formatXOF } from "@/lib/currency"
import type { RecentSaleItem } from "./hooks/useDashboard"

interface RecentSalesProps {
  sales: RecentSaleItem[]
}

export function RecentSales({ sales }: RecentSalesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Dernières ventes</CardTitle>
      </CardHeader>
      <CardContent>
        {sales.length > 0 ? (
          <div className="space-y-3">
            {sales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{sale.customerName}</p>
                  <PaymentStatusBadge status={sale.paymentStatus} />
                </div>
                <span className="font-semibold">{formatXOF(sale.total)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-6">
            Aucune vente récente
          </div>
        )}
      </CardContent>
    </Card>
  )
}
