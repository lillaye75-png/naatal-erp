import { formatXOF } from "@/lib/currency"

export function buildSmsMessage(
  businessName: string,
  invoiceNumber: string,
  total: number,
  dueDate?: string,
): string {
  let msg = `${businessName} - Facture ${invoiceNumber}: ${formatXOF(total)}`
  if (dueDate) {
    msg += ` (Échéance: ${dueDate})`
  }
  return msg
}

export function buildDebtReminderSms(
  businessName: string,
  customerName: string,
  amount: number,
  dueDate?: string,
): string {
  let msg = `${businessName} - Bonjour ${customerName}, rappel: solde de ${formatXOF(amount)} dû`
  if (dueDate) {
    msg += ` depuis le ${dueDate}`
  }
  msg += `. Merci de régulariser.`
  return msg
}

export function buildInvoiceSms(
  businessName: string,
  customerName: string,
  invoiceNumber: string,
  total: number,
  paid: number,
  balance: number,
): string {
  return `${businessName} - Facture ${invoiceNumber}: ${formatXOF(total)} (payé: ${formatXOF(paid)}, reste: ${formatXOF(balance)}). Merci ${customerName}!`
}
