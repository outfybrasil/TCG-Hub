import { Inter } from "next/font/google";
import Link from "next/link";
import Image from "next/image";

import CartDrawer from "@/components/CartDrawer";
import MobileNav from "@/components/MobileNav";
import Navbar from "@/components/Navbar";
import { CartProvider } from "@/context/CartContext";
import AchievementToast from "@/components/AchievementToast";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata = {
  title: "TCG MEGASTORE — Marketplace Premium de Pokémon TCG",
  description:
    "Acesse o estoque mais exclusivo de Pokemon TCG do Brasil. Cartas raras, certificadas e prontas para envio imediato.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`scroll-smooth ${inter.variable}`}>
      <body
        suppressHydrationWarning
        className="font-sans antialiased pb-20 lg:pb-0"
        style={{ background: "#0c1324", color: "#dce1fb" }}
      >
        <CartProvider>
          <main className="min-h-screen">
            {/* Promo bar */}
            <div
              className="px-6 py-2 text-center text-[10px] font-black uppercase tracking-[0.2em]"
              style={{
                background: "linear-gradient(90deg, #be0037, #e11d48, #be0037)",
                color: "#fff",
              }}
            >
              🚚 Frete grátis para todo o Brasil em compras acima de R$ 200
            </div>

            <Navbar />

            <div className="relative">{children}</div>

            <MobileNav />

            {/* Footer */}
            <footer
              className="mt-32 border-t pb-10 pt-20"
              style={{
                background: "#070d1f",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 gap-16 md:grid-cols-4">
                  {/* Brand column */}
                  <div className="space-y-4 md:col-span-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/5 p-1"
                        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <Image
                          src="/tcg-icon.png"
                          alt="TCG MEGASTORE Logo"
                          width={80}
                          height={80}
                          className="object-contain"
                        />
                      </div>
                      <span className="text-xl font-black uppercase tracking-tighter text-white">
                        TCG<span style={{ color: "#e11d48" }}>MEGASTORE</span>
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#8b95b5" }}>
                      O marketplace mais exclusivo de Pokémon TCG do Brasil.
                      Cartas raras, certificadas e com garantia de autenticidade.
                    </p>
                    <div className="flex gap-3">
                      {["100% Autêntico", "Entrega Segura", "SSL"].map((badge) => (
                        <span
                          key={badge}
                          className="rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-wider"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            color: "#8b95b5",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Links */}
                  <div className="space-y-4">
                    <h3
                      className="text-[10px] font-black uppercase tracking-[0.2em]"
                      style={{ color: "#dce1fb" }}
                    >
                      Loja
                    </h3>
                    <div className="flex flex-col gap-3">
                      {[
                        { href: "/marketplace", label: "Catálogo" },
                        { href: "/leilao",      label: "Leilões" },
                        { href: "/lives",       label: "Lives" },
                        { href: "/vender",      label: "Vender Cartas" },
                      ].map(({ href, label }) => (
                        <Link
                          key={href}
                          href={href}
                          className="text-[11px] font-bold uppercase tracking-widest transition-colors hover:text-white"
                          style={{ color: "#8b95b5" }}
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3
                      className="text-[10px] font-black uppercase tracking-[0.2em]"
                      style={{ color: "#dce1fb" }}
                    >
                      Legal
                    </h3>
                    <div className="flex flex-col gap-3">
                      {[
                        { href: "/privacidade",       label: "Privacidade" },
                        { href: "/privacidade#termos", label: "Termos de Uso" },
                        { href: "/suporte",           label: "Suporte" },
                      ].map(({ href, label }) => (
                        <Link
                          key={href}
                          href={href}
                          className="text-[11px] font-bold uppercase tracking-widest transition-colors hover:text-white"
                          style={{ color: "#8b95b5" }}
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  className="mt-16 space-y-2 border-t pt-8 text-center text-[10px] font-bold uppercase tracking-widest"
                  style={{ borderColor: "rgba(255,255,255,0.06)", color: "#8b95b5" }}
                >
                  <p>© 2026 TCG MEGASTORE. Todos os direitos reservados.</p>
                  <div className="flex items-center justify-center gap-4 opacity-70">
                    <span>Em conformidade com a LGPD</span>
                    <span
                      className="h-1 w-1 rounded-full"
                      style={{ background: "#8b95b5" }}
                    />
                    <span>Pagamento Seguro via SSL</span>
                  </div>
                  <p className="opacity-40">
                    Pokémon TCG e suas propriedades pertencem a The Pokémon Company.
                  </p>
                </div>
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
