'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import CardProfileView from '@/components/CardProfileView';

/**
 * /marketplace/card/[id]
 * id = UUID de enriched_inventory — resolve para pokemon_cards.id
 * e então usa o CardProfileView unificado.
 */
export default function MarketplaceCardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const [pokemonCardId, setPokemonCardId] = useState<string | null>(null);
    const [inventoryImage, setInventoryImage] = useState<string | undefined>();
    const [inventoryName, setInventoryName] = useState<string | undefined>();
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const resolve = async () => {
            // Tenta buscar o card_id (ex: "me03-001") a partir do UUID do inventory
            const { data } = await supabase
                .from('enriched_inventory')
                .select('card_id, name, official_name, official_image_url, image_url')
                .eq('id', decodeURIComponent(id))
                .single();

            // Guarda a imagem e nome corretos do item específico
            const imgUrl = data?.official_image_url || data?.image_url || undefined;
            const displayName = data?.official_name || data?.name || undefined;
            if (imgUrl) setInventoryImage(imgUrl);
            if (displayName) setInventoryName(displayName);

            if (data?.card_id) {
                setPokemonCardId(data.card_id);
            } else if (data?.name) {
                // Fallback: busca pelo nome na tabela pokemon_cards
                const { data: cardRow } = await supabase
                    .from('pokemon_cards')
                    .select('id')
                    .ilike('name', data.name)
                    .limit(1)
                    .single();

                if (cardRow?.id) {
                    setPokemonCardId(cardRow.id);
                } else {
                    setNotFound(true);
                }
            } else {
                // Última opção: trata o id como pokemon_cards.id diretamente
                const { data: directCard } = await supabase
                    .from('pokemon_cards')
                    .select('id')
                    .eq('id', id)
                    .single();

                if (directCard?.id) {
                    setPokemonCardId(directCard.id);
                } else {
                    setNotFound(true);
                }
            }
        };

        if (id) void resolve();
    }, [id]);

    if (notFound) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <div className="surface-card p-12 text-center max-w-md w-full">
                    <h1 className="text-2xl font-black tracking-tight text-brand-text">Carta não encontrada</h1>
                    <p className="mt-3 text-sm text-brand-muted">
                        Este link pode estar desatualizado.
                    </p>
                </div>
            </div>
        );
    }

    if (!pokemonCardId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-12 w-12 rounded-full border-4 border-brand-surface-top border-t-brand-rose animate-spin" />
            </div>
        );
    }

    return <CardProfileView
        pokemonCardId={pokemonCardId}
        backLabel="Voltar"
        overrideImageUrl={inventoryImage}
        overrideName={inventoryName}
    />;
}
