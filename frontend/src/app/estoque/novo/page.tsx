"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';

interface TcgSet { id: string; name: string; }
interface PokemonCard { id: string; name: string; set_name: string; local_id: string; image_url: string; }

export default function NewAssetPage() {
    const [name, setName] = useState('');
    const [set, setSet] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [price, setPrice] = useState('0');
    const [quantity, setQuantity] = useState('1');
    const [imageUrl, setImageUrl] = useState('');
    const [grade, setGrade] = useState('NM');
    const [finish, setFinish] = useState('Normal');
    const [language, setLanguage] = useState('Português');
    const [isPromo, setIsPromo] = useState(false);
    const [notes, setNotes] = useState('');
    const [searching, setSearching] = useState(false);
    const [sets, setSets] = useState<TcgSet[]>([]);
    const [searchResults, setSearchResults] = useState<PokemonCard[]>([]);
    const [selectedSet, setSelectedSet] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [imageError, setImageError] = useState(false);
    const prevLangRef = React.useRef(language);

    const router = useRouter();

    // Mapping languages to TCGdex codes
    const langMap: Record<string, string> = {
        'Português': 'pt',
        'Inglês': 'en',
        'Japonês': 'ja'
    };

    // Update image when language changes
    React.useEffect(() => {
        const langChanged = prevLangRef.current !== language;
        prevLangRef.current = language;

        if (imageUrl && imageUrl.includes('assets.tcgdex.net')) {
            const currentLangCode = Object.values(langMap).find(code => imageUrl.includes(`/${code}/`));
            const targetCode = langMap[language];

            // Only force sync if language changed OR if there's no error detected yet
            if (langChanged || !imageError) {
                if (currentLangCode && targetCode && currentLangCode !== targetCode) {
                    const newUrl = imageUrl.replace(`/${currentLangCode}/`, `/${targetCode}/`);
                    if (newUrl !== imageUrl) {
                        setImageUrl(newUrl);
                        setImageError(false); // Reset error state on intentional swap
                    }
                }
            }
        }
    }, [language, imageUrl, imageError]);

    React.useEffect(() => {
        const fetchSets = async () => {
            const { data, error } = await supabase
                .from('pokemon_cards')
                .select('set_id, set_name')
                .order('set_name');

            if (!error && data) {
                const uniqueSets = Array.from(new Map(data.map(item => [item.set_id, { id: item.set_id, name: item.set_name }])).values());
                setSets(uniqueSets as any);
            }
        };
        fetchSets();
    }, []);

    const searchCards = async () => {
        if (!name && !selectedSet) return;
        setSearching(true);
        try {
            let query = supabase.from('pokemon_cards').select('*');
            if (name) query = query.ilike('name', `%${name}%`);
            if (selectedSet) query = query.eq('set_id', selectedSet);

            const { data, error } = await query.limit(20);
            if (!error && data) setSearchResults(data);
        } finally {
            setSearching(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase.from('inventory').insert({
                user_id: user.id,
                name,
                set,
                number: cardNumber,
                price: parseFloat(price),
                quantity: parseInt(quantity),
                image_url: imageUrl,
                condition: grade,
                grade,
                finish,
                language,
                is_promo: isPromo,
                notes
            });

            if (error) throw error;
            alert('Ativo salvo com sucesso!');
            router.push('/estoque');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar ativo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminGuard>
            <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-up">
                <div className="mb-12 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Novo <span className="text-rose-600">Ativo.</span></h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Adicionar item ao inventário global da TCG Mega Store</p>
                    </div>
                    <Link href="/estoque">
                        <button className="h-10 px-6 bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-slate-200 transition-all">Cancelar</button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Left: Search & Results (Span 2) */}
                    <div className="lg:col-span-2 space-y-10">
                        <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-[40px] shadow-sm space-y-8">
                            <div className="flex items-center gap-4 mb-4">
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">Identificação da Carta</h2>
                                <div className="h-[1px] flex-1 bg-slate-100" />
                            </div>

                            <div className="space-y-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buscar na Database TCGDex</label>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <input
                                        type="text"
                                        placeholder="Nome da TCG Card..."
                                        className="flex-1 h-14 px-5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-bold text-slate-900"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                    <select
                                        value={selectedSet}
                                        onChange={(e) => setSelectedSet(e.target.value)}
                                        className="flex-1 h-14 px-5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-bold text-slate-900 appearance-none cursor-pointer"
                                    >
                                        <option value="">Todas as Coleções</option>
                                        {sets.map(set => (
                                            <option key={set.id} value={set.id}>{set.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={searchCards}
                                        disabled={searching}
                                        className="h-14 px-8 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-600 transition-all disabled:opacity-50"
                                    >
                                        {searching ? 'Buscando...' : 'Buscar'}
                                    </button>
                                </div>
                            </div>

                            {searchResults.length > 0 && (
                                <div className="mb-8 p-6 bg-rose-50/50 rounded-3xl border border-rose-100/50 max-h-80 overflow-y-auto animate-fade-in">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {searchResults.map((card) => (
                                            <div
                                                key={card.id}
                                                onClick={() => {
                                                    setName(card.name);
                                                    setSet(card.set_name);
                                                    setCardNumber(card.local_id || '');
                                                    setImageUrl(card.image_url);
                                                }}
                                                className="bg-white border border-slate-200 p-4 rounded-3xl hover:border-rose-500 cursor-pointer transition-all hover:shadow-xl group"
                                            >
                                                <img src={card.image_url} alt={card.name} className="w-full h-auto rounded-xl mb-3 shadow-md group-hover:scale-105 transition-transform" />
                                                <p className="text-[10px] font-black text-slate-900 truncate">{card.name}</p>
                                                <p className="text-[8px] font-bold text-slate-400 truncate uppercase mt-0.5">{card.set_name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Carta</label>
                                    <input
                                        required value={name} onChange={e => setName(e.target.value)}
                                        placeholder="Charizard Base Set"
                                        className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expansão / Coleção</label>
                                    <input
                                        required value={set} onChange={e => setSet(e.target.value)}
                                        placeholder="Base Set 1999"
                                        className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número da Carta</label>
                                    <input
                                        value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                                        placeholder="001/102"
                                        className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Idioma</label>
                                    <select
                                        value={language} onChange={e => setLanguage(e.target.value)}
                                        className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm appearance-none cursor-pointer"
                                    >
                                        <option>Português</option>
                                        <option>Inglês</option>
                                        <option>Japonês</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-[40px] shadow-sm space-y-8">
                            <div className="flex items-center gap-4 mb-4">
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 whitespace-nowrap">Atributos de Mercado</h2>
                                <div className="h-[1px] flex-1 bg-slate-100" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço de Venda (R$)</label>
                                    <input
                                        type="number"
                                        required value={price} onChange={e => setPrice(e.target.value)}
                                        className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-lg text-rose-600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade em Estoque</label>
                                    <input
                                        type="number"
                                        required value={quantity} onChange={e => setQuantity(e.target.value)}
                                        className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado (Grade)</label>
                                    <select
                                        value={grade} onChange={e => setGrade(e.target.value)}
                                        className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm appearance-none cursor-pointer"
                                    >
                                        <option value="M">Mint (M)</option>
                                        <option value="NM">Near Mint (NM)</option>
                                        <option value="LP">Lightly Played (LP)</option>
                                        <option value="MP">Moderately Played (MP)</option>
                                        <option value="HP">Heavily Played (HP)</option>
                                        <option value="Dmg">Damaged (Dmg)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acabamento</label>
                                    <select
                                        value={finish} onChange={e => setFinish(e.target.value)}
                                        className="w-full h-14 px-5 bg-slate-50 border border-transparent rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-bold text-sm appearance-none cursor-pointer"
                                    >
                                        <option>Normal</option>
                                        <option>Foil / Holo</option>
                                        <option>Reverse Holo</option>
                                        <option>Full Art</option>
                                        <option>Alternative Art</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Informações Adicionais (Opcional)</label>
                                <textarea
                                    value={notes} onChange={e => setNotes(e.target.value)}
                                    rows={4}
                                    placeholder="Detalhes sobre a conservação, envio ou pacotes..."
                                    className="w-full p-6 bg-slate-50 border border-transparent rounded-[30px] focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all font-medium text-sm leading-relaxed"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right: Preview & Publish */}
                    <div className="space-y-8">
                        <div className="sticky top-12 space-y-8">
                            <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm space-y-6">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preview do Ativo</label>
                                <div className="aspect-[3/4] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[30px] overflow-hidden flex flex-col items-center justify-center p-8 group transition-all hover:border-rose-200 relative">
                                    {imageUrl ? (
                                        <div className="space-y-6 text-center animate-fade-in relative w-full">
                                            <img
                                                src={imageUrl}
                                                alt="Preview"
                                                onError={() => {
                                                    if (!imageError) {
                                                        setImageError(true);
                                                        // Fallback to original pt if current is not pt
                                                        if (!imageUrl.includes('/pt/')) {
                                                            const ptUrl = imageUrl.replace(/\/(ja|en)\//, '/pt/');
                                                            setImageUrl(ptUrl);
                                                        }
                                                    }
                                                }}
                                                className="w-full h-auto rounded-xl shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                                            />
                                            {imageError && (
                                                <div className="absolute inset-0 flex items-center justify-center p-4">
                                                    <div className="bg-rose-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full shadow-lg">
                                                        Imagem {language} indisponível - Usando Padrão
                                                    </div>
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <p className="font-black text-slate-900 tracking-tight text-xl leading-none">{name || '---'}</p>
                                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">{set || '---'}</p>
                                            </div>
                                            <div className="absolute bottom-4 right-4 bg-slate-900 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                                                {grade}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-4 opacity-40">
                                            <div className="text-5xl">🃏</div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aguardando seleção...</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">Preço Estipulado_</span>
                                        <span className="text-slate-900 text-sm">R$ {parseFloat(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">Qtd. Inicial_</span>
                                        <span className="text-slate-900">{quantity} UN</span>
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        disabled={loading || !imageUrl}
                                        className="w-full h-16 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-[25px] shadow-xl shadow-rose-500/20 hover:bg-rose-700 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0"
                                    >
                                        {loading ? 'PUBLICANDO...' : 'PUBLICAR NO INVENTÁRIO'}
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-900 rounded-[30px] text-center space-y-2">
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Informação Técnica</p>
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                    Ao publicar, este item ficará disponível para venda imediata no Marketplace global.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminGuard>
    );
}
