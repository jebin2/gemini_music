import React, { useState } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [inputKey, setInputKey] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      onSubmit(inputKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all scale-100">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-display font-bold text-white">Enter Gemini API Key</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          To generate music, this app requires a Google Gemini API key. 
          Your key is stored locally in your browser and is never sent to our servers.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs uppercase font-bold text-slate-500 mb-1.5 ml-1">API Key</label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent transition-all placeholder-slate-700 font-mono text-sm"
              autoFocus
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!inputKey.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-accent to-purple-600 hover:brightness-110 text-white rounded-xl font-bold text-sm shadow-lg shadow-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & Continue
            </button>
          </div>
        </form>
        
        <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:text-accent/80 underline underline-offset-2">
                Get an API Key from Google AI Studio
            </a>
        </div>
      </div>
    </div>
  );
};