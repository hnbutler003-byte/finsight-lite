import React, { useMemo } from 'react';
import { Sparkles, Star } from 'lucide-react';
import './_group.css';

export function ParticleBurst() {
  const particles = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const angle = (i * (360 / 30)) * (Math.PI / 180);
      const distance = 150 + Math.random() * 200;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const delay = Math.random() * 0.5;
      const duration = 1 + Math.random() * 1;
      const scale = 0.5 + Math.random() * 1.5;
      const type = Math.random() > 0.6 ? 'star' : Math.random() > 0.3 ? 'coin' : 'circle';
      return { id: i, tx, ty, delay, duration, scale, type };
    });
  }, []);

  const sparkles = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const delay = Math.random() * 5;
      const duration = 3 + Math.random() * 4;
      const dx = (Math.random() - 0.5) * 50;
      const dy = -20 - Math.random() * 30;
      const maxOpacity = 0.3 + Math.random() * 0.5;
      return { id: i, x, y, delay, duration, dx, dy, maxOpacity };
    });
  }, []);

  const wordmark = "FinSight Lite".split("");

  return (
    <div className="w-full h-[100dvh] overflow-hidden relative pb-container flex items-center justify-center font-sans text-white">
      {/* Background Sparkles */}
      {sparkles.map((s) => (
        <div 
          key={s.id}
          className="pb-sparkle"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            '--delay': `${s.delay}s`,
            '--duration': `${s.duration}s`,
            '--dx': `${s.dx}px`,
            '--dy': `${s.dy}px`,
            '--max-opacity': s.maxOpacity,
          } as React.CSSProperties}
        >
          <Sparkles className="text-amber-300 w-3 h-3" />
        </div>
      ))}

      {/* Orbit Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="pb-ring pb-ring-1" />
        <div className="pb-ring pb-ring-2" />
        <div className="pb-ring pb-ring-3" />
      </div>

      {/* Burst Particles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        {particles.map((p) => (
          <div
            key={p.id}
            className="pb-particle"
            style={{
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              '--delay': `${p.delay}s`,
              '--duration': `${p.duration}s`,
              '--s': p.scale,
            } as React.CSSProperties}
          >
            {p.type === 'star' ? (
              <Star className="text-amber-400 w-4 h-4 fill-amber-400" />
            ) : p.type === 'coin' ? (
              <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
            )}
          </div>
        ))}
      </div>

      {/* Central Content */}
      <div className="relative z-20 flex flex-col items-center pb-logo-container">
        <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-6 pb-logo-glow shadow-[0_0_30px_rgba(139,92,246,0.3)]">
          <div className="text-4xl">🚀</div>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4 flex space-x-1">
          {wordmark.map((letter, i) => (
            <span 
              key={i} 
              className="pb-letter"
              style={{ '--delay': `${i * 0.05 + 0.5}s` } as React.CSSProperties}
            >
              {letter === " " ? "\u00A0" : letter}
            </span>
          ))}
        </h1>
        
        <p className="pb-subtitle text-xl text-violet-200/80 max-w-md text-center font-medium">
          Master your money. Build your future.
        </p>
      </div>
    </div>
  );
}
