"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n";
import { Sun, Moon, Palette } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useI18n();

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="text-xl font-semibold text-[var(--text-primary)]">Paramètres</h1></div>

      <Card>
        <CardHeader><CardTitle>Entreprise</CardTitle></CardHeader>
        <div className="space-y-4">
          <Input label="Nom de l'entreprise" placeholder="Ma Boutique" />
          <Input label="Téléphone" placeholder="+221 77 XXX XX XX" />
          <Input label="Adresse" placeholder="Dakar, Sénégal" />
          <Button>Enregistrer</Button>
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Thème</CardTitle></CardHeader>
        <div className="flex gap-3">
          {(["dark", "light", "solarized"] as const).map((t) => (
            <button key={t} onClick={() => setTheme(t)} className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${theme === t ? "border-teranga-500 bg-teranga-50 text-teranga-600" : "border-[var(--border)] text-[var(--text-primary)] hover:bg-neutral-100"}`}>
              {t === "dark" ? <Moon className="w-4 h-4" /> : t === "light" ? <Sun className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
              {t === "dark" ? "Sombre" : t === "light" ? "Clair" : "Solarisé"}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Langue</CardTitle></CardHeader>
        <div className="flex gap-3">
          {(["fr", "wo", "en"] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)} className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${lang === l ? "border-teranga-500 bg-teranga-50 text-teranga-600" : "border-[var(--border)] text-[var(--text-primary)] hover:border-neutral-300"}`}>
              {l === "fr" ? "Français" : l === "wo" ? "Wolof" : "English"}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}