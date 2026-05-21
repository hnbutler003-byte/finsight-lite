import React from 'react';
import { ArrowUpRight, TrendingUp, Sparkles, Target } from 'lucide-react';
import './_group.css';

export function GraphRise() {
  return (
    <div className="gr-bg relative w-full h-[100dvh] overflow-hidden flex items-center justify-center font-sans text-white">
      {/* Grid Background */}
      <div className="gr-grid absolute inset-0 z-0 pointer-events-none" />

      {/* SVG Line Chart */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <svg
          className="w-full h-full"
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="gr-line-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#f97316" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="1" />
            </linearGradient>
            <filter id="gr-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          <path
            className="gr-path drop-shadow-2xl"
            d="M -50 550 Q 100 500 200 400 T 400 350 T 600 250 T 800 150 Q 900 100 1050 50"
            fill="none"
            stroke="url(#gr-line-gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="url(#gr-glow)"
          />

          {/* Data Points */}
          <g filter="url(#gr-glow)">
            <circle cx="200" cy="400" r="8" fill="#fff" className="gr-dot gr-dot-1" />
            <circle cx="400" cy="350" r="8" fill="#fff" className="gr-dot gr-dot-2" />
            <circle cx="600" cy="250" r="8" fill="#fff" className="gr-dot gr-dot-3" />
            <circle cx="800" cy="150" r="8" fill="#fff" className="gr-dot gr-dot-4" />
            <circle cx="1050" cy="50" r="12" fill="#f59e0b" className="gr-dot gr-dot-5" />
          </g>
        </svg>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto mt-[-10vh]">
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium tracking-wide text-amber-100 uppercase">Start Your Journey</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-6">
          <span className="gr-shimmer drop-shadow-lg">FinSight Lite</span>
        </h1>
        
        <p className="text-xl md:text-3xl font-medium text-white/90 max-w-2xl drop-shadow-md">
          Your Financial Future <br className="md:hidden" />
          <span className="text-amber-400">Starts Here</span> 🚀
        </p>

        {/* Floating Stat Cards */}
        <div className="absolute top-[60vh] md:top-auto md:bottom-[-20vh] w-full max-w-5xl px-4 flex flex-col md:flex-row gap-6 justify-center items-center pointer-events-none">
          
          <div className="gr-card gr-card-1 bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl w-full md:w-72 shadow-2xl transform md:-rotate-6 md:translate-y-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/30 flex items-center justify-center border border-violet-400/50">
                <TrendingUp className="w-6 h-6 text-violet-300" />
              </div>
              <div>
                <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Portfolio</p>
                <p className="text-2xl font-bold text-white">+24%</p>
              </div>
            </div>
            <p className="text-sm text-white/80">Growth this month ⭐</p>
          </div>

          <div className="gr-card gr-card-2 bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl w-full md:w-72 shadow-2xl z-10 transform md:-translate-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/30 flex items-center justify-center border border-amber-400/50">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Total Saved</p>
                <p className="text-2xl font-bold text-amber-400">$1,250</p>
              </div>
            </div>
            <p className="text-sm text-white/80">Emergency fund funded!</p>
          </div>

          <div className="gr-card gr-card-3 bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl w-full md:w-72 shadow-2xl transform md:rotate-6 md:translate-y-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/30 flex items-center justify-center border border-orange-400/50">
                <Target className="w-6 h-6 text-orange-300" />
              </div>
              <div>
                <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Goal</p>
                <p className="text-2xl font-bold text-white">College</p>
              </div>
            </div>
            <div className="w-full bg-black/20 rounded-full h-2 mb-2">
              <div className="bg-gradient-to-r from-orange-400 to-amber-400 h-2 rounded-full w-3/4"></div>
            </div>
            <p className="text-xs text-white/80 text-right">75% there</p>
          </div>

        </div>
      </div>
    </div>
  );
}
