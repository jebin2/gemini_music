import { Composition, Note } from "../types";

// Simple MIDI Encoder for SMF Format 1
export const generateMidiUrl = (composition: Composition): string => {
  const SECONDS_PER_MINUTE = 60;
  // Standard ticks per beat
  const TICKS_PER_BEAT = 480; 

  // Helper to write variable length quantity
  const writeVarLen = (value: number): number[] => {
    const bytes = [];
    let v = value;
    let buffer = v & 0x7f;
    while ((v >>= 7)) {
      buffer <<= 8;
      buffer |= (v & 0x7f) | 0x80;
    }
    while (true) {
      bytes.push(buffer & 0xff);
      if (buffer & 0x80) buffer >>= 8;
      else break;
    }
    return bytes;
  };

  // Helper to write string
  const writeString = (str: string): number[] => {
    return str.split('').map(c => c.charCodeAt(0));
  };

  // Helper to write 32-bit int
  const writeUInt32 = (val: number): number[] => [
    (val >> 24) & 0xff,
    (val >> 16) & 0xff,
    (val >> 8) & 0xff,
    val & 0xff
  ];

  // Helper to write 16-bit int
  const writeUInt16 = (val: number): number[] => [
    (val >> 8) & 0xff,
    val & 0xff
  ];

  // 1. Header Chunk
  const headerChunk = [
    ...writeString('MThd'),
    ...writeUInt32(6),      // Header length
    ...writeUInt16(1),      // Format 1 (multi-track)
    ...writeUInt16(composition.tracks.length + 1), // Tracks + Tempo track
    ...writeUInt16(TICKS_PER_BEAT)
  ];

  // 2. Tempo Track
  const tempoMicroseconds = Math.round(60000000 / composition.bpm);
  const tempoEvents = [
    0x00, 0xFF, 0x51, 0x03, // Set Tempo meta event
    (tempoMicroseconds >> 16) & 0xff,
    (tempoMicroseconds >> 8) & 0xff,
    tempoMicroseconds & 0xff,
    0x00, 0xFF, 0x2F, 0x00 // End of track
  ];
  
  const tempoTrackChunk = [
    ...writeString('MTrk'),
    ...writeUInt32(tempoEvents.length),
    ...tempoEvents
  ];

  // 3. Instrument Tracks
  const trackChunks: number[] = [];

  composition.tracks.forEach((track, index) => {
    let events: { time: number, type: number, note: number, vel: number }[] = [];
    
    // Convert note names to MIDI numbers
    const getMidiNote = (note: string): number => {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const normNote = note.replace('b', '#').replace('Db', 'C#').replace('Eb', 'D#').replace('Gb', 'F#').replace('Ab', 'G#').replace('Bb', 'A#');
        const regex = /([A-G]#?)(\d)/;
        const match = normNote.match(regex);
        if (!match) return 60;
        const semitone = notes.indexOf(match[1]);
        const octave = parseInt(match[2]);
        return semitone + (octave + 1) * 12;
    };

    track.notes.forEach(note => {
      const midiNote = getMidiNote(note.pitch);
      const startTick = Math.round(note.startTime * TICKS_PER_BEAT);
      const endTick = Math.round((note.startTime + note.duration) * TICKS_PER_BEAT);
      const velocity = Math.min(127, Math.round(note.velocity * 127));

      // Note On
      events.push({ time: startTick, type: 0x90, note: midiNote, vel: velocity });
      // Note Off
      events.push({ time: endTick, type: 0x80, note: midiNote, vel: 0 });
    });

    // Sort by time
    events.sort((a, b) => a.time - b.time);

    // Convert to delta times
    let lastTime = 0;
    const trackBytes: number[] = [];
    
    // Track name meta event (optional but good)
    trackBytes.push(0x00, 0xFF, 0x03, track.instrument.length, ...writeString(track.instrument));

    events.forEach(e => {
      const delta = e.time - lastTime;
      trackBytes.push(...writeVarLen(delta));
      trackBytes.push(e.type | (index % 16)); // Channel based on index, simplistic
      trackBytes.push(e.note);
      trackBytes.push(e.vel);
      lastTime = e.time;
    });

    // End of track
    trackBytes.push(0x00, 0xFF, 0x2F, 0x00);

    // Build Chunk
    trackChunks.push(...writeString('MTrk'));
    trackChunks.push(...writeUInt32(trackBytes.length));
    trackChunks.push(...trackBytes);
  });

  // Combine all
  const fileBytes = new Uint8Array([
    ...headerChunk,
    ...tempoTrackChunk,
    ...trackChunks
  ]);

  const blob = new Blob([fileBytes], { type: 'audio/midi' });
  return URL.createObjectURL(blob);
};