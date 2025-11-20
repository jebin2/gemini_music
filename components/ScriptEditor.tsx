import React from 'react';

interface ScriptEditorProps {
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="h-full flex flex-col bg-midnight/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          Script / Theme Input
        </h2>
        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
          {value.length} chars
        </span>
      </div>
      <textarea
        className="flex-1 w-full bg-black/20 border border-white/5 rounded-xl p-4 text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none transition-all font-sans text-lg leading-relaxed"
        placeholder="Describe the scene, paste your script, or simply list the emotions you want the music to evoke..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
};
