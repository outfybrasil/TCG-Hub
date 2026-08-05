'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BellRing, ChevronUp, Clock3, Crown, History, Radio, RefreshCw, Share2, ShieldCheck, Users, Wallet, Wifi, WifiOff, X } from 'lucide-react';
import LiveChat from '@/components/LiveChat';
import LiveSalesHistory from '@/components/LiveSalesHistory';
import { supabase } from '@/lib/supabase';

type LiveAuction = {
    id: string; title: string; status: string; video_url?: string | null; ends_at?: string | null;
    current_item_name?: string | null; current_item_type?: string | null; current_item_image?: string | null;
    current_item_description?: string | null; current_bid: number; starting_bid: number; min_bid_increment?: number;
    bid_count?: number; lot_number?: number | null; winning_user_id?: string | null; winning_user_name?: string | null; is_demo?: boolean;
};
type Bid = { id: string; lot_number?: number | null; user_id: string; user_name?: string | null; amount: number; created_at: string };

export default function LiveRoomPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [live, setLive] = useState<LiveAuction | null>(null);
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [user, setUser] = useState<{ id: string; name: string } | null>(null);
    const [balance, setBalance] = useState<number | null>(null);
    const [viewerCount, setViewerCount] = useState(1);
    const [now, setNow] = useState(0);
    const [customBid, setCustomBid] = useState('');
    const [pendingBid, setPendingBid] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [notice, setNotice] = useState('');
    const [isDesktop, setIsDesktop] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [videoReloadKey, setVideoReloadKey] = useState(0);
    const [videoLoading, setVideoLoading] = useState(true);
    const settlementRequested = useRef(false);
    const currentLot = useRef<number | null>(null);
    const hiddenAt = useRef<number | null>(null);

    const load = useCallback(async () => {
        const [{ data: auth }, liveResult] = await Promise.all([
            supabase.auth.getSession(),
            supabase.from('live_auctions').select('*').eq('id', id).single(),
        ]);
        if (liveResult.error || !liveResult.data) { router.replace('/lives'); return; }
        currentLot.current = Number(liveResult.data.lot_number || 0);
        const bidResult = await supabase.from('live_bids').select('id,lot_number,user_id,user_name,amount,created_at').eq('live_id', id).eq('lot_number', currentLot.current).order('created_at', { ascending: false }).limit(12);
        setLive(liveResult.data as LiveAuction);
        setBids((bidResult.data || []) as Bid[]);
        const sessionUser = auth.session?.user;
        if (sessionUser) {
            setUser({ id: sessionUser.id, name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Comprador' });
            const { data: credits } = await supabase.from('auction_credits').select('balance,locked').eq('user_id', sessionUser.id).maybeSingle();
            setBalance(credits ? Number(credits.balance) - Number(credits.locked) : 0);
        }
        setLoading(false);
    }, [id, router]);

    useEffect(() => { void load(); }, [load]);
    useEffect(() => {
        const media = window.matchMedia('(min-width: 1024px)');
        const syncViewport = () => setIsDesktop(media.matches);
        syncViewport();
        media.addEventListener('change', syncViewport);
        return () => media.removeEventListener('change', syncViewport);
    }, []);
    useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(timer); }, []);
    useEffect(() => {
        const reloadVideo = () => { setVideoLoading(true); setVideoReloadKey(key => key + 1); };
        const onVisibility = () => {
            if (document.hidden) hiddenAt.current = Date.now();
            else if (hiddenAt.current && Date.now() - hiddenAt.current > 15_000) reloadVideo();
        };
        window.addEventListener('online', reloadVideo);
        document.addEventListener('visibilitychange', onVisibility);
        return () => { window.removeEventListener('online', reloadVideo); document.removeEventListener('visibilitychange', onVisibility); };
    }, []);
    useEffect(() => {
        const room = supabase.channel(`live-room-${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_auctions', filter: `id=eq.${id}` }, ({ new: next }) => { const nextLot = Number(next.lot_number || 0); if (currentLot.current !== nextLot) setBids([]); currentLot.current = nextLot; setLive(next as LiveAuction); })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_bids', filter: `live_id=eq.${id}` }, ({ new: bid }) => { if (Number(bid.lot_number || 0) === currentLot.current) setBids((old) => [bid as Bid, ...old.filter((item) => item.id !== bid.id)].slice(0, 12)); })
            .subscribe((status) => setConnected(status === 'SUBSCRIBED'));
        return () => { void supabase.removeChannel(room); };
    }, [id]);
    useEffect(() => {
        const presence = supabase.channel(`live_presence_${id}`, { config: { presence: { key: user?.id || crypto.randomUUID() } } });
        presence.on('presence', { event: 'sync' }, () => setViewerCount(Math.max(1, Object.keys(presence.presenceState()).length)))
            .subscribe((status) => { if (status === 'SUBSCRIBED') void presence.track({ joined_at: new Date().toISOString() }); });
        return () => { void supabase.removeChannel(presence); };
    }, [id, user?.id]);

    const secondsLeft = Math.max(0, Math.ceil(((live?.ends_at ? new Date(live.ends_at).getTime() : 0) - now) / 1000));
    const waiting = !live?.ends_at || !live.current_item_name || live.current_item_name === 'Aguardando Lote...';
    const ended = live?.status === 'ENDED';
    const increment = Number(live?.min_bid_increment || 1);
    const minimumBid = Number(live?.current_bid || 0) + increment;
    const winning = !!user && live?.winning_user_id === user.id;
    const videoUrl = useMemo(() => normalizeVideoUrl(live?.video_url), [live?.video_url]);

    useEffect(() => {
        if (!live?.ends_at || live.is_demo || secondsLeft > 0 || settlementRequested.current) return;
        settlementRequested.current = true;
        fetch('/api/live/settle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ liveId: id }) })
            .finally(() => window.setTimeout(() => { settlementRequested.current = false; }, 10_000));
    }, [id, live?.ends_at, live?.is_demo, secondsLeft]);

    async function confirmBid() {
        if (!pendingBid || !live) return;
        if (!user) { router.push('/auth/login'); return; }
        setSubmitting(true); setNotice('');
        const { data, error } = await supabase.rpc('place_live_bid', { p_live_id: id, p_user_id: user.id, p_amount: pendingBid, p_user_name: user.name });
        const result = data as { success?: boolean; message?: string; current_bid?: number; ends_at?: string; bid_count?: number } | null;
        if (error || !result?.success) setNotice(result?.message || error?.message || 'Não foi possível registrar o lance.');
        else {
            setLive((old) => old ? { ...old, current_bid: Number(result.current_bid), ends_at: result.ends_at, bid_count: result.bid_count, winning_user_id: user.id, winning_user_name: user.name } : old);
            setCustomBid(''); setPendingBid(null); setNotice('Lance confirmado. Você está na frente!');
            const { data: credits } = await supabase.from('auction_credits').select('balance,locked').eq('user_id', user.id).maybeSingle();
            setBalance(credits ? Number(credits.balance) - Number(credits.locked) : 0);
        }
        setSubmitting(false);
    }

    function requestBid(amount: number) {
        if (!user) { router.push('/auth/login'); return; }
        if (waiting || secondsLeft <= 0 || amount < minimumBid) return setNotice(`O lance mínimo é ${money(minimumBid)}.`);
        if (!live.is_demo && (balance === null || amount > balance + (winning ? Number(live?.current_bid || 0) : 0))) return setNotice('Saldo livre insuficiente. Adicione créditos à carteira antes de dar este lance.');
        setNotice(''); setPendingBid(amount);
    }

    async function shareLive() {
        const shareData = { title: live?.title || 'Leilão ao vivo TCG Megastore', text: 'Acompanhe este leilão ao vivo na TCG Megastore!', url: window.location.href };
        try {
            if (navigator.share) await navigator.share(shareData);
            else { await navigator.clipboard.writeText(window.location.href); setNotice('Link da live copiado!'); }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            setNotice('Não foi possível compartilhar agora.');
        }
    }

    function reloadVideo() { setVideoLoading(true); setVideoReloadKey(key => key + 1); }

    if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#070d1f] text-sm font-black uppercase tracking-widest text-white/50"><Radio className="mr-3 animate-pulse text-rose-500" />Conectando à arena</div>;
    if (!live) return null;

    return <div className="min-h-dvh bg-[#070d1f] text-white lg:h-dvh lg:overflow-hidden">
        <header className="hidden h-14 items-center justify-between border-b border-white/10 bg-[#0c1324]/95 px-3 sm:px-5 lg:flex">
            <div className="flex min-w-0 items-center gap-3"><button onClick={() => router.push('/lives')} aria-label="Voltar" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><ArrowLeft className="h-4 w-4" /></button><span className="flex items-center gap-2 rounded-md bg-rose-600 px-2 py-1 text-[9px] font-black uppercase tracking-widest"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Ao vivo</span><h1 className="truncate text-xs font-black sm:text-sm">{live.title}</h1></div>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400"><button onClick={() => setShowHistory(true)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-white/5"><History className="h-3.5 w-3.5" />Arremates</button><button onClick={shareLive} className="flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-white/5"><Share2 className="h-3.5 w-3.5" />Compartilhar</button><span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{viewerCount}</span><span title={connected ? 'Tempo real conectado' : 'Reconectando'} className={connected ? 'text-emerald-400' : 'text-amber-400'}>{connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}</span></div>
        </header>

        <section className="live-mobile-room relative h-dvh overflow-hidden bg-black lg:hidden">
            {videoUrl ? <iframe key={`mobile-${videoReloadKey}`} src={videoUrl} onLoad={() => setVideoLoading(false)} title={`Transmissão ${live.title}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="absolute left-1/2 top-1/2 h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0" /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#070d1f] text-slate-600"><Radio className="h-12 w-12" /><p className="text-[10px] font-black uppercase tracking-[.25em]">Aguardando sinal de vídeo</p></div>}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/95" />

            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
                <button onClick={() => router.push('/lives')} aria-label="Voltar" className="rounded-full bg-black/35 p-2.5 backdrop-blur-md"><ArrowLeft className="h-5 w-5" /></button>
                <div className="flex items-center gap-2"><span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${live.is_demo ? 'bg-blue-600' : 'bg-rose-600'}`}><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />{live.is_demo ? 'Demo' : 'Ao vivo'}</span><span className="flex items-center gap-1 rounded-full bg-black/35 px-3 py-1.5 text-[10px] font-bold backdrop-blur-md"><Users className="h-3.5 w-3.5" />{viewerCount}</span></div>
                <button onClick={reloadVideo} title="Recarregar somente o vídeo" aria-label="Recarregar vídeo" className={`rounded-full bg-black/35 p-2.5 backdrop-blur-md ${videoLoading ? 'text-amber-400' : connected ? 'text-emerald-400' : 'text-amber-400'}`}><RefreshCw className={`h-5 w-5 ${videoLoading ? 'animate-spin' : ''}`} /></button>
            </div>

            <div className="live-mobile-auction absolute bottom-0 left-0 right-16 z-10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {!waiting && !ended && <>
                    <div className="mb-3 flex items-end gap-3">
                        {live.current_item_image && <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-black/40 backdrop-blur"><img src={live.current_item_image} alt={live.current_item_name || 'Lote'} className="h-full w-full object-contain" /></div>}
                        <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-rose-300">{live.current_item_type || 'Lote em disputa'}</p><h2 className="line-clamp-2 text-lg font-black leading-tight drop-shadow-lg">{live.current_item_name}</h2>{live.current_item_description && <p className="mt-1 line-clamp-1 text-[10px] text-white/65">{live.current_item_description}</p>}</div>
                    </div>
                    <div className="mb-2 flex items-center gap-2"><div className="rounded-xl bg-black/45 px-3 py-2 backdrop-blur-md"><p className="text-[8px] font-black uppercase tracking-widest text-white/55">Maior lance</p><p className="text-xl font-black text-amber-300">{money(Number(live.current_bid))}</p></div><div className={`rounded-xl px-3 py-2 backdrop-blur-md ${secondsLeft <= 10 ? 'bg-rose-600/80' : 'bg-black/45'}`}><p className="text-[8px] font-black uppercase tracking-widest text-white/55">Termina em</p><p className="font-mono text-xl font-black">{formatTime(secondsLeft)}</p></div>{winning && <span className="rounded-xl bg-emerald-500/80 px-3 py-3 text-[9px] font-black uppercase">Você lidera</span>}</div>
                    {live.is_demo && <p className="mb-2 inline-flex rounded-full bg-blue-600/80 px-3 py-1 text-[9px] font-bold">Teste sem cobrança</p>}
                    {!user && <button onClick={() => router.push('/auth/login')} className="pointer-events-auto mb-2 w-full rounded-xl border border-white/20 bg-black/55 py-2.5 text-[10px] font-black uppercase tracking-widest backdrop-blur">Entre para dar lances</button>}
                    <div className="grid grid-cols-3 gap-2">{[1, 2, 5].map((multiplier) => { const value = Number(live.current_bid || 0) + increment * multiplier; return <button key={multiplier} disabled={!user || secondsLeft <= 0 || submitting} onClick={() => requestBid(value)} className="pointer-events-auto rounded-xl border border-white/20 bg-rose-600/90 py-3 text-[11px] font-black shadow-lg backdrop-blur active:scale-95 disabled:opacity-40">{money(value)}</button>; })}</div>
                    {notice && <p className="mt-2 rounded-lg bg-black/55 px-3 py-2 text-center text-[10px] text-amber-200 backdrop-blur">{notice}</p>}
                </>}
                {(waiting || ended) && <div className="rounded-2xl bg-black/45 p-4 backdrop-blur-md"><p className="text-lg font-black">{ended ? 'Transmissão encerrada' : 'Próximo lote em preparação'}</p><p className="mt-1 text-xs text-white/60">{ended ? 'Obrigado por acompanhar.' : 'O apresentador iniciará a próxima disputa em breve.'}</p></div>}
            </div>

            <div className="live-mobile-actions absolute bottom-6 right-3 z-20 flex w-14 flex-col items-center gap-3 pb-[env(safe-area-inset-bottom)]">
                <div className="w-28 -translate-x-7 rounded-2xl bg-black/50 px-2 py-2 text-center backdrop-blur-md" title={live.winning_user_name || 'Sem líder'}><Crown className={`mx-auto h-4 w-4 ${live.winning_user_id ? 'text-amber-300' : 'text-white/35'}`} /><p className="mt-1 line-clamp-2 text-[8px] font-black leading-tight text-white">{live.winning_user_name || 'Sem líder'}</p></div>
                <button onClick={shareLive} aria-label="Compartilhar live" className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 backdrop-blur active:scale-95"><Share2 className="h-5 w-5" /></button>
                <button onClick={() => setShowHistory(true)} aria-label="Histórico de arremates" className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 backdrop-blur active:scale-95"><History className="h-5 w-5" /></button>
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-black/45 text-[9px] font-black backdrop-blur"><ChevronUp className="h-4 w-4 text-emerald-400" />{live.bid_count || bids.length}</div>
            </div>
            {!isDesktop && <div className="live-mobile-chat pointer-events-auto absolute left-3 right-20 z-30">
                <LiveChat liveId={id} currentUser={user} variant="overlay" />
            </div>}
        </section>

        <main className="hidden lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(320px,1.15fr)_minmax(360px,.85fr)_320px] lg:grid">
            <section className="relative min-h-[32vh] overflow-hidden border-b border-white/10 bg-black lg:min-h-0 lg:border-b-0 lg:border-r">
                {videoUrl ? <iframe key={`desktop-${videoReloadKey}`} src={videoUrl} onLoad={() => setVideoLoading(false)} title={`Transmissão ${live.title}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="absolute inset-0 h-full w-full border-0" /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-600"><Radio className="h-12 w-12" /><p className="text-[10px] font-black uppercase tracking-[.25em]">Aguardando sinal de vídeo</p></div>}
                <div className="absolute bottom-3 left-3 flex gap-2"><span className="rounded-lg bg-black/70 px-2 py-1 text-[9px] font-bold backdrop-blur">{connected ? 'Sincronizado' : 'Reconectando...'}</span><span className="rounded-lg bg-black/70 px-2 py-1 text-[9px] font-bold backdrop-blur">Anti-sniper +15s</span><button onClick={reloadVideo} className="flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-[9px] font-bold backdrop-blur"><RefreshCw className={`h-3 w-3 ${videoLoading ? 'animate-spin' : ''}`} />Recarregar vídeo</button></div>
            </section>

            <section className="flex min-h-0 flex-col bg-[radial-gradient(circle_at_top,rgba(225,29,72,.10),transparent_45%)]">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {ended ? <State icon="📺" title="Transmissão encerrada" text="Os arremates continuarão disponíveis na sua conta." /> : waiting ? <State icon="🔨" title="Próximo lote em preparação" text="Você verá o item aqui assim que o apresentador iniciar a disputa." /> : <>
                        <div className="flex items-start gap-4"><div className="flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:h-36 sm:w-28">{live.current_item_image ? <img src={live.current_item_image} alt={live.current_item_name || 'Lote'} className="h-full w-full object-contain" /> : <span className="text-4xl">🎴</span>}</div><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.2em] text-rose-400">Lote em disputa · {live.current_item_type || 'TCG'}</p><h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{live.current_item_name}</h2>{live.current_item_description && <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">{live.current_item_description}</p>}</div></div>
                        <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-amber-300">Maior lance</p><p className="mt-1 text-3xl font-black text-amber-300">{money(Number(live.current_bid))}</p><p className="mt-1 text-[10px] text-amber-100/60">{live.bid_count || bids.length} lance(s)</p></div><div className={`rounded-2xl border p-4 ${secondsLeft <= 10 ? 'border-rose-400/40 bg-rose-500/15' : 'border-white/10 bg-white/5'}`}><p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400"><Clock3 className="h-3 w-3" />Encerra em</p><p className={`mt-1 font-mono text-3xl font-black ${secondsLeft <= 10 ? 'animate-pulse text-rose-400' : ''}`}>{formatTime(secondsLeft)}</p><p className="mt-1 text-[10px] text-slate-500">horário do servidor</p></div></div>
                        <div className={`mt-3 rounded-xl border px-4 py-3 text-xs font-bold ${winning ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/[.03] text-slate-400'}`}>{winning ? '👑 Você está ganhando este lote.' : live.winning_user_name ? `Na frente: ${live.winning_user_name}` : 'Seja o primeiro a dar um lance.'}</div>
                        <div className="mt-5"><div className="flex items-center justify-between"><h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Últimos lances</h3><span className="text-[9px] text-slate-600">atualização automática</span></div><div className="mt-2 space-y-1">{bids.slice(0, 5).map((bid, index) => <div key={bid.id} className="flex items-center justify-between rounded-xl bg-white/[.03] px-3 py-2 text-xs"><span className="truncate text-slate-400">{index === 0 && <ChevronUp className="mr-1 inline h-3 w-3 text-emerald-400" />}{bid.user_id === user?.id ? 'Você' : bid.user_name || 'Comprador'}</span><span className="font-black text-white">{money(Number(bid.amount))}</span></div>)}{bids.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-600">Nenhum lance neste lote.</p>}</div></div>
                    </>}
                </div>

                {!ended && <div className="border-t border-white/10 bg-[#0c1324] p-4"><div className="mb-3 flex items-center justify-between"><span className="flex items-center gap-2 text-[10px] font-bold text-slate-400"><Wallet className="h-4 w-4" />Saldo livre: <b className="text-emerald-400">{balance === null ? 'Entre para consultar' : money(balance)}</b></span><span className="text-[9px] text-slate-500">mínimo {money(minimumBid)}</span></div><div className="grid grid-cols-3 gap-2">{[1, 2, 5].map((multiplier) => { const value = Number(live.current_bid || 0) + increment * multiplier; return <button key={multiplier} disabled={waiting || secondsLeft <= 0 || submitting} onClick={() => requestBid(value)} className="rounded-xl border border-rose-400/25 bg-rose-500/10 py-3 text-xs font-black text-rose-200 hover:bg-rose-500/20 disabled:opacity-30">{money(value)}</button>; })}</div><div className="mt-2 flex overflow-hidden rounded-xl border border-white/10 bg-white/5"><span className="px-3 py-3 text-xs font-bold text-slate-500">R$</span><input inputMode="decimal" value={customBid} onChange={(event) => setCustomBid(event.target.value)} placeholder="Outro valor" className="min-w-0 flex-1 bg-transparent px-1 text-sm font-bold outline-none" /><button onClick={() => requestBid(Number(customBid.replace(',', '.')))} className="bg-white/10 px-4 text-[10px] font-black uppercase hover:bg-white/15">Revisar</button></div>{notice && <p className="mt-2 text-center text-xs text-amber-300">{notice}</p>}</div>}
            </section>

            <aside className="hidden min-h-0 flex-col border-l border-white/10 bg-[#070d1f] lg:flex"><div className="flex h-12 items-center justify-between border-b border-white/10 px-4"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chat da live</span></div><div className="min-h-0 flex-1 p-2">{isDesktop && <LiveChat liveId={id} currentUser={user} />}</div></aside>
        </main>

        {pendingBid !== null && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"><div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#191f31] p-6"><div className="flex items-center gap-3 text-emerald-400"><ShieldCheck className="h-6 w-6" /><h3 className="text-lg font-black text-white">Confirmar lance</h3></div><p className="mt-4 text-sm leading-6 text-slate-400">Você está oferecendo <b className="text-xl text-white">{money(pendingBid)}</b>. Esse valor ficará reservado até você ser superado ou o lote ser concluído.</p><div className="mt-4 rounded-xl bg-amber-400/10 p-3 text-[10px] text-amber-200">Lances são compromissos de compra e não podem ser desfeitos durante a disputa.</div><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => setPendingBid(null)} disabled={submitting} className="rounded-xl bg-white/5 py-3 text-xs font-black text-slate-400">Cancelar</button><button onClick={confirmBid} disabled={submitting} className="rounded-xl bg-rose-600 py-3 text-xs font-black text-white disabled:opacity-50">{submitting ? 'Registrando...' : 'Confirmar lance'}</button></div></div></div>}
        {showHistory && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center"><div className="flex max-h-[80dvh] w-full max-w-lg flex-col rounded-3xl border border-white/10 bg-[#111827] shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 p-5"><div><h3 className="font-black">Histórico de arremates</h3><p className="mt-1 text-[10px] text-slate-500">Horário oficial do servidor · Brasília</p></div><button onClick={() => setShowHistory(false)} className="rounded-full bg-white/5 p-2" aria-label="Fechar histórico"><X className="h-5 w-5" /></button></div><div className="overflow-y-auto p-4"><LiveSalesHistory liveId={id} /></div></div></div>}
        <style jsx global>{`nav, footer, .promo-bar { display:none!important } body { overflow:hidden!important; background:#070d1f!important; padding-bottom:0!important }`}</style>
    </div>;
}

function State({ icon, title, text }: { icon: string; title: string; text: string }) { return <div className="flex h-full min-h-80 flex-col items-center justify-center px-6 text-center"><span className="text-5xl">{icon}</span><h2 className="mt-5 text-2xl font-black">{title}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{text}</p><BellRing className="mt-6 h-5 w-5 text-rose-400" /></div>; }
function money(value: number) { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
function normalizeVideoUrl(value?: string | null) {
    if (!value) return null;
    try {
        const url = new URL(value);
        if (url.hostname === 'twitch.tv' || url.hostname === 'www.twitch.tv') return `https://player.twitch.tv/?channel=${url.pathname.split('/').filter(Boolean)[0]}&parent=${window.location.hostname}`;
        const playerParams = `autoplay=1&mute=1&playsinline=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`;
        if (url.hostname === 'youtu.be') return `https://www.youtube.com/embed/${url.pathname.slice(1)}?${playerParams}`;
        if (url.hostname.includes('youtube.com')) { const id = url.searchParams.get('v'); return id ? `https://www.youtube.com/embed/${id}?${playerParams}` : value; }
        return value;
    } catch { return null; }
}
