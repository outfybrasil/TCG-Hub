import type { Metadata } from 'next';

import CardProfileView from '@/components/CardProfileView';
import { supabaseAdmin } from '@/lib/supabase-admin';

type Props = { params: Promise<{ cardId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { cardId } = await params;
    const { data } = await supabaseAdmin.from('pokemon_cards')
        .select('name, set_name, local_id, image_url').eq('id', cardId).maybeSingle();
    if (!data) return { title: 'Carta não encontrada | TCG Megastore' };
    const title = `${data.name} ${data.local_id || ''} preço no Brasil | TCG Megastore`.replace(/\s+/g, ' ');
    const description = `Consulte preço, faixa justa, histórico e anúncios de ${data.name}, da coleção ${data.set_name || 'Pokémon TCG'}.`;
    return {
        title, description,
        alternates: { canonical: `/edicoes/card/${encodeURIComponent(cardId)}` },
        openGraph: { title, description, type: 'website', images: data.image_url ? [data.image_url] : [] },
    };
}

export default async function EditionCardPage({ params }: Props) {
    const { cardId } = await params;
    return <CardProfileView pokemonCardId={cardId} backLabel="Voltar para a edição" />;
}
