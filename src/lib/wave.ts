export function generateWavePaymentUrl(phone: string, amount: number, reference: string): string {
  return `https://wave.com/pay/${phone}?amount=${amount}&reference=${reference}`
}

export async function testWaveConnection(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.wave.com/v1/checkout', {
      method: 'HEAD',
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.ok
  } catch {
    return false
  }
}

export function formatWavePhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('221')) return `+${cleaned}`
  if (cleaned.startsWith('+221')) return cleaned
  if (cleaned.startsWith('0')) return `+221${cleaned.slice(1)}`
  return `+221${cleaned}`
}
