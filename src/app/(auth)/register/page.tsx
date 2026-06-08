"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/features/auth/hooks/useAuth"

const registerSchema = z.object({
  businessName: z.string().min(1, "Nom d'entreprise requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(1, "Téléphone requis"),
  password: z.string().min(6, "Minimum 6 caractères"),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const { register: handleRegister } = useAuth()
  const router = useRouter()
  const [error, setError] = useState("")

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError("")
      await handleRegister(data.email, data.password, data.businessName, data.phone)
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'inscription")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-center">Créer un compte</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form method="POST" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Nom de l'entreprise</Label>
            <Input id="businessName" autoComplete="organization" {...register("businessName")} placeholder="Mon entreprise" />
            {errors.businessName && <p className="text-xs text-destructive">{errors.businessName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} placeholder="vous@exemple.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} placeholder="+221 77 000 00 00" />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} placeholder="••••••••" />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Inscription..." : "Créer mon compte"}
          </Button>
        </form>
        <p className="text-sm text-center text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
