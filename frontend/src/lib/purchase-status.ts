import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface PurchaseItem {
    id?: string;
    quantity?: number;
    is_auction?: boolean;
}

export interface PurchaseStatusRow {
    id: string;
    user_id?: string | null;
    status: string;
    mp_payment_id: string | null;
    items: PurchaseItem[] | null;
}

type TransitionResult = {
    changed: boolean;
    restored?: boolean;
};

async function restoreInventoryForItems(
    adminClient: typeof supabaseAdmin,
    items: PurchaseItem[] | null | undefined
) {
    for (const item of items || []) {
        if (!item.id || item.is_auction) {
            continue;
        }

        const { error } = await adminClient.rpc('restore_inventory', {
            p_item_id: item.id,
            p_quantity: item.quantity || 1,
        });

        if (error) {
            throw new Error(`Falha ao restaurar inventario do item ${item.id}: ${error.message}`);
        }
    }
}

async function decrementInventoryForItems(
    adminClient: typeof supabaseAdmin,
    items: PurchaseItem[] | null | undefined
) {
    for (const item of items || []) {
        if (!item.id || item.is_auction) {
            continue;
        }

        const { error } = await adminClient.rpc('decrement_inventory', {
            p_item_id: item.id,
            p_quantity: item.quantity || 1,
        });

        if (error) {
            throw new Error(`Falha ao baixar estoque do item ${item.id}: ${error.message}`);
        }
    }
}

export async function markPurchaseApproved(
    adminClient: typeof supabaseAdmin,
    purchaseId: string,
    paymentId: string
): Promise<TransitionResult> {
    const { data: updatedPurchase, error } = await adminClient
        .from('purchases')
        .update({
            status: 'approved',
            mp_payment_id: paymentId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseId)
        .neq('status', 'approved')
        .select('id, items')
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!updatedPurchase) {
        return { changed: false };
    }

    await decrementInventoryForItems(adminClient, updatedPurchase.items as PurchaseItem[] | null);

    return { changed: true };
}

export async function markPurchaseCanceled(
    adminClient: typeof supabaseAdmin,
    purchaseId: string,
    nextStatus: 'canceled' | 'refunded' = 'canceled'
): Promise<TransitionResult> {
    const approvedTransition = await adminClient
        .from('purchases')
        .update({
            status: nextStatus,
            updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseId)
        .eq('status', 'approved')
        .select('id, items')
        .maybeSingle();

    if (approvedTransition.error) {
        throw approvedTransition.error;
    }

    if (approvedTransition.data) {
        await restoreInventoryForItems(adminClient, approvedTransition.data.items as PurchaseItem[] | null);
        return { changed: true, restored: true };
    }

    const pendingTransition = await adminClient
        .from('purchases')
        .update({
            status: nextStatus,
            updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseId)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();

    if (pendingTransition.error) {
        throw pendingTransition.error;
    }

    return { changed: !!pendingTransition.data, restored: false };
}
