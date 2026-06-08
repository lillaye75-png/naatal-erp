"use client"

import { Button } from "@/components/ui/button"
import { FileDown, FileSpreadsheet } from "lucide-react"
import { downloadExcel } from "@/lib/excel"
import { toast } from "sonner"
import type { ReactNode } from "react"

interface ColumnDef {
  key: string
  label: string
}

interface ExportToolsProps {
  data: Record<string, unknown>[]
  columns: ColumnDef[]
  filename: string
  onExportPdf?: () => void
  children?: ReactNode
}

export function ExportTools({ data, columns, filename, onExportPdf, children }: ExportToolsProps) {
  const handleExcel = () => {
    const rows = data.map((row) => {
      const r: Record<string, unknown> = {}
      columns.forEach((col) => { r[col.label] = row[col.key] })
      return r
    })
    downloadExcel(rows, filename)
    toast.success("Fichier Excel téléchargé")
  }

  return (
    <div className="flex items-center gap-2">
      {children}
      <Button variant="outline" size="sm" onClick={handleExcel}>
        <FileSpreadsheet className="w-3 h-3 mr-1" />
        Excel
      </Button>
      {onExportPdf && (
        <Button variant="outline" size="sm" onClick={onExportPdf}>
          <FileDown className="w-3 h-3 mr-1" />
          PDF
        </Button>
      )}
    </div>
  )
}
