import { Inter } from "next/font/google";
import Link from "next/link";

import CartDrawer from "@/components/CartDrawer";
import MobileNav from "@/components/MobileNav";
import UserNav from "@/components/UserNav";
import { CartProvider } from "@/context/CartContext";
import AchievementToast from "@/components/AchievementToast";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`light scroll-smooth ${inter.variable}`}>
      <body suppressHydrationWarning className="font-sans bg-[#F8F9FA] text-[#0F172A] antialiased selection:bg-[#3B82F6] selection:text-white pb-20 lg:pb-0">
        <CartProvider>
          <main className="min-h-screen">
            <div className="bg-rose-600 px-6 py-2 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white">
              Envio Gratis para todo o Brasil em compras acima de R$ 200
            </div>

            <nav className="sticky top-0 z-[100] border-b border-slate-100 bg-white/90 backdrop-blur-md">
              <div className="max-w-7xl mx-auto flex h-20 items-center justify-between px-6">
                <div className="flex items-center space-x-4 xl:space-x-8">
                  <Link href="/" className="group flex items-center transition-opacity hover:opacity-80">
                    <div className="mr-2 sm:mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-xl text-white shadow-lg shadow-rose-500/20">
                      <span>⚡</span>
                    </div>
                    <span className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-slate-900 hidden sm:block">
                      TCG<span className="text-rose-600"> Mega Store</span>
                    </span>
                  </Link>

                  <div className="hidden items-center space-x-3 lg:flex">
                    <Link href="/marketplace" className="text-[11px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-rose-600">
                      Loja
                    </Link>
                    <Link href="/leilao" className="text-[11px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-rose-600">
                      Leilões
                    </Link>
                    <Link href="/vender" className="text-[11px] font-black uppercase tracking-widest text-emerald-600 transition-all hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                      💰 Vender
                    </Link>
                    <Link href="/lives" className="text-[11px] font-black uppercase tracking-widest text-rose-500 transition-all hover:text-rose-600 flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                      Ao Vivo
                    </Link>

                    <Link href="/suporte" className="text-[11px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-rose-600">
                      Suporte
                    </Link>
                  </div>
                </div>

                <UserNav />
              </div>
            </nav>

            <div className="relative">{children}</div>

            <MobileNav />

            <footer className="mt-32 border-t border-slate-100 bg-white pb-10 pt-20">
              <div className="max-w-7xl mx-auto grid grid-cols-1 gap-16 px-6 md:grid-cols-3">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Legal</h3>
                  <div className="flex flex-col space-y-3">
                    <Link href="/privacidade" className="text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-rose-600">
                      Politica de Privacidade
                    </Link>
                    <Link href="/privacidade#termos" className="text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-rose-600">
                      Termos de Uso
                    </Link>
                  </div>
                </div>
              </div>

              <div className="mt-20 space-y-2 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                <p>© 2026 TCG Mega Store. Todos os direitos reservados.</p>
                <div className="flex items-center justify-center gap-4 opacity-70">
                  <p>Em conformidade com a LGPD</p>
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  <p>Pagamento Seguro</p>
                </div>
                <p className="opacity-50">Pokemon TCG e suas respectivas propriedades pertencem a The Pokemon Company.</p>
              </div>
            </footer>
          </main>
          <CartDrawer />
          <AchievementToast />
        </CartProvider>
      </body>
    </html>
  );
}
