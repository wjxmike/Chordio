/**
 * Chord Hero - 音频合成模块
 * 使用 Web Audio API 实时合成和弦音频
 */

const { SCALE_TRIADS, ROOT_FREQUENCIES } = require('./chords');

let audioCtx = null;
let audioInitialized = false;
let currentPlaybackNodes = [];

/**
 * 停止当前所有播放（断开连到 destination 的 gain 节点）
 */
function stopCurrentPlayback() {
  currentPlaybackNodes.forEach(node => {
    try {
      node.disconnect();
    } catch (e) {
      // 已断开或节点已失效时忽略
    }
  });
  currentPlaybackNodes = [];
}

/**
 * 初始化音频设置（静音模式下也可播放）
 */
function initAudio() {
  if (audioInitialized) return;
  audioInitialized = true;

  // 设置静音模式下也可播放音频
  if (wx.setInnerAudioOption) {
    wx.setInnerAudioOption({
      obeyMuteSwitch: false
    });
  }
}

/**
 * 获取或初始化 AudioContext
 */
function getAudioContext() {
  if (!audioCtx) {
    // 微信小程序使用 wx.createWebAudioContext()
    audioCtx = wx.createWebAudioContext();
    // 初始化音频设置
    initAudio();
  }

  // 处理 suspended 状态（iOS 需要用户交互后才能播放）
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  return audioCtx;
}

/**
 * 播放单个音符
 * @param {AudioContext} ctx - 音频上下文
 * @param {number} frequency - 频率 (Hz)
 * @param {number} startTime - 开始时间（秒，相对于当前时间）
 * @param {number} duration - 持续时间（秒）
 */
function playNote(ctx, frequency, startTime, duration) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;

  // ADSR 包络（模拟钢琴衰减）
  const now = ctx.currentTime + startTime;

  // Attack: 快速上升
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.35, now + 0.02);

  // Decay: 快速下降到 sustain level
  gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.15);

  // Sustain: 保持
  gainNode.gain.exponentialRampToValueAtTime(0.12, now + duration - 0.15);

  // Release: 释放
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  currentPlaybackNodes.push(gainNode);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

/**
 * 播放三和弦（同时播放3个音）
 * @param {AudioContext} ctx - 音频上下文
 * @param {number[]} frequencies - 三个音的频率数组
 * @param {number} startTime - 开始时间（秒）
 * @param {number} duration - 持续时间（秒）
 */
function playChord(ctx, frequencies, startTime = 0, duration = 1.4) {
  frequencies.forEach(freq => {
    playNote(ctx, freq, startTime, duration);
  });
}

/**
 * 播放根音单音
 * @param {AudioContext} ctx - 音频上下文
 * @param {number} frequency - 根音频率
 * @param {number} duration - 持续时间（秒）
 */
function playRootNote(ctx, frequency, duration = 2.0) {
  stopCurrentPlayback();
  playNote(ctx, frequency, 0, duration);
}

/**
 * 播放整个和弦进行
 * @param {AudioContext} ctx - 音频上下文
 * @param {string[]} progression - 和弦符号数组 ['I', 'V', 'vi', 'IV']
 * @param {string} rootNote - 根音 'C', 'Db', etc.
 * @returns {number} 总时长（秒）
 */
function playProgression(ctx, progression, rootNote) {
  stopCurrentPlayback();
  const CHORD_INTERVAL = 1.6; // 每个和弦间隔
  const CHORD_DURATION = 1.4; // 每个和弦持续时间

  progression.forEach((chordSymbol, index) => {
    const frequencies = SCALE_TRIADS[rootNote][chordSymbol].freq;
    playChord(ctx, frequencies, index * CHORD_INTERVAL, CHORD_DURATION);
  });

  return progression.length * CHORD_INTERVAL;
}

/**
 * 播放单个和弦（点击方块时）
 * @param {AudioContext} ctx - 音频上下文
 * @param {string} chordSymbol - 和弦符号 'I', 'ii', etc.
 * @param {string} rootNote - 根音
 */
function playOneChord(ctx, chordSymbol, rootNote) {
  stopCurrentPlayback();
  const frequencies = SCALE_TRIADS[rootNote][chordSymbol].freq;
  playChord(ctx, frequencies, 0, 1.5);
}

/**
 * 获取根音频率
 * @param {string} rootNote - 根音名称
 * @returns {number} 频率
 */
function getRootFrequency(rootNote) {
  return ROOT_FREQUENCIES[rootNote];
}

module.exports = {
  getAudioContext,
  playNote,
  playChord,
  playRootNote,
  playProgression,
  playOneChord,
  getRootFrequency,
  stopCurrentPlayback
};
