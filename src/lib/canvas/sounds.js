// Web Audio oscillator synthesis — zero asset files

let audioCtx = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.1, multiplier = 1.0) {
  const finalVol = volume * multiplier;
  if (finalVol <= 0) return;

  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = Math.min(finalVol, 1.0);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration / 1000);
}

export function penDown(multiplier = 1.0) {
  playTone(800, 30, 'square', 0.05, multiplier);
}

let lastMoveX = 0;
let lastMoveY = 0;

export function moveTick(x, y, multiplier = 1.0) {
  const dx = x - lastMoveX;
  const dy = y - lastMoveY;
  if (dx * dx + dy * dy < 15 * 15) return;
  lastMoveX = x;
  lastMoveY = y;
  playTone(1200, 15, 'sine', 0.03, multiplier);
}

export function resetMoveTracking() {
  lastMoveX = 0;
  lastMoveY = 0;
}

export function keyTick(multiplier = 1.0) {
  playTone(1000, 20, 'square', 0.04, multiplier);
}

export function stampPlace(multiplier = 1.0) {
  playTone(200, 50, 'triangle', 0.08, multiplier);
}

export function messageSent(multiplier = 1.0) {
  playTone(600, 30, 'sine', 0.08, multiplier);
  setTimeout(() => playTone(900, 30, 'sine', 0.08, multiplier), 30);
}

export function messageReceived(multiplier = 1.0) {
  playTone(900, 30, 'sine', 0.08, multiplier);
  setTimeout(() => playTone(600, 30, 'sine', 0.08, multiplier), 30);
}

/** Initialize AudioContext on first user gesture */
export function initAudio() {
  getContext();
}
