import React, { useEffect, useState } from 'react';
import './_group.css';

const SYMBOLS = ['💰', '$', '¢', '₿', '⭐', '🚀', '📈'];

interface CoinProps {
  id: number;
  symbol: string;
  size: string;
  left: string;
  duration: string;
  delay: string;
  driftDuration: string;
  spinType: 'spin' | 'wobble' | 'none';
}

export function FloatingCoins() {
  const [coins, setCoins] = useState<CoinProps[]>([]);

  useEffect(() => {
    const newCoins = Array.from({ length: 35 }).map((_, i) => ({
      id: i,
      symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      size: `${Math.random() * 2.5 + 1.5}rem`,
      left: `${Math.random() * 100}vw`,
      duration: `${Math.random() * 12 + 6}s`,
      delay: `${Math.random() * 8}s`,
      driftDuration: `${Math.random() * 5 + 3}s`,
      spinType: ['spin', 'wobble', 'none'][Math.floor(Math.random() * 3)] as any,
    }));
    setCoins(newCoins);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden fc-animate-bg text-white font-sans flex items-center justify-center">
      {/* Background Floating Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {coins.map((coin) => (
          <div
            key={coin.id}
            className="absolute bottom-[-10%] whitespace-nowrap opacity-0 flex items-center justify-center font-bold text-amber-400 drop-shadow-lg"
            style={{
              left: coin.left,
              fontSize: coin.size,
              animation: `fc-float-up ${coin.duration} linear ${coin.delay} infinite`,
              willChange: 'transform, opacity'
            }}
          >
            <div
              style={{
                animation: `fc-drift ${coin.driftDuration} ease-in-out infinite alternate`,
              }}
            >
              <div
                style={{
                  animation: coin.spinType !== 'none' ? `fc-${coin.spinType} ${Math.random() * 4 + 2}s linear infinite` : 'none',
                  color: ['$', '¢', '₿'].includes(coin.symbol) ? '#f59e0b' : 'inherit',
                  textShadow: ['$', '¢', '₿'].includes(coin.symbol) ? '0 0 10px rgba(245,158,11,0.6)' : 'none',
                }}
              >
                {coin.symbol}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Central Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-6 max-w-3xl px-6">
        <div className="fc-bounce-in">
          <div className="inline-flex items-center justify-center px-5 py-2 mb-4 rounded-full bg-white/10 border border-white/20 backdrop-blur-lg shadow-[0_0_15px_rgba(139,92,246,0.5)]">
            <span className="text-sm font-bold text-violet-200 tracking-widest uppercase drop-shadow-[0_0_8px_rgba(139,92,246,0.9)]">
              Caribbean Edition
            </span>
          </div>
        </div>

        <h1 className="fc-bounce-in fc-delay-100 text-5xl md:text-7xl lg:text-8xl font-black tracking-tight flex flex-wrap items-center justify-center gap-4 drop-shadow-2xl">
          <span className="text-6xl md:text-8xl lg:text-9xl filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] animate-pulse">💰</span>
          <span className="bg-gradient-to-r from-white via-violet-200 to-amber-300 bg-clip-text text-transparent drop-shadow-lg">
            FinSight Lite
          </span>
        </h1>

        <p className="fc-bounce-in fc-delay-300 text-2xl md:text-4xl text-violet-100 font-bold tracking-wide drop-shadow-md">
          Master Your Money
        </p>
      </div>

      {/* Foreground gradient overlay for depth */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-[#1a1160]/80 via-transparent to-transparent" />
    </div>
  );
}
