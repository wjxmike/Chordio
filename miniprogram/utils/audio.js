/**
 * Chord Hero - 钢琴音频播放模块
 * 使用 Web Audio API + 远程采样（CDN 或云存储）实现低延迟播放
 */

const { getChordFrequencies, ROOT_FREQUENCIES } = require('./chords');
const { loadAssetArrayBuffer, ensureAssetsReady } = require('../config/assets');

// 半音顺序（降号命名）
const SEMITONE_ORDER = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// 升号到降号的映射
const SHARP_TO_FLAT = {
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
  'A#': 'Bb'
};

/**
 * 将根音转换为标准名称（升号转降号）
 */
function normalizeRootNote(rootNote) {
  if (SHARP_TO_FLAT[rootNote]) {
    return SHARP_TO_FLAT[rootNote];
  }
  return rootNote;
}

// Web Audio 上下文
let audioCtx = null;

// 采样缓存（解码后的 AudioBuffer）
const sampleBuffers = {};
let samplesLoaded = false;
let loadPromise = null;

// 当前播放的 source 节点（用于停止）
const activeSources = [];

function getSampleAssetPath(noteName, octave) {
  return `piano/${noteName}${octave}.m4a`;
}

/** 限制并发，避免同时大量下载导致失败 */
function runWithConcurrency(taskFns, limit) {
  return new Promise((resolve) => {
    let index = 0;
    let active = 0;

    function next() {
      if (index >= taskFns.length && active === 0) {
        resolve();
        return;
      }
      while (active < limit && index < taskFns.length) {
        const fn = taskFns[index++];
        active++;
        Promise.resolve(fn()).finally(() => {
          active--;
          next();
        });
      }
    }

    next();
  });
}

/**
 * 初始化 Web Audio 上下文
 */
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = wx.createWebAudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * 确保音频已激活（用于移动端，需要在用户交互后调用）
 */
function ensureAudioResumed() {
  // 确保 audioCtx 已创建
  if (!audioCtx) {
    audioCtx = wx.createWebAudioContext();
    console.log('[Audio] AudioContext created');
  }

  // 尝试激活
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => {
      console.log('[Audio] AudioContext resumed, state:', audioCtx.state);
    }).catch(err => {
      console.warn('[Audio] Resume failed:', err);
    });
  } else {
    console.log('[Audio] AudioContext state:', audioCtx.state);
  }
}

/**
 * 加载单个音频采样
 */
function loadSample(noteName, octave) {
  const key = `${noteName}${octave}`;
  const assetPath = getSampleAssetPath(noteName, octave);

  console.log(`[loadSample] Start: ${key}`, assetPath);

  return new Promise((resolve) => {
    loadAssetArrayBuffer(assetPath)
      .then((data) => {
        console.log(`[loadSample] Loaded: ${key}, size: ${data.byteLength}`);
        decodeAndCache(key, data, resolve);
      })
      .catch((err) => {
        console.warn(`[loadSample] Failed: ${key}`, assetPath, err);
        resolve();
      });
  });
}

/**
 * 解码音频并缓存
 */
function decodeAndCache(key, arrayBuffer, callback) {
  console.log(`[decodeAndCache] Start: ${key}`);
  const ctx = getAudioContext();
  ctx.decodeAudioData(arrayBuffer, (buffer) => {
    sampleBuffers[key] = buffer;
    console.log(`[decodeAndCache] SUCCESS: ${key}, duration: ${buffer.duration}s`);
    callback();
  }, (err) => {
    console.warn(`[decodeAndCache] FAILED: ${key}`, err);
    callback();
  });
}

/**
 * 预加载所有钢琴采样
 */
async function preloadSamples() {
  if (samplesLoaded) return;
  if (loadPromise) return loadPromise;

  getAudioContext();

  const notes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const octaves = [2, 3, 4, 5];

  const tasks = [];
  octaves.forEach(octave => {
    notes.forEach(note => {
      if (octave === 5 && note !== 'C') return;
      tasks.push(() => loadSample(note, octave));
    });
  });

  loadPromise = runWithConcurrency(tasks, 4).then(() => {
    samplesLoaded = true;
    console.log('Piano samples loaded:', Object.keys(sampleBuffers).length);
  });

  return loadPromise;
}

/**
 * 停止当前所有播放
 */
function stopCurrentPlayback() {
  activeSources.forEach(source => {
    try {
      source.stop();
    } catch (e) {
      // 已停止
    }
  });
  activeSources.length = 0;
}

/**
 * 初始化音频设置
 */
function initAudio() {
  if (wx.setInnerAudioOption) {
    wx.setInnerAudioOption({
      obeyMuteSwitch: false
    });
  }
  getAudioContext();
}

/**
 * 播放单个音符（Web Audio API）
 */
function playNote(noteKey, volume = 0.6, startTime = 0) {
  const buffer = sampleBuffers[noteKey];
  if (!buffer) {
    console.warn(`Sample not loaded: ${noteKey}`);
    return null;
  }

  const ctx = getAudioContext();

  // 处理音频上下文激活
  const playSound = () => {
    console.log(`[playNote] Playing: ${noteKey}, ctx state: ${ctx.state}`);

    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();

    source.buffer = buffer;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    const playTime = ctx.currentTime + startTime;
    source.start(playTime);

    activeSources.push(source);

    source.onended = () => {
      const idx = activeSources.indexOf(source);
      if (idx > -1) activeSources.splice(idx, 1);
    };

    return source;
  };

  // 如果上下文被暂停，先恢复再播放
  if (ctx.state === 'suspended') {
    console.log('[playNote] Context suspended, resuming...');
    ctx.resume().then(() => {
      console.log('[playNote] Context resumed, now playing');
      playSound();
    }).catch(err => {
      console.warn('[playNote] Resume failed:', err);
    });
    return null;
  } else {
    return playSound();
  }
}

/**
 * 频率转音符名称
 */
function freqToNoteName(freq) {
  const A4 = 440;
  const semitones = 12 * Math.log2(freq / A4);
  const noteIndex = Math.round(semitones) + 9 + 48;
  const octave = Math.floor(noteIndex / 12);
  const note = SEMITONE_ORDER[noteIndex % 12];
  return `${note}${octave}`;
}

/**
 * 获取和弦音符名称（左手低音 + 右手和弦）
 */
function getChordVoicing(frequencies, rootNote) {
  if (!frequencies || frequencies.length === 0) return null;

  const bass = `${rootNote}2`;

  const chordNotes = frequencies.map(freq => {
    const noteName = freqToNoteName(freq);
    const note = noteName.slice(0, -1);
    let octave = parseInt(noteName.slice(-1));

    if (octave < 3) octave = 3;
    if (octave > 4) octave = 4;

    return `${note}${octave}`;
  });

  return { bass, chord: chordNotes };
}

/**
 * 播放和弦（左手低音 + 右手和弦，同时触发）
 */
function playPianoChord(frequencies, rootNote) {
  const voicing = getChordVoicing(frequencies, rootNote);
  if (!voicing) return;

  playNote(voicing.bass, 0.5, 0);
  voicing.chord.forEach(note => {
    playNote(note, 0.4, 0);
  });
}

/**
 * 获取和弦的根音名称
 */
function getChordRoot(keyRoot, chordSymbol) {
  const normalized = normalizeRootNote(keyRoot);
  const rootIndex = SEMITONE_ORDER.indexOf(normalized);

  const triadRoots = {
    'I': 0, 'ii': 1, 'iii': 2, 'IV': 3, 'V': 4, 'vi': 5, 'vii': 6
  };

  const seventhRoots = {
    'I△7': 0, 'ii-7': 1, 'iii-7': 2, 'IV△7': 3, 'V7': 4, 'vi-7': 5, 'viiØ7': 6
  };

  const chromaticRoots = {
    ...triadRoots,
    ...seventhRoots,
    'V7/vi': 5, 'V7/V': 4, 'V7/IV': 3, 'V7/ii': 1, 'V7/iii': 2,
    'iv': 3, 'bVI': 5, 'bVII': 6, 'III': 2, 'II': 1, 'iv7': 3
  };

  const scaleIntervals = [0, 2, 4, 5, 7, 9, 11];
  const scaleIndex = chromaticRoots[chordSymbol];

  if (scaleIndex !== undefined) {
    if (chordSymbol.startsWith('V7/')) {
      const targetIndex = scaleIntervals[scaleIndex];
      const targetNote = SEMITONE_ORDER[(rootIndex + targetIndex) % 12];
      return SEMITONE_ORDER[(SEMITONE_ORDER.indexOf(targetNote) + 7) % 12];
    }
    if (['iv', 'bVI', 'bVII', 'III'].includes(chordSymbol)) {
      const minorIntervals = [0, 2, 3, 5, 7, 8, 10];
      const semitoneOffset = minorIntervals[scaleIndex];
      return SEMITONE_ORDER[(rootIndex + semitoneOffset) % 12];
    }
    if (chordSymbol === 'II') {
      return SEMITONE_ORDER[(rootIndex + 2) % 12];
    }
    const semitoneOffset = scaleIntervals[scaleIndex];
    return SEMITONE_ORDER[(rootIndex + semitoneOffset) % 12];
  }

  return keyRoot;
}

/**
 * 播放根音单音
 */
function playRootNote(ctx, frequency, duration = 2.0) {
  stopCurrentPlayback();
  const noteName = freqToNoteName(frequency);
  playNote(noteName, 0.6, 0);
}

/**
 * 播放整个和弦进行
 */
function playProgression(ctx, progression, rootNote, level = 'triads') {
  stopCurrentPlayback();

  const CHORD_INTERVAL = 1.2;
  const actualCtx = getAudioContext();

  const scheduleNotes = () => {
    console.log('[playProgression] Scheduling notes, ctx state:', actualCtx.state);

    progression.forEach((chordSymbol, index) => {
      const startTime = index * CHORD_INTERVAL;
      const frequencies = getChordFrequencies(rootNote, chordSymbol, level);

      if (frequencies) {
        const chordRoot = getChordRoot(rootNote, chordSymbol);
        const voicing = getChordVoicing(frequencies, chordRoot);

        if (voicing) {
          // 直接调度，不经过 playNote 的暂停检查
          const playSound = (noteKey, volume, time) => {
            const buffer = sampleBuffers[noteKey];
            if (!buffer) return;

            const source = actualCtx.createBufferSource();
            const gainNode = actualCtx.createGain();

            source.buffer = buffer;
            gainNode.gain.value = volume;

            source.connect(gainNode);
            gainNode.connect(actualCtx.destination);

            source.start(actualCtx.currentTime + time);
            activeSources.push(source);
          };

          playSound(voicing.bass, 0.5, startTime);
          voicing.chord.forEach(note => {
            playSound(note, 0.4, startTime);
          });
        }
      }
    });
  };

  // 如果 context 暂停，先恢复再调度
  if (actualCtx.state === 'suspended') {
    console.log('[playProgression] Context suspended, resuming...');
    actualCtx.resume().then(() => {
      console.log('[playProgression] Context resumed, scheduling...');
      scheduleNotes();
    }).catch(err => {
      console.warn('[playProgression] Resume failed:', err);
    });
  } else {
    scheduleNotes();
  }

  return progression.length * CHORD_INTERVAL;
}

/**
 * 播放单个和弦（点击方块时）
 */
function playOneChord(ctx, chordSymbol, rootNote, level = 'triads') {
  stopCurrentPlayback();
  const frequencies = getChordFrequencies(rootNote, chordSymbol, level);

  if (frequencies) {
    const chordRoot = getChordRoot(rootNote, chordSymbol);
    const voicing = getChordVoicing(frequencies, chordRoot);

    if (voicing) {
      const actualCtx = getAudioContext();

      const playChordNow = () => {
        console.log('[playOneChord] Playing, ctx state:', actualCtx.state);

        const playSound = (noteKey, volume) => {
          const buffer = sampleBuffers[noteKey];
          if (!buffer) return;

          const source = actualCtx.createBufferSource();
          const gainNode = actualCtx.createGain();

          source.buffer = buffer;
          gainNode.gain.value = volume;

          source.connect(gainNode);
          gainNode.connect(actualCtx.destination);

          source.start(0);
          activeSources.push(source);
        };

        playSound(voicing.bass, 0.5);
        voicing.chord.forEach(note => {
          playSound(note, 0.4);
        });
      };

      // 如果 context 暂停，先恢复再播放
      if (actualCtx.state === 'suspended') {
        console.log('[playOneChord] Context suspended, resuming...');
        actualCtx.resume().then(() => {
          playChordNow();
        }).catch(err => {
          console.warn('[playOneChord] Resume failed:', err);
        });
      } else {
        playChordNow();
      }
    }
  }
}

/**
 * 获取根音频率
 */
function getRootFrequency(rootNote) {
  return ROOT_FREQUENCIES[rootNote];
}

/**
 * 初始化钢琴
 */
function initPiano() {
  initAudio();
  return ensureAssetsReady().then(() => preloadSamples());
}

module.exports = {
  getAudioContext,
  playRootNote,
  playProgression,
  playOneChord,
  getRootFrequency,
  stopCurrentPlayback,
  initPiano,
  preloadSamples,
  ensureAudioResumed
};
