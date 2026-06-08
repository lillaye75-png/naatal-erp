export async function testOrangeMoneyConnection(apiKey: string, secret: string): Promise<boolean> {
  try {
    const credentials = btoa(`${apiKey}:${secret}`)
    const res = await fetch('https://api.orange.com/om/v1/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })
    return res.ok
  } catch {
    return false
  }
}

export function generateOrangeMoneyPaymentUrl(phone: string, amount: number, reference: string): string {
  return `https://orange.sn/om/pay?phone=${phone}&amount=${amount}&ref=${reference}`
}

export function formatOMPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('+221')) return cleaned
  if (cleaned.startsWith('221')) return `+${cleaned}`
  if (cleaned.startsWith('0')) return `+221${cleaned.slice(1)}`
  return `+221${cleaned}`
}
