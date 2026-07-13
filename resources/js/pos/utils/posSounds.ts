// ════════════════════════════════════════════════════════════════════════════
// pos/utils/posSounds.ts
//
// أصوات POS — مُولَّدة بـ Web Audio API بدون ملفات خارجية
// كل preset يحتوي على نغمتين: واحدة عند إضافة منتج، وأخرى عند إتمام البيع
// volume: 0-100 → يُحوَّل داخلياً إلى 0.0-1.0
// ════════════════════════════════════════════════════════════════════════════

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function note(
  ac: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = 'sine',
  vol = 0.12,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  gain.gain.setValueAtTime(vol, ac.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur);
}

function noise(ac: AudioContext, start: number, dur: number, vol = 0.06) {
  const bufSize = ac.sampleRate * dur;
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * vol;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const gain = ac.createGain();
  src.connect(gain);
  gain.connect(ac.destination);
  gain.gain.setValueAtTime(vol, ac.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur);
  src.start(ac.currentTime + start);
  src.stop(ac.currentTime + start + dur);
}

// ─── Volume scaling ──────────────────────────────────────────────────────────

/** Convert 0-100 volume to a 0-1 multiplier */
function volScale(v: number): number {
  return Math.max(0, Math.min(1, v / 100));
}

// ─── Preset definitions ─────────────────────────────────────────────────────

type SoundFn = (volume: number) => void;

const presets: Record<string, {
  label: string;
  icon: string;
  add: SoundFn;
  sale: SoundFn;
}> = {
  classic: {
    label: 'كلاسيك',
    icon: 'ti-music',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 600, 0, 0.08, 'sine', 0.12 * s);
      note(ac, 900, 0.08, 0.1, 'sine', 0.10 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 523, 0, 0.1, 'sine', 0.12 * s);
      note(ac, 659, 0.1, 0.1, 'sine', 0.10 * s);
      note(ac, 784, 0.2, 0.15, 'sine', 0.10 * s);
    },
  },
  pop: {
    label: 'بوب',
    icon: 'ti-bubble',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 800, 0, 0.04, 'sine', 0.18 * s);
      note(ac, 1200, 0.02, 0.06, 'sine', 0.10 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 600, 0, 0.06, 'sine', 0.15 * s);
      note(ac, 900, 0.06, 0.06, 'sine', 0.12 * s);
      note(ac, 1200, 0.12, 0.1, 'sine', 0.10 * s);
    },
  },
  digital: {
    label: 'رقمي',
    icon: 'ti-device-desktop',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 1047, 0, 0.05, 'square', 0.08 * s);
      note(ac, 1319, 0.04, 0.07, 'square', 0.06 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 880, 0, 0.08, 'square', 0.07 * s);
      note(ac, 1109, 0.07, 0.08, 'square', 0.06 * s);
      note(ac, 1397, 0.14, 0.12, 'square', 0.05 * s);
    },
  },
  bell: {
    label: 'جرس',
    icon: 'ti-bell',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 1568, 0, 0.2, 'sine', 0.10 * s);
      note(ac, 2093, 0, 0.15, 'sine', 0.06 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 1047, 0, 0.25, 'sine', 0.12 * s);
      note(ac, 1319, 0, 0.2, 'sine', 0.08 * s);
      note(ac, 1568, 0.15, 0.3, 'sine', 0.08 * s);
    },
  },
  soft: {
    label: 'ناعم',
    icon: 'ti-feather',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 440, 0, 0.12, 'sine', 0.08 * s);
      note(ac, 554, 0.06, 0.1, 'sine', 0.06 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 392, 0, 0.15, 'sine', 0.10 * s);
      note(ac, 494, 0.1, 0.15, 'sine', 0.08 * s);
      note(ac, 587, 0.2, 0.2, 'sine', 0.08 * s);
    },
  },
  click: {
    label: 'نقرة',
    icon: 'ti-mouse',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      noise(ac, 0, 0.03, 0.15 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      noise(ac, 0, 0.03, 0.12 * s);
      noise(ac, 0.06, 0.03, 0.12 * s);
      note(ac, 800, 0.1, 0.08, 'sine', 0.10 * s);
    },
  },
  cash: {
    label: 'صندوق',
    icon: 'ti-cash',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 1200, 0, 0.03, 'square', 0.10 * s);
      note(ac, 1600, 0.02, 0.05, 'square', 0.08 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 800, 0, 0.06, 'triangle', 0.15 * s);
      note(ac, 1000, 0.05, 0.06, 'triangle', 0.12 * s);
      note(ac, 1400, 0.1, 0.06, 'triangle', 0.10 * s);
      note(ac, 1800, 0.15, 0.1, 'triangle', 0.08 * s);
    },
  },
  bios: {
    label: 'بيوس',
    icon: 'ti-cpu',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 1000, 0, 0.15, 'square', 0.35 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 800, 0, 0.1, 'square', 0.30 * s);
      note(ac, 1200, 0.12, 0.2, 'square', 0.35 * s);
    },
  },
  none: {
    label: 'صامت',
    icon: 'ti-volume-off',
    add() {},
    sale() {},
  },
};

export type SoundPresetId = keyof typeof presets;

/** قائمة النغمات المتاحة لعرضها في الإعدادات */
export const SOUND_PRESETS = Object.entries(presets).map(([id, p]) => ({
  id: id as SoundPresetId,
  label: p.label,
  icon: p.icon,
}));

/** تشغيل صوت إضافة منتج حسب الـ preset والصوت المختار */
export function playAddSound(presetId: SoundPresetId = 'classic', volume = 60) {
  try { presets[presetId]?.add(volume); } catch { /* noop */ }
}

/** تشغيل صوت إتمام البيع حسب الـ preset والصوت المختار */
export function playSaleSound(presetId: SoundPresetId = 'classic', volume = 60) {
  try { presets[presetId]?.sale(volume); } catch { /* noop */ }
}

/** معاينة صوت (للعرض في الإعدادات) — يشغل add ثم sale بتأخير بسيط */
export function previewSound(presetId: SoundPresetId, volume = 60) {
  try {
    presets[presetId]?.add(volume);
    setTimeout(() => presets[presetId]?.sale(volume), 350);
  } catch { /* noop */ }
}
