"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/stores/auth.store"
import { CsvImport } from "@/components/shared/CsvImport"
import { createProduct } from "@/repositories/product.repository"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Download, AlertCircle } from "lucide-react"
import { initializeFirebase } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import { toast } from "sonner"

export default function ProductsImportPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const userId = useAuthStore((s) => s.user?.id)
  const [existingSkus, setExistingSkus] = useState<Set<string>>(new Set())
  const [duplicates, setDuplicates] = useState<string[]>([])

  useEffect(() => {
    if (!tenantId) return
    initializeFirebase().then(async ({ db }) => {
      const snap = await getDocs(query(
        collection(db, 'products'),
        where('tenantId', '==', tenantId),
        where('isDeleted', '==', false),
      ))
      const skus = new Set<string>()
      snap.docs.forEach((d) => {
        const data = d.data()
        if (data.sku) skus.add(data.sku)
      })
      setExistingSkus(skus)
    })
  }, [tenantId])

  const handleImport = async (rows: Record<string, string>[]) => {
    if (!tenantId || !userId) {
      toast.error("Session expirée")
      return
    }
    const newDuplicates: string[] = []
    let imported = 0
    for (const row of rows) {
      const sku = (row.sku || '').trim()
      if (sku && existingSkus.has(sku)) {
        newDuplicates.push(sku)
        continue
      }
      await createProduct(
        {
          ...row,
          tenantId,
          price: parseInt(row.price || "0") || 0,
          costPrice: parseInt(row.costPrice || "0") || 0,
          minStock: parseInt(row.minStock || "0") || 0,
          isSoldOnline: row.isSoldOnline === 'oui' || row.isSoldOnline === 'true' || row.isSoldOnline === '1',
        },
        userId,
      )
      if (sku) existingSkus.add(sku)
      imported++
    }
    setDuplicates(newDuplicates)
    if (newDuplicates.length > 0) {
      toast.warning(`${imported} importé(s). ${newDuplicates.length} doublon(s) ignoré(s) : ${newDuplicates.join(', ')}`)
    } else {
      toast.success(`${imported} produit(s) importé(s) avec succès`)
    }
  }

  async function handleDownloadTemplate() {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([
      ['name', 'sku', 'price', 'costPrice', 'categoryId', 'brandId', 'unitId', 'warehouseId', 'minStock', 'initialStock', 'barcode', 'imageUrl', 'description', 'isSoldOnline'],
      ['Huile d olive 1L', 'HUILE-001', '1500', '1000', 'cat001', 'br001', 'l', 'wh001', '5', '50', '123456789', 'https://exemple.com/huile.jpg', 'Huile d olive vierge 1L', 'oui'],
      ['Riz 5kg', 'RIZ-001', '3500', '2800', 'cat002', 'br002', 'kg', 'wh001', '10', '30', '', '', 'Riz parfumé 5kg', 'non'],
      ['Savon liquide', 'SAV-001', '800', '500', 'cat003', 'br003', 'piece', 'wh002', '20', '100', '', '', 'Savon liquide 500ml', 'oui'],
    ])
    ws['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 14 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Produits')
    XLSX.writeFile(wb, 'import-produits.xlsx')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importer des produits</h1>
        <p className="text-sm text-muted-foreground mt-1">Importez vos produits depuis un fichier CSV ou Excel</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Fichier CSV ou Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CsvImport
            fields={[
              { key: "name", label: "Nom", required: true },
              { key: "sku", label: "SKU" },
              { key: "price", label: "Prix" },
              { key: "costPrice", label: "Prix de revient" },
              { key: "categoryId", label: "Catégorie" },
              { key: "brandId", label: "Marque" },
              { key: "unitId", label: "Unité" },
              { key: "warehouseId", label: "Entrepôt" },
              { key: "minStock", label: "Stock minimum" },
              { key: "initialStock", label: "Stock initial" },
              { key: "barcode", label: "Code-barres" },
              { key: "imageUrl", label: "URL Image" },
              { key: "description", label: "Description" },
              { key: "isSoldOnline", label: "Vente en ligne (oui/non)" },
            ]}
            onImport={handleImport}
            title="Choisir un fichier CSV ou Excel"
          />
          <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4 mr-1" />
            Télécharger le modèle Excel
          </Button>
        </CardContent>
      </Card>
      {duplicates.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>Les SKU suivants existent déjà et ont été ignorés : {duplicates.join(', ')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
