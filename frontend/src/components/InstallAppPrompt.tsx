'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Download, Share, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface InstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export default function InstallAppPrompt() {
  const pathname = usePathname();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone) return;
    const dismissed = sessionStorage.getItem('install-prompt-dismissed');
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const handler = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPromptEvent); if (!dismissed) setVisible(true); };
    window.addEventListener('beforeinstallprompt', handler);
    const timer = window.setTimeout(() => { if (isIos && !dismissed) setVisible(true); }, 3500);
    return () => { window.removeEventListener('beforeinstallprompt', handler); window.clearTimeout(timer); };
  }, []);

  async function install() {
    if (prompt) { await prompt.prompt(); const result = await prompt.userChoice; if (result.outcome === 'accepted') setVisible(false); return; }
    setIosHelp(true);
  }
  function dismiss() { sessionStorage.setItem('install-prompt-dismissed', '1'); setVisible(false); }

  if (!visible || /\/live\/[^/]+/.test(pathname)) return null;
  return <>
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[90] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-[#111827]/95 p-3 text-white shadow-2xl backdrop-blur-xl lg:bottom-5">
      <Image src="/tcg-icon.png" width={48} height={48} alt="TCG Megastore" className="h-12 w-12 rounded-xl object-contain" />
      <div className="min-w-0 flex-1"><p className="text-xs font-black">Instalar TCG Megastore</p><p className="mt-0.5 text-[10px] text-slate-400">Acesso rápido pela tela inicial.</p></div>
      <button onClick={install} className="flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-[10px] font-black uppercase"><Download className="h-3.5 w-3.5" />Instalar</button>
      <button onClick={dismiss} aria-label="Fechar" className="p-1 text-slate-500"><X className="h-4 w-4" /></button>
    </div>
    {iosHelp && <div className="fixed inset-0 z-[100] flex items-end bg-black/75 p-3 backdrop-blur-sm" onClick={() => setIosHelp(false)}><div className="w-full rounded-3xl border border-white/10 bg-[#111827] p-6 text-white" onClick={event => event.stopPropagation()}><div className="flex justify-between"><h3 className="text-lg font-black">Instalar no iPhone</h3><button onClick={() => setIosHelp(false)}><X /></button></div><ol className="mt-5 space-y-4 text-sm text-slate-300"><li className="flex gap-3"><Share className="h-5 w-5 shrink-0 text-blue-400" /><span>Toque no botão <b className="text-white">Compartilhar</b> do Safari.</span></li><li className="flex gap-3"><span className="w-5 text-center font-black text-rose-400">+</span><span>Escolha <b className="text-white">Adicionar à Tela de Início</b>.</span></li><li className="flex gap-3"><span className="w-5 text-center font-black text-emerald-400">✓</span><span>Confirme em <b className="text-white">Adicionar</b>.</span></li></ol></div></div>}
  </>;
}
