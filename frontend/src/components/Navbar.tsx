'use client';

import Link from 'next/link';
import Image from 'next/image';
import UserNav from '@/components/UserNav';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-[100] glass-navbar">
      <div className="max-w-7xl mx-auto flex h-20 items-center justify-between px-6">
        {/* Logo + Links */}
        <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <Image
                src="/tcg-icon.png"
                alt="TCG MEGASTORE"
                width={64}
                height={64}
                className="object-contain"
              />
            <span className="hidden sm:flex items-center text-lg font-black uppercase tracking-tighter text-white">
              TCG<span style={{ color: '#e11d48' }}>MEGASTORE</span>
              <span className="ml-1 h-1.5 w-1.5 rounded-full" style={{ background: '#e11d48' }} />
            </span>
          </Link>

          <div className="hidden items-center gap-6 lg:flex">
            {[
              { href: '/marketplace', label: 'Marketplace' },
              { href: '/vender',      label: 'Vender' },
              { href: '/leilao',      label: 'Leilão' },
              { href: '/suporte',     label: 'Suporte' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[11px] font-black uppercase tracking-widest transition-colors hover:text-white"
                style={{ color: '#8b95b5' }}
              >
                {label}
              </Link>
            ))}

            <Link href="/lives" className="badge-live">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#e11d48' }} />
              Ao Vivo
            </Link>
          </div>
        </div>

        {/* Right side */}
        <UserNav />
      </div>
    </nav>
  );
}
