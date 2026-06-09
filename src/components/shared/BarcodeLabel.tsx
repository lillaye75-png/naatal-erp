"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

interface BarcodeLabelProps {
  productName: string
  price: number
  barcode: string
  formatPrice: (amount: number) => string
}

export function BarcodeLabel({ productName, price, barcode, formatPrice }: BarcodeLabelProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return
    const win = window.open('', '', 'width=300,height=200')
    if (!win) { alert("Veuillez autoriser les popups pour imprimer"); return }
    win.document.write(`
      <html><head><style>
        body { font-family: 'Courier New', monospace; margin: 10px; text-align: center; }
        .label { border: 1px dashed #333; padding: 8px; max-width: 200px; margin: auto; }
        .name { font-size: 11px; font-weight: bold; margin-bottom: 4px; }
        .price { font-size: 14px; margin-bottom: 4px; }
        .barcode { font-size: 8px; letter-spacing: 1px; }
      </style></head><body>${content}</body></html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div className="space-y-2">
      <div ref={printRef} className="border rounded-lg p-3 inline-block bg-white text-black">
        <div className="text-xs font-bold mb-1 truncate max-w-[180px]">{productName}</div>
        <div className="text-sm font-bold mb-1">{formatPrice(price)}</div>
        <div className="text-[10px] tracking-widest font-mono">{barcode || 'N/A'}</div>
      </div>
      {barcode && (
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="w-3.5 h-3.5 mr-1" />
          Imprimer l'étiquette
        </Button>
      )}
    </div>
  )
}