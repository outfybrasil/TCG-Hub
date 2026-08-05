import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server-auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
    const liveId = new URL(request.url).searchParams.get('liveId');
    if (!liveId) return NextResponse.json({ error: 'Live obrigatória.' }, { status: 400 });
    const { data, error } = await supabaseAdmin.from('live_chat_messages').select('id,user_id,user_name,message,created_at').eq('live_id',liveId).is('deleted_at',null).order('created_at',{ascending:false}).limit(100);
    if (error) return NextResponse.json({error:error.message},{status:500});
    return NextResponse.json({messages:(data||[]).reverse()});
}

export async function POST(request: Request) {
    const auth=await requireAuthenticatedUser(request); if('response' in auth)return auth.response;
    const rate=checkRateLimit(`live-chat:${auth.user.id}`,8,10_000); if(!rate.allowed)return rateLimitResponse(rate.retryAfter);
    const body=await request.json().catch(()=>({})); const liveId=typeof body.liveId==='string'?body.liveId:''; const message=typeof body.message==='string'?body.message.trim().slice(0,300):'';
    if(!liveId||!message)return NextResponse.json({error:'Mensagem inválida.'},{status:400});
    const {data:ban}=await supabaseAdmin.from('live_chat_bans').select('user_id').eq('live_id',liveId).eq('user_id',auth.user.id).maybeSingle();
    if(ban)return NextResponse.json({error:'Você está silenciado nesta live.'},{status:403});
    const name=String(auth.user.user_metadata?.full_name||auth.user.email?.split('@')[0]||'Comprador').slice(0,120);
    const {data,error}=await supabaseAdmin.from('live_chat_messages').insert({live_id:liveId,user_id:auth.user.id,user_name:name,message}).select('id,user_id,user_name,message,created_at').single();
    if(error)return NextResponse.json({error:error.message},{status:500}); return NextResponse.json({message:data},{status:201});
}
