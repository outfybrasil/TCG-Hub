import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/server-auth';
import {
  notifyOrderConfirmed,
  notifyOrderShipped,
  notifyAuctionWon,
  notifyBidOutbid,
} from '@/lib/notifications';

function getServiceClient() {
  return supabaseAdmin;
}

// POST /api/notifications/admin — dispara notificações para qualquer usuário (admin only)
export async function POST(req: NextRequest) {
  const supabase = getServiceClient();

  // Verifica que quem chamou é admin
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  const body = await req.json();
  const { type, userId, purchaseId, trackingCode, cardName, finalBid, auctionId, newBid, prevBidderId } = body;

  let success = false;

  switch (type) {
    case 'pedido_confirmado':
      success = await notifyOrderConfirmed(userId, purchaseId);
      break;
    case 'pedido_enviado':
      success = await notifyOrderShipped(userId, purchaseId, trackingCode);
      break;
    case 'leilao_ganho':
      success = await notifyAuctionWon(userId, cardName, finalBid, auctionId);
      break;
    case 'lance_superado':
      success = await notifyBidOutbid(prevBidderId, cardName, newBid, auctionId);
      break;
    default:
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
  }

  return NextResponse.json({ success });
}
