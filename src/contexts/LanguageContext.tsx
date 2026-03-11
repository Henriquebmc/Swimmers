"use client";

import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { type Locale } from "@/i18n/translations";

type LanguageContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isPending: boolean;
};

const LanguageContext = createContext<LanguageContextType>({
  locale: "pt-BR",
  setLocale: () => {},
  isPending: false,
});

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function setLocale(newLocale: Locale) {
    setLocaleState(newLocale);
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, isPending }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
