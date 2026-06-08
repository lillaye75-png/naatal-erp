"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Languages } from "lucide-react"

const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'wo', label: 'Wolof' },
] as const

export function LanguageSwitcher() {
  const [locale, setLocale] = useState('fr')

  const handleChange = (code: string) => {
    setLocale(code)
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`
    window.location.reload()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer" render={<button type="button" />}>
        <Button variant="ghost" size="icon" className="w-8 h-8">
          <Languages className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={locale === lang.code ? 'font-bold' : ''}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
