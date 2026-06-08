export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto mb-3">
            N
          </div>
          <h1 className="text-2xl font-semibold">Naatal ERP</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez votre commerce simplement
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
