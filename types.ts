export enum LoadingState {
  IDLE = 'IDLE',
  COMPOSING = 'COMPOSING',
  PLAYING = 'PLAYING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface Note {
  pitch: string;     // e.g., "C4", "F#3"
  startTime: number; // Start time in beats (e.g., 0.0, 0.5, 4.0)
  duration: number;  // Duration in beats (e.g., 0.25, 1.0)
  velocity: number;  // Volume 0.0 to 1.0
}

export interface Track {
  id: string;
  instrument: 'piano' | 'synth' | 'bass' | 'pad' | 'bells' | 'guitar' | 'drums';
  notes: Note[];
}

export interface Composition {
  bpm: number;
  mood: string;
  key: string;
  tracks: Track[];
  totalDurationBeats: number; // Helper for UI
}

export interface MusicAnalysis {
  tempo: string;
  mood: string;
  instruments: string[];
  suggestedPrompt: string;
  visualDescription: string;
}