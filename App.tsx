import React, { useState, useEffect } from 'react';
import { ScriptEditor } from './components/ScriptEditor';
import { AudioPlayer } from './components/AudioPlayer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { composeMusicFromScript } from './services/geminiService';
import { LoadingState, Composition } from './types';

export default function App() {
  const [script, setScript] = useState('');
  const [composition, setComposition] = useState<Composition | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<string | null>(null);

  // API Key State
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const executeComposition = async (key: string, scriptText: string) => {
    setLoadingState(LoadingState.COMPOSING);
    setError(null);
    setComposition(null);

    try {
      const result = await composeMusicFromScript(scriptText, key);
      setComposition(result);
      setLoadingState(LoadingState.COMPLETE);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setLoadingState(LoadingState.ERROR);

      // If error implies auth failure, maybe clear key
      if (err.message.includes('403') || err.message.includes('key')) {
        localStorage.removeItem('gemini_api_key');
        setApiKey(null);
        setError("Invalid API Key. Please try again.");
      }
    }
  };

  const handleProcessClick = () => {
    if (!script.trim()) return;

    if (!apiKey) {
      setIsModalOpen(true);
    } else {
      executeComposition(apiKey, script);
    }
  };

  const handleKeySubmit = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setIsModalOpen(false);
    // Proceed immediately with composition
    executeComposition(key, script);
  };

  const handleResetKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey(null);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans selection:bg-accent/30 selection:text-white">
      <ApiKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleKeySubmit}
      />

      {/* Header */}
      <header className="max-w-4xl mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight mb-2">
            Sonic<span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-500">Script</span>
          </h1>
          <p className="text-slate-400 max-w-lg">
            AI Music Composer. Analyzes your text and writes a MIDI-style composition in the browser.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {apiKey ? (
            <button
              onClick={handleResetKey}
              className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
              title="Click to change API Key"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              API Key Set
            </button>
          ) : (
            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-500 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-600"></div>
              No API Key
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto flex flex-col gap-6">

        {/* Input Area */}
        <div className="h-[200px]">
          <ScriptEditor
            value={script}
            onChange={setScript}
            disabled={loadingState === LoadingState.COMPOSING}
          />
        </div>

        {/* Controls */}
        <div className="bg-midnight/50 border border-white/10 p-6 rounded-2xl backdrop-blur-sm flex flex-col gap-6 shadow-2xl">

          <div className="flex justify-center">
            <button
              onClick={handleProcessClick}
              id="compose-music-button"
              disabled={!script.trim() || loadingState === LoadingState.COMPOSING}
              className={`
                    w-full md:w-72 py-4 rounded-xl font-display font-bold text-lg shadow-lg transition-all
                    flex items-center justify-center gap-2
                    ${!script.trim() || loadingState === LoadingState.COMPOSING
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-accent to-purple-600 hover:scale-[1.02] text-white hover:shadow-accent/25'}
                `}
            >
              {loadingState === LoadingState.COMPOSING ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Composing Score...</span>
                </>
              ) : (
                <>
                  <span>Compose Music</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {/* Result Area */}
          {composition && (
            <div id="generated-score-section" className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-2 px-1">
                <label className="text-xs uppercase font-bold text-slate-500">Generated Score</label>
              </div>
              <AudioPlayer composition={composition} />
            </div>
          )}

          {error && (
            <div id="error-message" className="w-full bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-200 text-sm flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}