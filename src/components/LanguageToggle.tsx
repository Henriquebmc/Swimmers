"use client";

import { LOCALES, type Locale } from "@/i18n/translations";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageToggle() {
  const { locale, setLocale, isPending } = useLanguage();

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/12 bg-[#07111f]/85 px-1.5 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
      {LOCALES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setLocale(value as Locale)}
          disabled={isPending}
          className={`min-w-11 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[0.18em] transition-all disabled:opacity-70 ${
            locale === value
              ? "bg-[#00F0FF] text-[#0A0F1D]"
              : "text-gray-300 hover:text-white hover:bg-white/6"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
