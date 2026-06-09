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

  function parseCsvLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  function processRows(rawHeaders: string[], dataRows: string[][]) {
    const headerMap = new Map<string, string>()
    for (const h of rawHeaders) {
      const cleaned = h.replace(/^"|"$/g, '').toLowerCase()
      headerMap.set(cleaned, h)
    }
    function matchField(headerClean: string) {
      return fields.find((f) =>
        f.key.toLowerCase() === headerClean ||
        f.label.toLowerCase() === headerClean ||
        f.label.toLowerCase().replace(/[^a-z0-9]/g, '') === headerClean.replace(/[^a-z0-9]/g, ''),
      )
    }
    const missing = fields
      .filter((f) => f.required && !headerMap.has(f.key.toLowerCase()) && !Array.from(headerMap.keys()).some((h) => matchField(h)?.key === f.key))
      .map((f) => f.label)
    if (missing.length > 0) {
      const detected = Array.from(headerMap.keys()).join(', ')
      setError(`Champs obligatoires manquants: ${missing.join(', ')}. En-têtes détectées: ${detected}`)
      return
    }
    const parsed = dataRows.map((values) => {
      const row: Record<string, string> = {}
      rawHeaders.forEach((raw, i) => {
        const cleaned = raw.replace(/^"|"$/g, '').toLowerCase()
        const field = matchField(cleaned)
        if (field) row[field.key] = (values[i] || '').replace(/^"|"$/g, '')
      })
      return row
    })
    setRows(parsed)
    toast.success(`${parsed.length} ligne(s) chargée(s)`)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const name = file.name.toLowerCase()
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls')

    if (isExcel) {
      try {
        const XLSX = await import('xlsx')
        const reader = new FileReader()
        reader.onload = (evt) => {
          try {
            const data = new Uint8Array(evt.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array' })
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            if (!sheet) { setError("Aucune feuille trouvée dans le fichier"); return }
            const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })
            if (json.length < 2) {
              setError("Le fichier doit contenir un en-tête et au moins une ligne")
              return
            }
            const rawHeaders = (json[0] || []).map((v: any) => String(v ?? '').trim())
            const dataRows = json.slice(1).map((row: any[]) => (row || []).map((v: any) => String(v ?? '').trim()))
            processRows(rawHeaders, dataRows)
          } catch (parseErr) {
            setError("Erreur lors de l'analyse du fichier Excel. Vérifiez que le fichier est valide.")
          }
        }
        reader.onerror = () => setError("Erreur de lecture du fichier")
        reader.readAsArrayBuffer(file)
      } catch {
        setError("Erreur lors de la lecture du fichier Excel")
      }
      return
    }

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = (evt.target?.result as string).replace(/^\uFEFF/, '')
      const lines = text.split('\n').filter((l) => l.trim())
      if (lines.length < 2) {
        setError("Le fichier doit contenir un en-tête et au moins une ligne")
        return
      }
      const rawHeaders = parseCsvLine(lines[0])
      const dataRows = lines.slice(1).map((line) => parseCsvLine(line))
      processRows(rawHeaders, dataRows)
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
          accept=".csv,.xlsx,.xls"
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
        Format supporté: CSV, XLSX. {fields.map((f) => `${f.key}${f.required ? '*' : ''}`).join(', ')}
      </div>
    </div>
  )
}
