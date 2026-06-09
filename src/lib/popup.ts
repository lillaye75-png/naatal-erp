export function safeWindowOpen(url: string, target = '_blank'): Window | null {
  const win = window.open(url, target)
  if (!win) {
    import('sonner').then(({ toast }) =>
      toast.error("Veuillez autoriser les popups pour cette action", { duration: 4000 }),
    )
  }
  return win
}

export function openPrintWindow(content: string): Window | null {
  const win = window.open('', '', 'width=400,height=300')
  if (!win) {
    import('sonner').then(({ toast }) =>
      toast.error("Veuillez autoriser les popups pour imprimer", { duration: 4000 }),
    )
    return null
  }
  win.document.write(content)
  win.document.close()
  return win
}