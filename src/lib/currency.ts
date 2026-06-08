export function formatXOF(amount: number): string {
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FCFA`
}

export function formatXOFShort(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M FCFA`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}k FCFA`
  }
  return `${amount} FCFA`
}

export function parseXOF(value: string): number {
  return parseInt(value.replace(/[^0-9]/g, ''), 10) || 0
}
