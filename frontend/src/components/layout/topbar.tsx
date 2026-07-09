"use client";

import { useState } from "react";
import { Search, Sun, Moon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n";

export function Topbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const [showUser, setShowUser] = useState(false);

  const cycleTheme = () => {
    const themes = ["dark", "light", "solarized"] as const;
    const currentIndex = themes.indexOf(theme);
    setTheme(themes[(currentIndex + 1) % themes.length]);
  };

  const cycleLang = () => {
    const langs: Array<"fr" | "wo" | "en"> = ["fr", "wo", "en"];
    setLang(langs[(langs.indexOf(lang) + 1) % langs.length]);
  };

  return (
    <header className="flex items-center justify-between h-14 px-4 md:px-6 border-b border-[var(--border)] bg-[var(--bg-card)]">
      <div className="flex items-center gap-3 md:hidden">
        <span className="text-sm font-semibold text-[var(--text-primary)]">Naatal</span>
      </div>

      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="search"
            placeholder={t("action.search")}
            className="w-full h-9 pl-9 pr-3 text-sm rounded border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-neutral-400 focus:outline-none focus:border-teranga-500"

            aria-label={t("action.search")}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={cycleLang}
          className="flex items-center justify-center w-8 h-8 text-xs font-medium rounded hover:bg-neutral-100 text-neutral-600 uppercase"
          aria-label={`Langue: ${lang}`}
        >
          {lang}
        </button>

        <button
          onClick={cycleTheme}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-neutral-100 text-neutral-500"
          aria-label={`Thème: ${theme}`}
        >
          {theme === "dark" ? <Moon className="w-4 h-4" /> : theme === "solarized" ? <Sun className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUser(!showUser)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-teranga-500 text-white text-xs font-semibold"
            aria-label="Menu utilisateur"
          >
            {String(user?.displayName || "U").charAt(0).toUpperCase()}
          </button>

          {showUser && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUser(false)} />
              <div className="absolute right-0 top-10 z-20 w-48 rounded-md border border-[var(--border)] bg-[var(--bg-card)] shadow-lg py-1">
                <div className="px-4 py-2 text-sm text-neutral-600 border-b border-[var(--border)]">
                  {String(user?.displayName || user?.phoneNumber || user?.email || "")}
                </div>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-sm text-error hover:bg-neutral-100"
                >
                  Déconnexion
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}