import { redirect } from 'next/navigation';

/**
 * /marketplace/card/ sem um ID específico não faz sentido.
 * Redireciona automaticamente para o catálogo principal.
 */
export default function CardIndexPage() {
    redirect('/marketplace');
}
