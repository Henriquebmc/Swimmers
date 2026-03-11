import Link from "next/link";
import { ArrowRight, Waves } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { translations, type Locale } from "@/i18n/translations";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "pt-BR") as Locale;
  const t = translations[locale].landing;

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 lg:p-24 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00F0FF] rounded-full blur-[150px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00FF85] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      <div className="glass-card p-12 max-w-3xl text-center z-10 flex flex-col items-center relative overflow-hidden group">
        <Waves className="text-[#00F0FF] w-16 h-16 mb-6 opacity-80 group-hover:opacity-100 transition-opacity" />
        <h1 className="text-5xl md:text-7xl font-[family-name:var(--font-display)] font-bold mb-6 tracking-tight">
          {t.headline} <span className="text-[#00F0FF]">{t.headlineAccent}</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl font-light">{t.subheadline}</p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
          <Link href="/api/auth/signin?callbackUrl=/dashboard" className="btn-primary flex items-center justify-center gap-2 text-lg">
            {t.cta} <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/dashboard" className="px-6 py-3 rounded-full border border-[rgba(255,255,255,0.2)] text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors text-lg font-medium">
            {t.preview}
          </Link>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl z-10">
        <div className="glass-card p-6 flex flex-col items-start">
          <h3 className="text-[#00F0FF] font-[family-name:var(--font-display)] text-xl font-bold mb-2">{t.feature1Title}</h3>
          <p className="text-gray-400 text-sm">{t.feature1Desc}</p>
        </div>
        <div className="glass-card p-6 flex flex-col items-start">
          <h3 className="text-[#00F0FF] font-[family-name:var(--font-display)] text-xl font-bold mb-2">{t.feature2Title}</h3>
          <p className="text-gray-400 text-sm">{t.feature2Desc}</p>
        </div>
        <div className="glass-card p-6 flex flex-col items-start">
          <h3 className="text-[#00FF85] font-[family-name:var(--font-display)] text-xl font-bold mb-2">{t.feature3Title}</h3>
          <p className="text-gray-400 text-sm">{t.feature3Desc}</p>
        </div>
      </div>
    </main>
  );
}
