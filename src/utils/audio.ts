let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// 1. Play Checkmark Tick Sound
export function playTickSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // High-pass filtered short pulse + organic click
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
    
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.05);

    // High snap frequency
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'sine';
    snapOsc.frequency.setValueAtTime(2200, now);
    snapOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.015);
    
    snapGain.gain.setValueAtTime(0.08, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    
    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    
    snapOsc.start(now);
    snapOsc.stop(now + 0.02);
  } catch (error) {
    console.warn('Audio feedback blocked or failed:', error);
  }
}

// 2. Play Completion Sound (Gentle chime / beautiful focus bell)
export function playCompleteBell() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Multi-harmonic crystalline bell sound
    const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 chord
    
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      
      // Delays for organic strum effect
      const delay = i * 0.08;
      const attack = 0.01;
      const decay = 1.2 - i * 0.15;
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + delay + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + decay);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now + delay);
      osc.stop(now + delay + decay);
    });
  } catch (error) {
    console.warn('Audio alarm blocked or failed:', error);
  }
}

// 3. Play Button Click Snap
export function playClickSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);
    
    gainNode.gain.setValueAtTime(0.03, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.03);
  } catch (e) {}
}

// 4. Ambient Focus Soundscape Generators
let activeNoiseSource: AudioScheduledSourceNode | null = null;
let activeNoiseGain: GainNode | null = null;

export function stopAmbientSound() {
  if (activeNoiseSource) {
    try {
      activeNoiseSource.stop();
    } catch (e) {}
    activeNoiseSource = null;
  }
  activeNoiseGain = null;
}

export function startWhiteNoise(volume: number) {
  stopAmbientSound();
  try {
    const ctx = getAudioContext();
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    
    // We add a lowpass filter to make it "Brownian/Pinkish" noise, which is much warmer and more pleasant for studying.
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
    
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    noiseSource.start();
    activeNoiseSource = noiseSource;
    activeNoiseGain = gainNode;
  } catch (error) {
    console.warn('Failed to start ambient noise:', error);
  }
}

// Deep Sleep Study Binaural Focus (Beta/Alpha frequencies)
export function startBinauralBeats(volume: number) {
  stopAmbientSound();
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // We need 2 oscillators in panner nodes, or simply offset slightly in low frequencies.
    // Left ear: 200Hz. Right ear: 212Hz (12Hz difference, which triggers alpha/alert study focus state)
    const leftOsc = ctx.createOscillator();
    const rightOsc = ctx.createOscillator();
    
    leftOsc.frequency.setValueAtTime(150, now);
    rightOsc.frequency.setValueAtTime(162, now); // 12Hz offset
    
    const splitter = ctx.createChannelMerger(2);
    const leftGain = ctx.createGain();
    const rightGain = ctx.createGain();
    const masterGain = ctx.createGain();
    
    leftGain.gain.setValueAtTime(1, now);
    rightGain.gain.setValueAtTime(1, now);
    masterGain.gain.setValueAtTime(volume * 0.1, now);
    
    leftOsc.connect(leftGain);
    rightOsc.connect(rightGain);
    
    leftGain.connect(splitter, 0, 0);
    rightGain.connect(splitter, 0, 1);
    
    splitter.connect(masterGain);
    masterGain.connect(ctx.destination);
    
    leftOsc.start();
    rightOsc.start();
    
    // Wrap them in a helper so we can stop both
    activeNoiseSource = {
      stop: () => {
        try {
          leftOsc.stop();
          rightOsc.stop();
        } catch (e) {}
      }
    } as any;
    activeNoiseGain = masterGain;
  } catch (error) {
    console.warn('Failed to start Binaural Focus:', error);
  }
}

export function updateAmbientVolume(volume: number) {
  if (activeNoiseGain) {
    try {
      const ctx = getAudioContext();
      activeNoiseGain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.1), ctx.currentTime + 0.1);
    } catch (e) {
      if (activeNoiseGain) {
        activeNoiseGain.gain.value = volume * 0.1;
      }
    }
  }
}
