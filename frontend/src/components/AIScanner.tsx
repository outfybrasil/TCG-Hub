"use client";

import React, { useState } from 'react';

const AIScanner = () => {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<null | { name: string; grade: string; confidence: number }>(null);

    const startScan = () => {
        setScanning(true);
        setResult(null);
        setTimeout(() => {
            setScanning(false);
            setResult({
                name: "Charizard (Base Set)",
                grade: "NM (8.5)",
                confidence: 0.98
            });
        }, 3000);
    };

    return (
        <div className="relative rounded-2xl bg-zinc-900/40 border border-zinc-800 p-8 backdrop-blur-sm overflow-hidden">
            {/* Scanner Beam Animation */}
            {scanning && (
                <div className="absolute inset-0 bg-blue-500/5 transition-opacity">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scanner" />
                </div>
            )}

            <div className="flex flex-col items-center justify-center space-y-6">
                <div className="relative h-48 w-48 rounded-2xl border-2 border-dashed border-zinc-700 flex items-center justify-center transition-colors hover:border-blue-500">
                    {scanning ? (
                        <p className="text-blue-400 font-medium animate-pulse">Analisando...</p>
                    ) : (
                        <div className="text-center">
                            <span className="text-zinc-500 text-sm">Posicione a carta aqui</span>
                        </div>
                    )}
                </div>

                <button
                    onClick={startScan}
                    disabled={scanning}
                    className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white transition-all hover:bg-blue-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                    {scanning ? 'Escaneando...' : 'Iniciar Scan IA'}
                </button>

                {result && (
                    <div className="w-full mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 animate-fade-in">
                        <h4 className="text-green-400 font-bold mb-1">CARTA IDENTIFICADA</h4>
                        <div className="flex justify-between items-center">
                            <span className="text-zinc-100">{result.name}</span>
                            <span className="text-zinc-400 text-xs">{Math.round(result.confidence * 100)}% conf.</span>
                        </div>
                        <p className="text-zinc-400 text-sm mt-2">Condição sugerida: <span className="text-blue-400 font-bold">{result.grade}</span></p>
                    </div>
                )}
            </div>

            <style jsx>{`
        @keyframes scanner {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-scanner {
          animation: scanner 2s ease-in-out infinite alternate;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
        </div>
    );
};

export default AIScanner;
