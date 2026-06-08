import { formatXOF } from "@/lib/currency"

export interface InvoicePdfData {
  storeName: string
  storeAddress?: string
  storePhone?: string
  storeLogo?: string
  invoiceNumber: string
  date: string
  customerName: string
  customerPhone?: string
  items: Array<{ name: string; qty: number; price: number; total: number }>
  subtotal: number
  discount?: number
  tax: number
  total: number
  paid: number
  balance: number
  footerText?: string
}

export function generateInvoicePdfUrl(data: InvoicePdfData): string {
  const content = buildInvoiceHtml(data)
  const blob = new Blob([content], { type: 'text/html' })
  return URL.createObjectURL(blob)
}

export function downloadInvoicePdf(data: InvoicePdfData): void {
  const url = generateInvoicePdfUrl(data)
  const win = window.open(url, '_blank')
  if (win) {
    win.addEventListener('load', () => {
      win.focus()
      win.print()
    }, { once: true })
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export function generateInvoiceHtml(data: InvoicePdfData): string {
  return buildInvoiceHtml(data)
}

function buildInvoiceHtml(data: InvoicePdfData): string {
  const rows = data.items.map((i) => `
    <tr>
      <td>${i.name}</td>
      <td class="right">${i.qty}</td>
      <td class="right">${formatXOF(i.price)}</td>
      <td class="right">${formatXOF(i.total)}</td>
    </tr>
  `).join('')

  const discountRow = (data.discount || 0) > 0
    ? `<tr><td>Remise</td><td class="right">-${formatXOF(data.discount!)}</td></tr>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Facture ${data.invoiceNumber}</title>
  <style>
    @page { margin: 15mm; }
    body { font-family: 'Courier New', monospace; font-size: 13px; color: #222; margin: 0; padding: 0; }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #000; }
    .header h1 { font-size: 20px; margin: 0 0 4px; }
    .header p { margin: 2px 0; font-size: 12px; color: #555; }
    .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; }
    .info div { flex: 1; }
    .info .right-col { text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
    th { background: #f5f5f5; padding: 8px 6px; text-align: left; border-bottom: 2px solid #000; font-size: 11px; text-transform: uppercase; }
    td { padding: 6px; border-bottom: 1px solid #ddd; }
    .right { text-align: right; }
    .totals { margin-left: auto; width: 280px; }
    .totals td { padding: 4px 6px; border: none; }
    .totals .final td { font-weight: bold; font-size: 15px; border-top: 2px solid #000; padding-top: 8px; }
    .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 11px; color: #777; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 3px; font-size: 11px; font-weight: bold; }
    .badge-paid { background: #d4edda; color: #155724; }
    .badge-unpaid { background: #f8d7da; color: #721c24; }
    .badge-partial { background: #fff3cd; color: #856404; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${data.storeLogo ? `<img src="${data.storeLogo}" style="max-height:60px;margin-bottom:8px" />` : ''}
    <h1>${data.storeName}</h1>
    ${data.storeAddress ? `<p>${data.storeAddress}</p>` : ''}
    ${data.storePhone ? `<p>Tel: ${data.storePhone}</p>` : ''}
  </div>

  <div class="info">
    <div>
      <strong>Client:</strong> ${data.customerName}<br>
      ${data.customerPhone ? `Tel: ${data.customerPhone}` : ''}
    </div>
    <div class="right-col">
      <strong>Facture:</strong> ${data.invoiceNumber}<br>
      <strong>Date:</strong> ${data.date}
    </div>
  </div>

  <table>
    <tr><th>Article</th><th class="right">Qté</th><th class="right">Prix unit.</th><th class="right">Total</th></tr>
    ${rows}
  </table>

  <table class="totals">
    <tr><td>Sous-total</td><td class="right">${formatXOF(data.subtotal)}</td></tr>
    ${discountRow}
    ${data.tax > 0 ? `<tr><td>TVA</td><td class="right">${formatXOF(data.tax)}</td></tr>` : ''}
    <tr class="final"><td>Total</td><td class="right">${formatXOF(data.total)}</td></tr>
    <tr><td>Payé</td><td class="right">${formatXOF(data.paid)}</td></tr>
    <tr><td>Reste</td><td class="right" style="color:${data.balance > 0 ? '#c00' : '#080'}">${formatXOF(data.balance)}</td></tr>
  </table>

  <div class="footer">
    ${data.footerText ? `<p>${data.footerText}</p>` : ''}
    <p>Merci de votre visite !</p>
  </div>

  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 300); }
  <\/script>
</body>
</html>`
}
