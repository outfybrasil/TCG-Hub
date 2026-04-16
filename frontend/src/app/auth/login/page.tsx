"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Email not confirmed')) {
          router.push('/auth/verify-email');
          return;
        }
        throw signInError;
      }

      if (email === 'admin@tcghub.com.br') { // NOTE: Should I change this email too? User didn't ask.
        router.push('/admin/vendas');
      } else {
        router.push('/membro');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message === 'Invalid login credentials'
          ? 'Credenciais inválidas. Verifique seu e-mail e senha.'
          : err instanceof Error
          ? err.message
          : 'Erro desconhecido.';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      alert('Erro ao autenticar com Google. Tente novamente.');
    }
  };

  return (
    <div
      className="relative flex min-h-[90vh] items-center justify-center p-6 animate-fade-up overflow-hidden"
      style={{ background: '#0c1324' }}
    >
      {/* Atmospheric glows */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: '-10%', right: '-10%',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(225,29,72,0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: '-15%', left: '-10%',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex items-center gap-3">
            <div
              className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/5 p-1"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Image
                src="/tcg-icon.png"
                alt="TCG MEGASTORE"
                width={100}
                height={100}
                className="object-contain"
              />
            </div>
            <span className="text-2xl font-black uppercase tracking-tighter text-white">
              TCG<span style={{ color: '#e11d48' }}>MEGASTORE</span>
            </span>
          </Link>
        </div>

        {/* Glass card */}
        <div
          className="overflow-hidden p-8"
          style={{
            background: 'rgba(25,31,49,0.7)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1.5rem',
            boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5)',
          }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight text-white">
              Bem-vindo de volta.
            </h1>
            <p
              className="mt-2 text-sm"
              style={{ color: '#8b95b5' }}
            >
              Acesse sua coleção e continue de onde parou.
            </p>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="mb-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all"
            style={{
              background: '#fff',
              color: '#0f172a',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = '#f1f5f9')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = '#fff')
            }
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.9 3.32-2.06 4.44-1.28 1.24-3.24 2.16-5.78 2.16-4.52 0-8.24-3.48-8.24-8.04s3.72-8.04 8.24-8.04c2.44 0 4.28.96 5.6 2.24l2.32-2.32C18.44 2.56 15.64 1.2 12.48 1.2 6.48 1.2 1.6 6.08 1.6 12.08s4.88 10.88 10.88 10.88c3.24 0 5.68-1.04 7.6-3.04 2-2 2.64-4.8 2.64-7.08 0-.52-.04-1.04-.12-1.52H12.48z"
              />
            </svg>
            Continuar com Google
          </button>

          {/* Divider */}
          <div className="mb-6 flex items-center gap-4">
            <div
              className="h-px flex-1"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
            <span
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: '#8b95b5' }}
            >
              ou
            </span>
            <div
              className="h-px flex-1"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label
                className="block text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: '#8b95b5' }}
              >
                E-mail
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input-dark"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="block text-[10px] font-black uppercase tracking-[0.2em]"
                  style={{ color: '#8b95b5' }}
                >
                  Senha
                </label>
                <button
                  type="button"
                  className="text-[10px] font-black uppercase tracking-widest transition-colors hover:text-white"
                  style={{ color: '#ffb3b6' }}
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-dark pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm transition-colors"
                  style={{ color: '#8b95b5' }}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 mt-2"
              style={{ height: 52 }}
            >
              {loading ? 'Validando...' : 'Entrar na Conta'}
            </button>
          </form>

          <div
            className="mt-6 border-t pt-6 text-center"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <p
              className="text-[11px] font-bold"
              style={{ color: '#8b95b5' }}
            >
              Novo por aqui?{' '}
              <Link
                href="/auth/register"
                className="font-black transition-colors hover:text-white"
                style={{ color: '#ffb3b6' }}
              >
                Criar conta grátis
              </Link>
            </p>
          </div>
        </div>

        {/* Trust line */}
        <p
          className="mt-6 text-center text-[10px] font-bold uppercase tracking-wider"
          style={{ color: '#8b95b5', opacity: 0.5 }}
        >
          🔒 Autenticação segura via SSL · Seus dados protegidos
        </p>
      </div>
    </div>
  );
}
