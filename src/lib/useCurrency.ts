import { useAuthStore } from "@/stores/auth.store"

const CURRENCY_CONFIG: Record<string, { symbol: string; code: string; locale: string; decimals: number }> = {
  XOF: { symbol: 'FCFA', code: 'XOF', locale: 'fr-SN', decimals: 0 },
  EUR: { symbol: '€', code: 'EUR', locale: 'fr-FR', decimals: 2 },
  USD: { symbol: '$', code: 'USD', locale: 'en-US', decimals: 2 },
  XAF: { symbol: 'FCFA', code: 'XAF', locale: 'fr-CM', decimals: 0 },
  MAD: { symbol: 'DH', code: 'MAD', locale: 'fr-MA', decimals: 2 },
  GNF: { symbol: 'FG', code: 'GNF', locale: 'fr-GN', decimals: 0 },
}

export function useCurrency() {
  const currencyCode = useAuthStore((s) => s.tenant?.currency || 'XOF')
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.XOF

  const format = (amount: number): string => {
    return `${amount.toLocaleString(config.locale, { minimumFractionDigits: config.decimals, maximumFractionDigits: config.decimals })} ${config.symbol}`
  }

  const formatShort = (amount: number): string => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M ${config.symbol}`
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}k ${config.symbol}`
    return `${amount} ${config.symbol}`
  }

  return { format, formatShort, currencyCode, config }
}

export function formatCurrency(amount: number, currencyCode = 'XOF'): string {
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.XOF
  return `${amount.toLocaleString(config.locale, { minimumFractionDigits: config.decimals, maximumFractionDigits: config.decimals })} ${config.symbol}`
}