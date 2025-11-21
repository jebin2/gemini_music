import { GoogleGenAI, Type } from "@google/genai";
import { Composition } from "../types";

export const composeMusicFromScript = async (script: string, apiKey: string): Promise<Composition> => {
  if (!apiKey) {
    throw new Error("API Key is required");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Act as a professional music composer. 
    Analyze the following script/text and compose a short background music loop (approx 8-16 bars) that matches the mood.
    
    Script: "${script}"

    Return a JSON object representing the musical composition.
    The composition should have multiple tracks to sound full.
    Use valid scientific pitch notation for notes (e.g., "C4", "F#3", "Bb2").
    
    Constraints:
    1. BPM: Choose a tempo appropriate for the mood.
    2. Instruments: Choose from 'piano', 'synth', 'bass', 'pad', 'bells', 'guitar', 'drums'.
    3. Drums: If using drums, use C2 for Kick, D2 for Snare, F#2 for Hi-Hat.
    4. Structure: Ensure notes are quantized reasonably (e.g., 0.25, 0.5, 1.0 steps).
    5. Harmony: Ensure the tracks work together musically (same key).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bpm: { type: Type.NUMBER, description: "Beats per minute" },
          mood: { type: Type.STRING, description: "The detected mood" },
          key: { type: Type.STRING, description: "Musical key (e.g., C Minor)" },
          tracks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                instrument: { 
                  type: Type.STRING, 
                  enum: ['piano', 'synth', 'bass', 'pad', 'bells', 'guitar', 'drums'] 
                },
                notes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      pitch: { type: Type.STRING, description: "e.g. C4, F#3" },
                      startTime: { type: Type.NUMBER, description: "Start time in beats" },
                      duration: { type: Type.NUMBER, description: "Duration in beats" },
                      velocity: { type: Type.NUMBER, description: "0.1 to 1.0" }
                    },
                    required: ["pitch", "startTime", "duration", "velocity"]
                  }
                }
              },
              required: ["id", "instrument", "notes"]
            }
          },
          totalDurationBeats: { type: Type.NUMBER, description: "Total length of the loop in beats" }
        },
        required: ["bpm", "mood", "key", "tracks", "totalDurationBeats"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No composition generated");
  
  return JSON.parse(text) as Composition;
};