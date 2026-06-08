"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

export interface CsvImportConfig {
  fields: { key: string; label: string; required?: boolean }[]
  onImport: (rows: Record<string, string>[]) => Promise<void>
  title?: string
}

export function CsvImport({ fields, onImport, title = "Importer CSV" }: CsvImportConfig) {
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const lines = text.split('\n').filter((l) => l.trim())
      if (lines.length < 2) {
        setError("Le fichier doit contenir un en-tête et au moins une ligne")
        return
      }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
      const missing = fields
        .filter((f) => f.required && !headers.includes(f.key.toLowerCase()))
        .map((f) => f.label)
      if (missing.length > 0) {
        setError(`Champs obligatoires manquants: ${missing.join(', ')}`)
        return
      }
      const parsed = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim())
        const row: Record<string, string> = {}
        headers.forEach((h, i) => {
          const field = fields.find((f) => f.key.toLowerCase() === h)
          if (field) row[field.key] = values[i] || ''
        })
        return row
      })
      setRows(parsed)
      toast.success(`${parsed.length} ligne(s) chargée(s)`)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (rows.length === 0) return
    setImporting(true)
    try {
      await onImport(rows)
      toast.success(`${rows.length} élément(s) importé(s) avec succès`)
      setRows([])
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      toast.error("Erreur lors de l'import")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-1" /> {title}
        </Button>
        {rows.length > 0 && (
          <Button size="sm" onClick={handleImport} disabled={importing}>
            {importing ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-1" />
            )}
            Importer {rows.length} ligne(s)
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}

      {rows.length > 0 && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <FileText className="w-3 h-3" />
          {rows.length} ligne(s) prête(s) à importer
        </div>
      )}

      <div className="text-[10px] text-muted-foreground">
        Format: {fields.map((f) => `${f.key}${f.required ? '*' : ''}`).join(', ')}
      </div>
    </div>
  )
}
