import { formatXOF } from "@/lib/currency"

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '').replace(/^0+/, '')
  const country = cleaned.startsWith('221') ? '' : '221'
  const full = `${country}${cleaned}`
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`
}

export function buildWhatsAppInvoiceURL(
  phone: string,
  customerName: string,
  invoiceNumber: string,
  total: number,
  paid: number,
  balance: number,
  storeName: string,
): string {
  const message = buildInvoiceMessageFull(customerName, invoiceNumber, total, paid, balance, storeName)
  return buildWhatsAppUrl(phone, message)
}

export function buildInvoiceMessageFull(
  customerName: string,
  invoiceNumber: string,
  total: number,
  paid: number,
  balance: number,
  storeName: string,
): string {
  const lines = [
    `🧾 *Facture ${invoiceNumber}*`,
    `Bonjour ${customerName},`,
    '',
    `Montant total: ${formatXOF(total)}`,
    `Payé: ${formatXOF(paid)}`,
    `Reste: ${formatXOF(balance)}`,
    `Magasin: ${storeName}`,
    '',
    'Merci de votre confiance !',
  ]
  return lines.join('\n')
}

export function buildInvoiceMessage(invoiceNumber: string, total: number, storeName: string): string {
  return [
    `🧾 *Facture ${invoiceNumber}*`,
    `Montant: ${formatXOF(total)}`,
    `Magasin: ${storeName}`,
    '',
    'Merci de votre confiance !',
  ].join('\n')
}

export function buildDebtReminderMessage(
  customerName: string,
  amount: number,
  dueDate: string,
  storeName: string,
): string {
  return [
    `Bonjour ${customerName},`,
    `Ceci est un rappel concernant votre dette de *${formatXOF(amount)}*`,
    dueDate ? `Échéance: ${dueDate}` : '',
    `Magasin: ${storeName}`,
    '',
    'Merci de régulariser votre situation.',
  ].filter(Boolean).join('\n')
}

export function buildWhatsAppDebtURL(
  phone: string,
  customerName: string,
  amount: number,
  dueDate: string,
  storeName: string,
): string {
  const message = buildDebtReminderMessage(customerName, amount, dueDate, storeName)
  return buildWhatsAppUrl(phone, message)
}
