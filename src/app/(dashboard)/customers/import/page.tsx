"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/stores/auth.store"
import { CsvImport } from "@/components/shared/CsvImport"
import { createCustomer } from "@/repositories/customer.repository"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Download, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { initializeFirebase } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"

export default function CustomersImportPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const userId = useAuthStore((s) => s.user?.id)
  const [existingPhones, setExistingPhones] = useState<Set<string>>(new Set())
  const [duplicates, setDuplicates] = useState<string[]>([])

  useEffect(() => {
    if (!tenantId) return
    initializeFirebase().then(async ({ db }) => {
      const snap = await getDocs(query(
        collection(db, 'customers'),
        where('tenantId', '==', tenantId),
        where('isDeleted', '==', false),
      ))
      const phones = new Set<string>()
      snap.docs.forEach((d) => {
        const p = d.data().phone?.replace(/[^0-9]/g, '')
        if (p) phones.add(p)
      })
      setExistingPhones(phones)
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
      const phone = (row.phone || '').replace(/[^0-9]/g, '')
      if (phone && existingPhones.has(phone)) {
        newDuplicates.push(row.name || phone)
        continue
      }
      await createCustomer(
        { ...row, tenantId, creditLimit: parseInt(row.creditLimit || "0") || 0 },
        userId,
      )
      if (phone) existingPhones.add(phone)
      imported++
    }
    setDuplicates(newDuplicates)
    if (newDuplicates.length > 0) {
      toast.warning(`${imported} importé(s). ${newDuplicates.length} doublon(s) ignoré(s) : ${newDuplicates.slice(0, 5).join(', ')}${newDuplicates.length > 5 ? `... (+${newDuplicates.length - 5})` : ''}`)
    } else {
      toast.success(`${imported || rows.length} client(s) importé(s) avec succès`)
    }
  }

  async function handleDownloadTemplate() {
    const XLSX = await import('xlsx')
    const headers = ['name', 'phone', 'email', 'address', 'creditLimit', 'groupId', 'language']
    let exampleRows: any[][] = []

    try {
      if (tenantId) {
        const { db } = await initializeFirebase()
        const snap = await getDocs(query(
          collection(db, 'customers'),
          where('tenantId', '==', tenantId),
          where('isDeleted', '==', false),
        ))
        if (!snap.empty) {
          exampleRows = snap.docs.slice(0, 10).map((d) => {
            const c = d.data() as any
            return [c.name || '', c.phone || '', c.email || '', c.address || '', c.creditLimit || '', c.groupId || '', c.language || '']
          })
        }
      }
    } catch {}

    if (exampleRows.length === 0) {
      exampleRows = [
        ['Dupont Jean', '771234567', 'jean@exemple.com', 'Dakar, Sénégal', '500000', 'groupe001', 'fr'],
        ['Diallo Awa', '781234567', '', 'Thiès, Sénégal', '200000', '', 'wo'],
      ]
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows])
    ws['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clients')
    XLSX.writeFile(wb, 'import-clients.xlsx')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importer des clients</h1>
        <p className="text-sm text-muted-foreground mt-1">Importez vos clients depuis un fichier CSV ou Excel</p>
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
              { key: "phone", label: "Téléphone", required: true },
              { key: "email", label: "Email" },
              { key: "address", label: "Adresse" },
              { key: "creditLimit", label: "Limite de crédit" },
              { key: "groupId", label: "Groupe" },
              { key: "language", label: "Langue (fr/en/wo)" },
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
              <p>Les clients suivants existent déjà (téléphone) et ont été ignorés : {duplicates.join(', ')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
