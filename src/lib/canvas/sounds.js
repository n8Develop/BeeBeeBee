// Web Audio oscillator synthesis — zero asset files

let audioCtx = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.1) {
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration / 1000);
}

export function penDown() {
  playTone(800, 30, 'square', 0.05);
}

let lastMoveX = 0;
let lastMoveY = 0;

export function moveTick(x, y) {
  const dx = x - lastMoveX;
  const dy = y - lastMoveY;
  if (dx * dx + dy * dy < 15 * 15) return;
  lastMoveX = x;
  lastMoveY = y;
  playTone(1200, 15, 'sine', 0.03);
}

export function resetMoveTracking() {
  lastMoveX = 0;
  lastMoveY = 0;
}

export function keyTick() {
  playTone(1000, 20, 'square', 0.04);
}

export function stampPlace() {
  playTone(200, 50, 'triangle', 0.08);
}

/** Initialize AudioContext on first user gesture */
export function initAudio() {
  getContext();
}
