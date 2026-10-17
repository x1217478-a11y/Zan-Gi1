import fs from 'fs';
import path from 'path';

/**
 * Generates valid 16-bit PCM WAV files with distinct melodic and rhythmic themes.
 */
function createWavFile(
  filepath: string,
  durationSeconds: number,
  sampleRate: number,
  generator: (t: number, sampleIndex: number) => number
) {
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const numChannels = 1; // mono
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = generator(t, i);
    // Clamp to -1.0 .. 1.0
    sample = Math.max(-1.0, Math.min(1.0, sample));
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filepath, buffer);
  console.log(`Generated audio track: ${filepath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

const AUDIO_DIR = path.resolve(process.cwd(), 'uploads', 'audio');

// Note frequencies (Hz)
const notes: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0
};

// 1. Trending: Zan-Gi Cyber Horizon (Upbeat Synthwave Arpeggio)
createWavFile(path.join(AUDIO_DIR, 'cyber_horizon.wav'), 16, 22050, (t) => {
  const bpm = 120;
  const beat = (t * (bpm / 60)) % 16;
  const arpNotes = [notes.C4, notes.E4, notes.G4, notes.B4, notes.C5, notes.G4, notes.E4, notes.D4];
  const noteIdx = Math.floor(beat * 2) % arpNotes.length;
  const freq = arpNotes[noteIdx];
  const env = Math.exp(-((beat * 2) % 1) * 3);
  const synth = (Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(4 * Math.PI * freq * t)) * env * 0.4;
  const bass = Math.sin(2 * Math.PI * notes.C3 * t) * 0.3;
  // kick
  const kickEnv = Math.exp(-(beat % 1) * 12);
  const kick = Math.sin(2 * Math.PI * (60 + 120 * kickEnv) * t) * kickEnv * 0.4;
  return synth + bass + kick;
});

// 2. Trending: Dhaka Sunset Beats (Chillhop Lo-Fi)
createWavFile(path.join(AUDIO_DIR, 'dhaka_sunset_beats.wav'), 16, 22050, (t) => {
  const bpm = 85;
  const beat = (t * (bpm / 60)) % 16;
  const chordRoots = [notes.A3, notes.F3, notes.C4, notes.G3];
  const chordIdx = Math.floor(beat / 4) % chordRoots.length;
  const root = chordRoots[chordIdx];
  const e1 = Math.sin(2 * Math.PI * root * t);
  const e2 = Math.sin(2 * Math.PI * (root * 1.25) * t) * 0.8; // major third
  const e3 = Math.sin(2 * Math.PI * (root * 1.5) * t) * 0.6; // fifth
  const pad = (e1 + e2 + e3) * 0.25;
  // soft rim/snare on beat 2 and 4
  const snareHit = Math.exp(-((beat % 2) - 1 > 0 ? (beat % 2) - 1 : 1) * 15);
  const noise = (Math.random() * 2 - 1) * snareHit * 0.15;
  return pad + noise;
});

// 3. Bangla: Bhatiyali Acoustic River (Serene River Folk Flute & Acoustic Mood)
createWavFile(path.join(AUDIO_DIR, 'bhatiyali_acoustic_river.wav'), 16, 22050, (t) => {
  const bpm = 75;
  const beat = (t * (bpm / 60)) % 16;
  const melody = [notes.D4, notes.F4, notes.G4, notes.A4, notes.C5, notes.A4, notes.G4, notes.F4];
  const idx = Math.floor(beat) % melody.length;
  const freq = melody[idx];
  const fluteEnv = 0.5 + 0.5 * Math.sin(Math.PI * (beat % 1));
  const vibrato = Math.sin(2 * Math.PI * 5 * t) * 3;
  const flute = Math.sin(2 * Math.PI * (freq + vibrato) * t) * fluteEnv * 0.4;
  const acousticDrone = (Math.sin(2 * Math.PI * notes.D3 * t) + 0.5 * Math.sin(2 * Math.PI * notes.A3 * t)) * 0.2;
  return flute + acousticDrone;
});

// 4. Bangla: Moner Manush Baul Fusion (Ektara Rhythm & Folk Pulse)
createWavFile(path.join(AUDIO_DIR, 'moner_manush_baul.wav'), 16, 22050, (t) => {
  const bpm = 110;
  const beat = (t * (bpm / 60)) % 16;
  const ektaraFreq = notes.E3 + Math.sin(2 * Math.PI * 2 * t) * 5;
  const ektaraEnv = Math.exp(-(beat % 0.5) * 6);
  const ektara = Math.sin(2 * Math.PI * ektaraFreq * t) * ektaraEnv * 0.45;
  // Khamak / percussion tap
  const tap = Math.sin(2 * Math.PI * 90 * t) * Math.exp(-(beat % 1) * 14) * 0.35;
  const fluteMelody = Math.sin(2 * Math.PI * notes.B4 * t) * 0.2 * (Math.sin(t * 1.5) > 0 ? 1 : 0);
  return ektara + tap + fluteMelody;
});

// 5. Bangla: Shonar Bangla Ambient (Lofi Folk Melodic)
createWavFile(path.join(AUDIO_DIR, 'shonar_bangla_ambient.wav'), 16, 22050, (t) => {
  const t2 = t * 0.5;
  const chord = Math.sin(2 * Math.PI * notes.G3 * t) * 0.25 + Math.sin(2 * Math.PI * notes.B3 * t) * 0.2 + Math.sin(2 * Math.PI * notes.D4 * t) * 0.15;
  const chime = Math.sin(2 * Math.PI * notes.G5 * t) * Math.exp(-((t % 2)) * 3) * 0.2;
  return chord + chime;
});

// 6. Hindi: Sitar Monsoon Horizon (Peaceful Indian Acoustic)
createWavFile(path.join(AUDIO_DIR, 'sitar_monsoon_horizon.wav'), 16, 22050, (t) => {
  const bpm = 90;
  const beat = (t * (bpm / 60)) % 16;
  const sitarScale = [notes.C4, notes.D4, notes.E4, notes.G4, notes.A4, notes.C5];
  const idx = Math.floor(beat * 2) % sitarScale.length;
  const f = sitarScale[idx];
  // sitar twang with harmonics
  const env = Math.exp(-((beat * 2) % 1) * 5);
  const sitar = (Math.sin(2 * Math.PI * f * t) + 0.6 * Math.sin(4 * Math.PI * f * t) + 0.3 * Math.sin(6 * Math.PI * f * t)) * env * 0.35;
  const tanpura = (Math.sin(2 * Math.PI * notes.C3 * t) + Math.sin(2 * Math.PI * notes.G3 * t)) * 0.2;
  return sitar + tanpura;
});

// 7. Hindi: Mumbai Twilight Groove (Acoustic Folk Fusion)
createWavFile(path.join(AUDIO_DIR, 'mumbai_twilight_groove.wav'), 16, 22050, (t) => {
  const bpm = 105;
  const beat = (t * (bpm / 60)) % 16;
  const tabla = Math.sin(2 * Math.PI * 130 * t) * Math.exp(-(beat % 0.5) * 10) * 0.35;
  const bass = Math.sin(2 * Math.PI * notes.D3 * t) * 0.3;
  const leadNotes = [notes.D4, notes.F4, notes.A4, notes.G4];
  const leadFreq = leadNotes[Math.floor(beat / 2) % leadNotes.length];
  const lead = Math.sin(2 * Math.PI * leadFreq * t) * 0.25;
  return tabla + bass + lead;
});

// 8. English: Neon Skyline (Synth Pop Retro Wave)
createWavFile(path.join(AUDIO_DIR, 'neon_skyline.wav'), 16, 22050, (t) => {
  const bpm = 124;
  const beat = (t * (bpm / 60)) % 16;
  const synthBass = Math.sin(2 * Math.PI * notes.A3 * t) * Math.exp(-(beat % 0.5) * 4) * 0.4;
  const arp = Math.sin(2 * Math.PI * (notes.C5 + ((Math.floor(beat * 4) % 4) * 40)) * t) * 0.2;
  const kick = Math.sin(2 * Math.PI * 55 * t) * Math.exp(-(beat % 1) * 12) * 0.4;
  return synthBass + arp + kick;
});

// 9. English: Acoustic Golden Hour (Bright Indie Folk)
createWavFile(path.join(AUDIO_DIR, 'acoustic_golden_hour.wav'), 16, 22050, (t) => {
  const bpm = 100;
  const beat = (t * (bpm / 60)) % 16;
  const strum = (Math.sin(2 * Math.PI * notes.E3 * t) + Math.sin(2 * Math.PI * notes.B3 * t) + Math.sin(2 * Math.PI * notes.E4 * t)) * Math.exp(-(beat % 0.5) * 5) * 0.4;
  const melody = Math.sin(2 * Math.PI * notes.G4 * t) * 0.25;
  return strum + melody;
});

// 10. Instrumental: Serene Bamboo Flute (Peaceful Zen Meditation)
createWavFile(path.join(AUDIO_DIR, 'serene_bamboo_flute.wav'), 16, 22050, (t) => {
  const slowMelody = [notes.D4, notes.F4, notes.A4, notes.D5, notes.C5, notes.A4];
  const step = Math.floor(t / 2.5) % slowMelody.length;
  const freq = slowMelody[step];
  const fluteEnv = 0.5 + 0.5 * Math.sin((t / 2.5) * Math.PI);
  const breathNoise = (Math.random() * 2 - 1) * 0.05;
  const flute = (Math.sin(2 * Math.PI * freq * t) + breathNoise) * fluteEnv * 0.35;
  const bell = Math.sin(2 * Math.PI * notes.A5 * t) * Math.exp(-(t % 4) * 2) * 0.15;
  return flute + bell;
});

// 11. Instrumental: Piano Meditation (Soft Emotional Keys)
createWavFile(path.join(AUDIO_DIR, 'piano_meditation.wav'), 16, 22050, (t) => {
  const keys = [notes.C4, notes.E4, notes.G4, notes.B4, notes.A4, notes.F4];
  const idx = Math.floor(t * 1.5) % keys.length;
  const env = Math.exp(-((t * 1.5) % 1) * 2.5);
  const piano = (Math.sin(2 * Math.PI * keys[idx] * t) + 0.4 * Math.sin(4 * Math.PI * keys[idx] * t)) * env * 0.4;
  return piano;
});

// 12. Instrumental: Lo-Fi Coffee Study (Warm Vinyl Beats)
createWavFile(path.join(AUDIO_DIR, 'lofi_coffee_study.wav'), 16, 22050, (t) => {
  const bpm = 80;
  const beat = (t * (bpm / 60)) % 16;
  const vinylCrackles = (Math.random() > 0.97 ? 0.08 : 0);
  const rhodes = Math.sin(2 * Math.PI * notes.F3 * t) * 0.25 + Math.sin(2 * Math.PI * notes.A3 * t) * 0.2;
  const kick = Math.sin(2 * Math.PI * 65 * t) * Math.exp(-(beat % 1) * 10) * 0.3;
  return rhodes + kick + vinylCrackles;
});

console.log('✓ All 12 royalty-free audio tracks generated successfully.');
