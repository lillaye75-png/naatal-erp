"use client"

import { useAuthStore } from "@/stores/auth.store"
import { CsvImport } from "@/components/shared/CsvImport"
import { createProduct } from "@/repositories/product.repository"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload } from "lucide-react"
import { toast } from "sonner"

export default function ProductsImportPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const userId = useAuthStore((s) => s.user?.id)

  const handleImport = async (rows: Record<string, string>[]) => {
    if (!tenantId || !userId) {
      toast.error("Session expirée")
      return
    }
    for (const row of rows) {
      await createProduct(
        {
          ...row,
          tenantId,
          price: parseInt(row.price || "0") || 0,
          costPrice: parseInt(row.costPrice || "0") || 0,
          minStock: parseInt(row.minStock || "0") || 0,
        },
        userId,
      )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importer des produits</h1>
        <p className="text-sm text-muted-foreground mt-1">Importez vos produits depuis un fichier CSV</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Fichier CSV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CsvImport
            fields={[
              { key: "name", label: "Nom", required: true },
              { key: "sku", label: "SKU" },
              { key: "price", label: "Prix" },
              { key: "costPrice", label: "Prix de revient" },
              { key: "minStock", label: "Stock minimum" },
              { key: "barcode", label: "Code-barres" },
            ]}
            onImport={handleImport}
            title="Choisir un fichier CSV"
          />
        </CardContent>
      </Card>
    </div>
  )
}
