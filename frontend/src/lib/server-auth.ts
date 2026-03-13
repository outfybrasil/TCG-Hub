import 'server-only';

import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

import { ADMIN_EMAILS } from '@/lib/auth-constants';
import { supabase, supabaseAdmin } from '@/lib/supabase';

type AuthSuccess = {
    isAdmin: boolean;
    token: string;
    user: User;
};

type AuthFailure = {
    response: NextResponse;
};

export type AuthResult = AuthSuccess | AuthFailure;

function extractBearerToken(request: Request) {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    return authHeader.slice('Bearer '.length).trim() || null;
}

function hasAdminEmail(email?: string | null) {
    return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

async function resolveIsAdmin(user: User) {
    const email = user.email || '';
    const metadataRole = typeof user.user_metadata?.role === 'string'
        ? user.user_metadata.role.toLowerCase()
        : null;

    if (metadataRole === 'admin' || hasAdminEmail(email)) {
        return true;
    }

    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Erro ao consultar perfil admin:', error);
        return false;
    }

    return !!profile?.is_admin;
}

export async function requireAuthenticatedUser(request: Request): Promise<AuthResult> {
    const token = extractBearerToken(request);

    if (!token) {
        return {
            response: NextResponse.json({ error: 'Nao autorizado. Token ausente.' }, { status: 401 }),
        };
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        return {
            response: NextResponse.json({ error: 'Nao autorizado. Sessao invalida.' }, { status: 401 }),
        };
    }

    return {
        user,
        token,
        isAdmin: await resolveIsAdmin(user),
    };
}

export async function requireAdmin(request: Request): Promise<AuthResult> {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) {
        return auth;
    }

    if (!auth.isAdmin) {
        return {
            response: NextResponse.json(
                { error: 'Acesso negado. Apenas administradores podem acessar este recurso.' },
                { status: 403 }
            ),
        };
    }

    return auth;
}
