"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


export default function WhatsAppPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="text-xl font-semibold text-[var(--text-primary)]">WhatsApp</h1><p className="text-sm text-neutral-500 mt-1">Assistant IA et campagnes</p></div>

      <Card>
        <CardHeader><CardTitle>Assistant AI WhatsApp</CardTitle></CardHeader>
        <p className="text-sm text-neutral-500 mb-4">Posez des questions sur votre entreprise via WhatsApp en Français, Wolof ou Anglais.</p>
        <div className="flex gap-3">
          <Input placeholder="Numéro WhatsApp configuré" />
          <Button variant="secondary">Configurer</Button>
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Campagnes</CardTitle></CardHeader>
        <p className="text-sm text-neutral-500">Créez et envoyez des campagnes à vos clients.</p>
      </Card>
    </div>
  );
}