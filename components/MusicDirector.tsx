import React from 'react';
import { MusicAnalysis } from '../types';

interface MusicDirectorProps {
  analysis: MusicAnalysis | null;
  isLoading: boolean;
}

export const MusicDirector: React.FC<MusicDirectorProps> = ({ analysis, isLoading }) => {
  const copyToClipboard = () => {
    if (analysis?.suggestedPrompt) {
      navigator.clipboard.writeText(analysis.suggestedPrompt);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-midnight/50 border border-white/10 rounded-2xl p-8 animate-pulse">
        <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-display">Analyzing sentiment & composition...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-midnight/50 border border-white/10 rounded-2xl p-8 border-dashed">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        <p className="text-slate-500 text-center max-w-sm">
          Enter your script and generate to receive a tailored musical composition guide.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-indigo-900/20 to-midnight border border-white/10 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <h2 className="text-xl font-display font-bold text-white">Sonic Direction</h2>
          <p className="text-slate-400 text-sm">AI-Generated Musical Context</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold border border-accent/20">
          {analysis.tempo}
        </div>
      </div>

      <div className="space-y-6 relative z-10 overflow-y-auto pr-2">
        {/* Mood & Genres */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">Mood</span>
            <span className="text-white font-medium">{analysis.mood}</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">Key Instruments</span>
            <div className="flex flex-wrap gap-1">
              {analysis.instruments.slice(0, 2).map((inst, i) => (
                <span key={i} className="text-xs text-slate-300 bg-black/30 px-1.5 py-0.5 rounded">{inst}</span>
              ))}
              {analysis.instruments.length > 2 && <span className="text-xs text-slate-500">+{analysis.instruments.length - 2}</span>}
            </div>
          </div>
        </div>

        {/* The Prompt */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">Music Generation Prompt</span>
            <button 
              onClick={copyToClipboard}
              className="text-xs text-accent hover:text-white transition-colors flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
          </div>
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-slate-300 leading-relaxed font-mono">
            {analysis.suggestedPrompt}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Use this prompt in tools like MusicLM, Suno, or Udio to generate the background track.
          </p>
        </div>

        {/* Visual Vibe */}
        <div className="p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border border-white/5">
          <span className="text-xs text-purple-300 uppercase font-semibold block mb-1">Visual Vibe</span>
          <p className="text-sm text-slate-300 italic">"{analysis.visualDescription}"</p>
        </div>
      </div>
    </div>
  );
};
