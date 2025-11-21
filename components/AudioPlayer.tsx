import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Composition, Note } from '../types';
import { generateMidiUrl } from '../utils/midiExport';
import { audioBufferToWav } from '../utils/wavExport';

interface AudioPlayerProps {
    composition: Composition | null;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ composition }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [progress, setProgress] = useState(0);
    const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());

    const audioCtxRef = useRef<AudioContext | null>(null);
    const masterGainRef = useRef<GainNode | null>(null);
    const schedulerTimerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const playingNodesRef = useRef<Function[]>([]); // Array of stop functions

    // --- Sound Synthesis Helpers ---

    const getFreq = (note: string) => {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const normNote = note.replace('b', '#').replace('Db', 'C#').replace('Eb', 'D#').replace('Gb', 'F#').replace('Ab', 'G#').replace('Bb', 'A#');
        const regex = /([A-G]#?)(\d)/;
        const match = normNote.match(regex);
        if (!match) return 440;
        const semitone = notes.indexOf(match[1]);
        const octave = parseInt(match[2]);
        const midi = semitone + (octave + 1) * 12;
        return 440 * Math.pow(2, (midi - 69) / 12);
    };

    // Shared synthesis logic for both Realtime and Offline contexts
    const scheduleSound = (
        ctx: BaseAudioContext,
        dest: AudioNode,
        instrument: string,
        freq: number,
        time: number,
        dur: number,
        vol: number,
        trackStopFn?: (fn: Function) => void
    ) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filterNode = ctx.createBiquadFilter();

        // Defaults
        let attack = 0.02;
        let release = 0.1;
        let sustain = 0.6;
        let type: OscillatorType = 'triangle';

        // --- Instrument Logic ---

        if (instrument === 'drums') {
            // Drum Synthesis
            // Heuristic: Low freq (<100Hz) = Kick, Mid (<300Hz) = Snare, High = Hat
            if (freq < 100) {
                // Kick
                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, time);
                osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

                gainNode.gain.setValueAtTime(0.8 * vol, time);
                gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

                osc.connect(gainNode);
                gainNode.connect(dest);
                osc.start(time);
                osc.stop(time + 0.3);
            } else if (freq < 300) {
                // Snare (approximated with noise burst + tone)
                // Since creating noise buffer is expensive repeatedly, we use a simple tonal snap here or oscillator noise
                // For simplicity in this constraint, we use a high triangle with fast decay + filter sweep
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, time);
                osc.frequency.linearRampToValueAtTime(100, time + 0.1);

                // Filter to make it snappy
                filterNode.type = 'bandpass';
                filterNode.frequency.value = 1000;

                gainNode.gain.setValueAtTime(0.6 * vol, time);
                gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

                osc.connect(filterNode);
                filterNode.connect(gainNode);
                gainNode.connect(dest);
                osc.start(time);
                osc.stop(time + 0.2);
            } else {
                // Hi-hat (High square wave + highpass, metallic sound)
                osc.type = 'square';
                // Randomize freq slightly for variety or fixed
                osc.frequency.value = 800; // Fundamental doesn't matter much with high filter

                filterNode.type = 'highpass';
                filterNode.frequency.value = 7000;

                gainNode.gain.setValueAtTime(0.3 * vol, time);
                gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

                osc.connect(filterNode);
                filterNode.connect(gainNode);
                gainNode.connect(dest);
                osc.start(time);
                osc.stop(time + 0.1);
            }

            // Drums handle their own stopping mostly, but we return clean up if needed
            if (trackStopFn) trackStopFn(() => { try { osc.stop(); } catch (e) { } });
            return;
        }

        // Melodic Instruments
        if (instrument === 'guitar') {
            type = 'sawtooth';
            attack = 0.005;
            release = 0.3;
            sustain = 0.2;

            // Guitar Filter Pluck
            filterNode.type = 'lowpass';
            filterNode.frequency.setValueAtTime(3000, time);
            filterNode.frequency.exponentialRampToValueAtTime(300, time + 0.2); // Pluck effect
            filterNode.Q.value = 3;
            gainNode.gain.value = 0.4 * vol;
        } else if (instrument === 'pad') {
            type = 'sawtooth';
            attack = 0.4;
            release = 0.8;
            sustain = 0.8;

            filterNode.type = 'lowpass';
            filterNode.frequency.setValueAtTime(400, time);
            filterNode.frequency.linearRampToValueAtTime(1200, time + dur); // Sweep
            gainNode.gain.value = 0.3 * vol;
        } else if (instrument === 'bass') {
            type = 'square';
            attack = 0.02;
            release = 0.1;
            sustain = 0.8;

            filterNode.type = 'lowpass';
            filterNode.frequency.value = 400;
            gainNode.gain.value = 0.6 * vol;
        } else if (instrument === 'bells') {
            type = 'sine';
            attack = 0.01;
            release = 0.5;
            sustain = 0.1;

            filterNode.type = 'highpass';
            filterNode.frequency.value = 500;
            gainNode.gain.value = 0.4 * vol;
        } else if (instrument === 'synth') {
            type = 'triangle';
            attack = 0.02;
            release = 0.1;
            sustain = 0.6;

            filterNode.type = 'lowpass';
            filterNode.frequency.value = 2000;
            gainNode.gain.value = 0.4 * vol;
        } else {
            // Piano default
            type = 'triangle';
            filterNode.type = 'lowpass';
            filterNode.frequency.value = 1500;
            gainNode.gain.value = 0.5 * vol;
        }

        osc.type = type;
        osc.frequency.value = freq;

        // Connect Graph
        osc.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(dest);

        // Volume Envelope
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(gainNode.gain.value, time + attack);
        gainNode.gain.setValueAtTime(gainNode.gain.value * sustain, time + attack + (dur * 0.4));
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + dur + release);

        osc.start(time);
        osc.stop(time + dur + release + 0.1);

        if (trackStopFn) {
            trackStopFn(() => { try { osc.stop(); } catch (e) { } });
        }
    };

    // --- Setup & Playback ---

    const setupAudioChain = (ctx: AudioContext | OfflineAudioContext): { master: GainNode, cleanup?: () => void } => {
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.5;

        // Simple Reverb via impulse
        const convolver = ctx.createConvolver();
        const rate = ctx.sampleRate;
        const length = rate * 2.0;
        const impulse = ctx.createBuffer(2, length, rate);
        const impL = impulse.getChannelData(0);
        const impR = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
            const n = i / length;
            impL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, 2.0);
            impR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, 2.0);
        }
        convolver.buffer = impulse;

        const reverbGain = ctx.createGain();
        reverbGain.gain.value = 0.3;

        masterGain.connect(ctx.destination); // Dry
        masterGain.connect(convolver);
        convolver.connect(reverbGain);
        reverbGain.connect(ctx.destination); // Wet

        return { master: masterGain };
    };

    const playComposition = async () => {
        if (!composition) return;

        if (!audioCtxRef.current) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioCtxRef.current = ctx;
            const { master } = setupAudioChain(ctx);
            masterGainRef.current = master;
        }

        if (audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume();
        }

        setIsPlaying(true);
        const ctx = audioCtxRef.current;
        startTimeRef.current = ctx.currentTime;

        const secondsPerBeat = 60 / composition.bpm;
        const totalDurationSecs = composition.totalDurationBeats * secondsPerBeat;

        composition.tracks.forEach((track) => {
            track.notes.forEach((note) => {
                const freq = getFreq(note.pitch);
                const startTime = ctx.currentTime + (note.startTime * secondsPerBeat);
                const duration = note.duration * secondsPerBeat;

                scheduleSound(
                    ctx,
                    masterGainRef.current!,
                    track.instrument,
                    freq,
                    startTime,
                    duration,
                    note.velocity,
                    (stopFn) => playingNodesRef.current.push(stopFn)
                );
            });
        });

        // UI Loop
        const updateProgress = () => {
            if (!audioCtxRef.current) return;
            const now = audioCtxRef.current.currentTime;
            const elapsed = now - startTimeRef.current;
            const currentBeat = elapsed / secondsPerBeat;

            const p = Math.min(100, (elapsed / totalDurationSecs) * 100);
            setProgress(p);

            const newActiveNotes = new Set<string>();
            composition.tracks.forEach((track, tIdx) => {
                track.notes.forEach((note, nIdx) => {
                    if (currentBeat >= note.startTime && currentBeat < (note.startTime + note.duration)) {
                        newActiveNotes.add(`${tIdx}-${nIdx}`);
                    }
                });
            });
            setActiveNotes(newActiveNotes);

            if (elapsed < totalDurationSecs + 1 && isPlaying) {
                schedulerTimerRef.current = requestAnimationFrame(updateProgress);
            } else if (elapsed >= totalDurationSecs + 1) {
                setIsPlaying(false);
                setProgress(100);
                setActiveNotes(new Set());
            }
        };
        schedulerTimerRef.current = requestAnimationFrame(updateProgress);
    };

    const stopPlaying = () => {
        if (audioCtxRef.current) {
            audioCtxRef.current.suspend();
            audioCtxRef.current = null;
        }
        if (schedulerTimerRef.current) {
            cancelAnimationFrame(schedulerTimerRef.current);
        }
        playingNodesRef.current.forEach(stop => stop());
        playingNodesRef.current = [];
        setIsPlaying(false);
        setProgress(0);
        setActiveNotes(new Set());
    };

    const handleDownloadMidi = () => {
        if (!composition) return;
        const url = generateMidiUrl(composition);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${composition.mood.replace(/\s+/g, '_')}_score.mid`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadWav = async () => {
        if (!composition) return;
        setIsRendering(true);

        try {
            // 1. Setup Offline Context
            const sampleRate = 44100;
            const secondsPerBeat = 60 / composition.bpm;
            // Add 2 seconds for tail/reverb decay
            const duration = (composition.totalDurationBeats * secondsPerBeat) + 2;

            const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
            const { master } = setupAudioChain(offlineCtx);

            // 2. Schedule everything
            composition.tracks.forEach((track) => {
                track.notes.forEach((note) => {
                    const freq = getFreq(note.pitch);
                    const startTime = note.startTime * secondsPerBeat;
                    const dur = note.duration * secondsPerBeat;

                    scheduleSound(offlineCtx, master, track.instrument, freq, startTime, dur, note.velocity);
                });
            });

            // 3. Render
            const renderedBuffer = await offlineCtx.startRendering();

            // 4. Convert to WAV and Download
            const blob = audioBufferToWav(renderedBuffer);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${composition.mood.replace(/\s+/g, '_')}_audio.wav`;
            a.click();
            URL.revokeObjectURL(url);

        } catch (e) {
            console.error("Rendering failed", e);
            alert("Failed to generate audio file.");
        } finally {
            setIsRendering(false);
        }
    };

    useEffect(() => {
        return () => stopPlaying();
    }, [composition]);

    if (!composition) return null;

    return (
        <div className="bg-white/5 rounded-xl p-6 border border-white/10 flex flex-col gap-6 shadow-inner relative overflow-hidden group">
            {/* Decorative glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"></div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between z-10 gap-4">
                <div>
                    <h3 className="text-white font-display font-bold text-xl flex items-center gap-2">
                        {composition.mood} Theme
                        <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 text-xs font-mono border border-white/5">{composition.key}</span>
                    </h3>
                    <div className="text-slate-400 text-xs flex gap-3 mt-1 font-mono uppercase tracking-wider">
                        <span>{composition.bpm} BPM</span>
                        <span>{composition.tracks.length} Tracks</span>
                        <span>{(composition.totalDurationBeats * (60 / composition.bpm)).toFixed(1)}s Loop</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownloadMidi}
                        className="h-10 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-medium transition-colors flex items-center gap-2"
                        title="Download MIDI File"
                        id="download-midi-button"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="hidden sm:inline">MIDI</span>
                    </button>

                    <button
                        onClick={handleDownloadWav}
                        disabled={isRendering}
                        className="h-10 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download Audio WAV"
                        id="download-wav-button"
                    >
                        {isRendering ? (
                            <svg className="animate-spin h-4 w-4 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        )}
                        <span className="hidden sm:inline">Audio</span>
                    </button>

                    <button
                        onClick={isPlaying ? stopPlaying : playComposition}
                        className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg
                    ${isPlaying
                                ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/30'
                                : 'bg-accent text-white hover:bg-accent/90 hover:scale-105 shadow-accent/40'}
                `}
                    >
                        {isPlaying ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Visualization of Tracks */}
            <div className="space-y-3 mt-2 relative">
                {composition.tracks.map((track, tIdx) => (
                    <div key={tIdx} className="group/track">
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${['bg-blue-400', 'bg-purple-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400', 'bg-cyan-400'][tIdx % 6]}`}></span>
                                {track.instrument}
                            </div>
                        </div>

                        <div className="h-10 bg-black/40 rounded-lg relative overflow-hidden border border-white/5">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex justify-between opacity-10 pointer-events-none">
                                {[...Array(Math.ceil(composition.totalDurationBeats))].map((_, i) => (
                                    <div key={i} className="w-px h-full bg-white"></div>
                                ))}
                            </div>

                            {track.notes.map((note, nIdx) => {
                                const isActive = activeNotes.has(`${tIdx}-${nIdx}`);
                                return (
                                    <div
                                        key={nIdx}
                                        className={`
                                    absolute top-1 bottom-1 rounded-sm border-l border-white/20 transition-all duration-75
                                    ${isActive
                                                ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10 scale-y-110'
                                                : `${['bg-blue-500/40', 'bg-purple-500/40', 'bg-emerald-500/40', 'bg-amber-500/40', 'bg-rose-500/40', 'bg-cyan-500/40'][tIdx % 6]} hover:bg-white/30`
                                            }
                                `}
                                        style={{
                                            left: `${(note.startTime / composition.totalDurationBeats) * 100}%`,
                                            width: `${Math.max(0.5, (note.duration / composition.totalDurationBeats) * 100)}%`,
                                        }}
                                    ></div>
                                )
                            })}

                            {/* Playhead overlay */}
                            <div
                                className="absolute top-0 h-full w-px bg-white/80 z-20 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                style={{ left: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-600 font-mono mt-2">
                <span>Stereo Reverb & Offline Rendering Enabled</span>
                <span>Generated by Gemini 2.5 Flash</span>
            </div>
        </div>
    );
};