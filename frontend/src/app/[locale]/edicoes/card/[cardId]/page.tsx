'use client';

import React from 'react';
import CardProfileView from '@/components/CardProfileView';

/**
 * /edicoes/card/[cardId]
 * cardId = pokemon_cards.id (ex: "me03-001")
 */
export default function EditionCardPage({ params }: { params: Promise<{ cardId: string }> }) {
    const { cardId } = React.use(params);
    return <CardProfileView pokemonCardId={cardId} backLabel="Voltar para a edição" />;
}
