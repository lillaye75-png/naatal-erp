"use client"

import { useAuthStore } from "@/stores/auth.store"
import { CsvImport } from "@/components/shared/CsvImport"
import { createCustomer } from "@/repositories/customer.repository"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload } from "lucide-react"
import { toast } from "sonner"

export default function CustomersImportPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const userId = useAuthStore((s) => s.user?.id)

  const handleImport = async (rows: Record<string, string>[]) => {
    if (!tenantId || !userId) {
      toast.error("Session expirée")
      return
    }
    for (const row of rows) {
      await createCustomer(
        { ...row, tenantId, creditLimit: parseInt(row.creditLimit || "0") || 0 },
        userId,
      )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importer des clients</h1>
        <p className="text-sm text-muted-foreground mt-1">Importez vos clients depuis un fichier CSV</p>
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
              { key: "phone", label: "Téléphone", required: true },
              { key: "email", label: "Email" },
              { key: "address", label: "Adresse" },
              { key: "creditLimit", label: "Limite de crédit" },
            ]}
            onImport={handleImport}
            title="Choisir un fichier CSV"
          />
        </CardContent>
      </Card>
    </div>
  )
}
