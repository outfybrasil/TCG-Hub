import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import UserNav from "@/components/UserNav";
import { CartProvider } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "TCGHub | Digital Asset Management",
  description: "Plataforma moderna de gestão e certificação de ativos Pokémon TCG.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`light scroll-smooth ${inter.variable}`}>
      <body className="font-sans bg-[#F8F9FA] text-[#0F172A] antialiased selection:bg-[#3B82F6] selection:text-white">
        <CartProvider>
          <main className="min-h-screen">
            {/* Pro Branding Bar */}
            <div className="bg-rose-600 text-white py-2 px-6 text-[10px] font-black tracking-[0.2em] uppercase text-center">
              Envio Grátis para todo o Brasil em compras acima de R$ 200
            </div>

            <nav className="border-b border-slate-100 bg-white/90 backdrop-blur-md sticky top-0 z-[100]">
              <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center space-x-10">
                  <Link href="/" className="flex items-center group transition-opacity hover:opacity-80">
                    <div className="h-10 w-10 bg-rose-600 rounded-xl flex items-center justify-center text-white text-xl mr-3 shadow-lg shadow-rose-500/20">
                      <span>⚡</span>
                    </div>
                    <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase">
                      TCG<span className="text-rose-600"> Mega Store</span>
                    </span>
                  </Link>

                  <div className="hidden lg:flex items-center space-x-10">
                    <Link href="/marketplace" className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 transition-all">Loja</Link>
                  </div>
                </div>

                <UserNav />
              </div>
            </nav>

            <div className="relative">
              {children}
            </div>

            <footer className="mt-32 pt-20 pb-10 border-t border-slate-100 bg-white">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black tracking-[0.2em] text-slate-900 uppercase">Legal</h3>
                  <div className="flex flex-col space-y-3">
                    <Link href="/privacidade" className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-rose-600 transition-colors">Política de Privacidade</Link>
                    <Link href="/privacidade#termos" className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-rose-600 transition-colors">Termos de Uso</Link>
                  </div>
                </div>
              </div>
              <div className="mt-20 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400 space-y-2">
                <p>© 2026 TCG Mega Store. Todos os direitos reservados.</p>
                <div className="flex items-center justify-center gap-4 opacity-70">
                  <p>Em conformidade com a LGPD</p>
                  <div className="h-1 w-1 bg-slate-300 rounded-full" />
                  <p>Pagamento Seguro</p>
                </div>
                <p className="opacity-50">Pokémon TCG e suas respectivas propriedades são copyright de The Pokémon Company.</p>
              </div>
            </footer>
          </main>
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
