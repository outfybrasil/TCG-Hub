/**
 * Notification helper — dispara notificações para usuários no banco.
 * Usar sempre do lado server (API routes, server actions).
 */

import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';

type NotificationType =
  | 'leilao_ganho'
  | 'lance_superado'
  | 'pedido_confirmado'
  | 'pedido_enviado'
  | 'sistema'
  | 'promo';

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
}

function getServiceClient() {
  return supabaseAdmin;
}

export async function sendNotification(payload: NotificationPayload) {
  const supabase = getServiceClient();
  const { error } = await supabase.from('notifications').insert({
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    href: payload.href ?? null,
  });
  if (error) console.error('[sendNotification] error:', error.message);
  return !error;
}

// ─── Helpers pré-formatados para cada evento ────────────────────────────────

export async function notifyAuctionWon(userId: string, cardName: string, finalBid: number, auctionId: string) {
  return sendNotification({
    userId,
    type: 'leilao_ganho',
    title: '🎉 Você arrematou!',
    body: `Você ganhou o leilão de "${cardName}" por R$ ${finalBid.toFixed(2).replace('.', ',')}. Efetue o pagamento para confirmar.`,
    href: `/leilao/${auctionId}`,
  });
}

export async function notifyBidOutbid(userId: string, cardName: string, newBid: number, auctionId: string) {
  return sendNotification({
    userId,
    type: 'lance_superado',
    title: 'Lance superado!',
    body: `Outro comprador superou seu lance em "${cardName}". Lance atual: R$ ${newBid.toFixed(2).replace('.', ',')}.`,
    href: `/leilao/${auctionId}`,
  });
}

export async function notifyOrderConfirmed(userId: string, purchaseId: string) {
  return sendNotification({
    userId,
    type: 'pedido_confirmado',
    title: 'Pedido confirmado ✅',
    body: `Seu pedido #${purchaseId.toUpperCase().slice(0, 8)} foi confirmado e está sendo preparado para envio.`,
    href: `/minha-conta/pedidos`,
  });
}

export async function notifyOrderShipped(userId: string, purchaseId: string, trackingCode?: string) {
  return sendNotification({
    userId,
    type: 'pedido_enviado',
    title: 'Pedido enviado 📦',
    body: trackingCode
      ? `Seu pedido #${purchaseId.toUpperCase().slice(0, 8)} foi despachado. Rastreio: ${trackingCode}.`
      : `Seu pedido #${purchaseId.toUpperCase().slice(0, 8)} foi despachado. Previsão: 2-5 dias úteis.`,
    href: `/minha-conta/pedidos`,
  });
}
