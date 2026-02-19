/**
 * Chord Hero - 和弦数据模块
 * 支持三个级别：三和弦、七和弦、离调和弦
 */

const progressions = require('./progressions');

// 12个半音的基准频率（C4到B4）
const SEMITONE_FREQ = {
  'C': 261.63,
  'Db': 277.18,
  'D': 293.66,
  'Eb': 311.13,
  'E': 329.63,
  'F': 349.23,
  'Gb': 369.99,
  'G': 392.00,
  'Ab': 415.30,
  'A': 440.00,
  'Bb': 466.16,
  'B': 493.88
};

// 12个调（使用降号命名）
const ROOT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// 根音单音频率
const ROOT_FREQUENCIES = SEMITONE_FREQ;

// 半音顺序（用于计算音阶）
const SEMITONE_ORDER = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// 大调音阶的半音步进
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

// 小调音阶的半音步进（自然小调）
const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

/**
 * 根据根音获取大调音阶的7个音（半音索引）
 */
function getMajorScale(rootNote) {
  const rootIndex = SEMITONE_ORDER.indexOf(rootNote);
  return MAJOR_SCALE_INTERVALS.map(interval => (rootIndex + interval) % 12);
}

/**
 * 根据根音获取小调音阶的7个音（半音索引）
 */
function getMinorScale(rootNote) {
  const rootIndex = SEMITONE_ORDER.indexOf(rootNote);
  return MINOR_SCALE_INTERVALS.map(interval => (rootIndex + interval) % 12);
}

/**
 * 半音索引转频率（基于C4=261.63）
 */
function semitoneToFreq(semitoneIndex, octave = 4) {
  const noteName = SEMITONE_ORDER[semitoneIndex % 12];
  const baseFreq = SEMITONE_FREQ[noteName];
  const octaveDiff = octave - 4;
  return baseFreq * Math.pow(2, octaveDiff);
}

/**
 * 从音阶获取和弦频率
 */
function getChordFreqsFromScale(scaleIndices, scale, octave = 4) {
  return scaleIndices.map(idx => {
    const scaleIdx = idx % 7;
    const octaveOffset = Math.floor(idx / 7);
    const semitoneIndex = scale[scaleIdx];
    return semitoneToFreq(semitoneIndex, octave + octaveOffset);
  });
}

/**
 * 获取指定半音的频率
 */
function getSemitoneFreq(semitoneName, octave = 4) {
  const baseFreq = SEMITONE_FREQ[semitoneName];
  if (!baseFreq) return null;
  const octaveDiff = octave - 4;
  return baseFreq * Math.pow(2, octaveDiff);
}

// ==================== Level 1: 三和弦 ====================

/**
 * 获取三和弦频率
 */
function getTriadFreqs(rootNote, chordSymbol) {
  const scale = getMajorScale(rootNote);

  // 和弦符号到音阶索引的映射
  const chordMap = {
    'I':   [0, 2, 4],      // 1-3-5 大三
    'ii':  [1, 3, 5],      // 2-4-6 小三
    'iii': [2, 4, 6],      // 3-5-7 小三
    'IV':  [3, 5, 7],      // 4-6-1 大三
    'V':   [4, 6, 8],      // 5-7-2 大三
    'vi':  [5, 7, 9],      // 6-1-3 小三
    'vii': [6, 8, 10]      // 7-2-4 减三
  };

  const indices = chordMap[chordSymbol];
  if (!indices) return null;

  return getChordFreqsFromScale(indices, scale);
}

/**
 * 获取所有三和弦数据
 */
function getScaleTriads(rootNote) {
  const chords = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];
  const result = {};
  chords.forEach(chord => {
    result[chord] = { freq: getTriadFreqs(rootNote, chord) };
  });
  return result;
}

// 预计算所有调的三和弦数据
const SCALE_TRIADS = {};
ROOT_NOTES.forEach(root => {
  SCALE_TRIADS[root] = getScaleTriads(root);
});

// ==================== Level 2: 七和弦 ====================

/**
 * 获取七和弦频率
 */
function getSeventhFreqs(rootNote, chordSymbol) {
  const scale = getMajorScale(rootNote);

  // 七和弦符号到音阶索引的映射（4音）
  const chordMap = {
    'I△7':   [0, 2, 4, 6],    // 1-3-5-7 大七
    'ii-7':  [1, 3, 5, 7],    // 2-4-6-1 小七
    'iii-7': [2, 4, 6, 8],    // 3-5-7-2 小七
    'IV△7':  [3, 5, 7, 9],    // 4-6-1-3 大七
    'V7':    [4, 6, 8, 10],   // 5-7-2-4 属七
    'vi-7':  [5, 7, 9, 11],   // 6-1-3-5 小七
    'viiØ7': [6, 8, 10, 12]   // 7-2-4-6 半减七
  };

  const indices = chordMap[chordSymbol];
  if (!indices) return null;

  return getChordFreqsFromScale(indices, scale);
}

/**
 * 获取所有七和弦数据
 */
function getScaleSevenths(rootNote) {
  const chords = ['I△7', 'ii-7', 'iii-7', 'IV△7', 'V7', 'vi-7', 'viiØ7'];
  const result = {};
  chords.forEach(chord => {
    result[chord] = { freq: getSeventhFreqs(rootNote, chord) };
  });
  return result;
}

// 预计算所有调的七和弦数据
const SCALE_SEVENTHS = {};
ROOT_NOTES.forEach(root => {
  SCALE_SEVENTHS[root] = getScaleSevenths(root);
});

// ==================== Level 3: 离调和弦 ====================

/**
 * 获取混合利底亚调式 (Mixolydian)
 */
function getMixolydianScale(rootNote) {
  const rootIndex = SEMITONE_ORDER.indexOf(rootNote);
  // 1-2-3-4-5-6-b7 = 0,2,4,5,7,9,10
  return [0, 2, 4, 5, 7, 9, 10].map(i => (rootIndex + i) % 12);
}

/**
 * 获取利底亚调式 (Lydian)
 */
function getLydianScale(rootNote) {
  const rootIndex = SEMITONE_ORDER.indexOf(rootNote);
  // 1-2-3-#4-5-6-7 = 0,2,4,6,7,9,11
  return [0, 2, 4, 6, 7, 9, 11].map(i => (rootIndex + i) % 12);
}

/**
 * 获取离调和弦频率
 * 支持副属和弦、借调和弦等
 */
function getChromaticFreqs(rootNote, chordSymbol) {
  const majorScale = getMajorScale(rootNote);
  const minorScale = getMinorScale(rootNote); // 平行小调

  // 首先检查是否是普通三和弦
  const triadMap = {
    'I':   [0, 2, 4],
    'ii':  [1, 3, 5],
    'iii': [2, 4, 6],
    'IV':  [3, 5, 7],
    'V':   [4, 6, 8],
    'vi':  [5, 7, 9],
    'vii': [6, 8, 10]
  };

  if (triadMap[chordSymbol]) {
    return getChordFreqsFromScale(triadMap[chordSymbol], majorScale);
  }

  // 检查是否是七和弦
  const seventhMap = {
    'I△7':   [0, 2, 4, 6],
    'ii-7':  [1, 3, 5, 7],
    'iii-7': [2, 4, 6, 8],
    'IV△7':  [3, 5, 7, 9],
    'V7':    [4, 6, 8, 10],
    'vi-7':  [5, 7, 9, 11],
    'viiØ7': [6, 8, 10, 12]
  };

  if (seventhMap[chordSymbol]) {
    return getChordFreqsFromScale(seventhMap[chordSymbol], majorScale);
  }

  // 副属和弦 (V7/x)
  // V7/vi = 以 vi 为临时主音的属七和弦
  const secondaryDominantMap = {
    'V7/vi': { root: 5, type: 'dominant' },
    'V7/V':  { root: 4, type: 'dominant' },
    'V7/IV': { root: 3, type: 'dominant' },
    'V7/ii': { root: 1, type: 'dominant' },
    'V7/iii': { root: 2, type: 'dominant' }
  };

  if (secondaryDominantMap[chordSymbol]) {
    const { root } = secondaryDominantMap[chordSymbol];
    // 获取临时主音
    const targetRootSemitone = majorScale[root];
    const targetRootName = SEMITONE_ORDER[targetRootSemitone];
    // 属七和弦 = 1-3-5-b7 (从临时主音的混合利底亚)
    const dominantScale = getMixolydianScale(targetRootName);
    return getChordFreqsFromScale([0, 2, 4, 6], dominantScale);
  }

  // 借调和弦 (来自平行小调)
  const borrowedMap = {
    'iv':   [3, 5, 7],
    'bVI':  [5, 7, 9],
    'bVII': [6, 8, 10],
    'VII':  [6, 8, 10],
    'III':  [2, 4, 6],
    'II':   [1, 3, 5],
    'iv7':  [3, 5, 7, 9]
  };

  if (borrowedMap[chordSymbol]) {
    const indices = borrowedMap[chordSymbol];
    // iv, bVI, bVII, III 来自小调
    if (['iv', 'bVI', 'bVII', 'VII', 'III', 'iv7'].includes(chordSymbol)) {
      return getChordFreqsFromScale(indices, minorScale);
    }
    // II 来自 Lydian
    if (chordSymbol === 'II') {
      const lydianScale = getLydianScale(rootNote);
      return getChordFreqsFromScale(indices, lydianScale);
    }
  }

  return null;
}

/**
 * 获取所有离调和弦数据
 */
function getScaleChromatic(rootNote) {
  const chords = [
    'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii',
    'V7/vi', 'V7/V', 'V7/IV', 'V7/ii',
    'iv', 'bVI', 'bVII', 'III', 'II'
  ];
  const result = {};
  chords.forEach(chord => {
    const freq = getChromaticFreqs(rootNote, chord);
    if (freq) {
      result[chord] = { freq };
    }
  });
  return result;
}

// 预计算所有调的离调和弦数据
const SCALE_CHROMATIC = {};
ROOT_NOTES.forEach(root => {
  SCALE_CHROMATIC[root] = getScaleChromatic(root);
});

// ==================== 题目生成 ====================

/**
 * 获取指定级别的和弦数据
 */
function getChordData(level, rootNote) {
  switch (level) {
    case 'triads':
      return SCALE_TRIADS[rootNote];
    case 'sevenths':
      return SCALE_SEVENTHS[rootNote];
    case 'chromatic':
      return SCALE_CHROMATIC[rootNote];
    default:
      return SCALE_TRIADS[rootNote];
  }
}

/**
 * 获取指定级别的走向题库
 */
function getProgressions(level) {
  switch (level) {
    case 'triads':
      return progressions.TRIADS_PROGRESSIONS;
    case 'sevenths':
      return progressions.SEVENTHS_PROGRESSIONS;
    case 'chromatic':
      return progressions.CHROMATIC_PROGRESSIONS;
    default:
      return progressions.TRIADS_PROGRESSIONS;
  }
}

/**
 * 获取指定级别的所有可用和弦符号
 */
function getAvailableChords(level) {
  switch (level) {
    case 'triads':
      return ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];
    case 'sevenths':
      return ['I△7', 'ii-7', 'iii-7', 'IV△7', 'V7', 'vi-7', 'viiØ7'];
    case 'chromatic':
      return ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii',
              'V7/vi', 'V7/V', 'V7/IV', 'V7/ii',
              'iv', 'bVI', 'bVII', 'III', 'II'];
    default:
      return ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];
  }
}

/**
 * 随机选择一个走向
 */
function pickRandomProgression(level) {
  const progs = getProgressions(level);
  return progs[Math.floor(Math.random() * progs.length)];
}

/**
 * 生成4个选项（包含正确答案 + 3个干扰项）
 */
function generateOptions(correctAnswer, level) {
  const available = getAvailableChords(level);
  const options = [correctAnswer];
  const remaining = available.filter(c => c !== correctAnswer);

  // 随机选3个干扰项
  while (options.length < 4 && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    options.push(remaining.splice(idx, 1)[0]);
  }

  // 洗牌
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return options;
}

/**
 * 判断两个走向是否相同
 */
function isSameProgression(prog1, prog2) {
  if (!prog1 || !prog2) return false;
  if (prog1.length !== prog2.length) return false;
  return prog1.every((chord, idx) => chord === prog2[idx]);
}

/**
 * 生成一道完整题目
 * @param {string} rootNote - 根音
 * @param {string} level - 级别 ('triads', 'sevenths', 'chromatic')
 * @param {string[]} prevProgression - 上一题的走向（用于避免连续重复）
 * @param {number} prevBlankIndex - 上一题的填空位置（用于非连续相同走向时确保不同位置）
 * @param {number} numBlanks - 填空数量（默认1）
 */
function generateQuestion(rootNote, level = 'triads', prevProgression = null, prevBlankIndex = -1, numBlanks = 1) {
  // 1. 从题库随机选择一个走向
  let progression = pickRandomProgression(level);
  let attempts = 0;
  const maxAttempts = 10;

  // 避免连续出现相同的走向
  while (isSameProgression(progression, prevProgression) && attempts < maxAttempts) {
    progression = pickRandomProgression(level);
    attempts++;
  }

  // 2. 随机选位置作为"空心"
  // 确保填空数量不超过进行长度
  const actualNumBlanks = Math.min(numBlanks, progression.length);

  // 生成所有可能的位置
  const allIndices = Array.from({ length: progression.length }, (_, i) => i);

  // 随机选择 actualNumBlanks 个不同的位置
  const blankIndices = [];
  const shuffledIndices = [...allIndices].sort(() => Math.random() - 0.5);
  for (let i = 0; i < actualNumBlanks; i++) {
    blankIndices.push(shuffledIndices[i]);
  }
  blankIndices.sort((a, b) => a - b); // 按顺序排列

  // 获取所有正确答案
  const correctAnswers = blankIndices.map(idx => progression[idx]);

  // 3. 生成4个选项（包含所有正确答案）
  const available = getAvailableChords(level);
  const options = [...correctAnswers];

  // 从剩余和弦中选择干扰项
  const remaining = available.filter(c => !correctAnswers.includes(c));
  while (options.length < 4 && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    options.push(remaining.splice(idx, 1)[0]);
  }

  // 洗牌
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  // 兼容单填空模式
  const blankIndex = blankIndices[0];
  const correctAnswer = correctAnswers[0];

  return {
    progression,
    blankIndex,      // 兼容：第一个填空的位置
    correctAnswer,   // 兼容：第一个填空的答案
    blankIndices,    // 新：所有填空位置
    correctAnswers,  // 新：所有填空答案
    options
  };
}

/**
 * 随机选择根音
 */
function randomRootNote() {
  return ROOT_NOTES[Math.floor(Math.random() * ROOT_NOTES.length)];
}

/**
 * 获取和弦频率（根据级别自动选择）
 */
function getChordFrequencies(rootNote, chordSymbol, level) {
  switch (level) {
    case 'triads':
      return getTriadFreqs(rootNote, chordSymbol);
    case 'sevenths':
      return getSeventhFreqs(rootNote, chordSymbol);
    case 'chromatic':
      return getChromaticFreqs(rootNote, chordSymbol);
    default:
      return getTriadFreqs(rootNote, chordSymbol);
  }
}

module.exports = {
  ROOT_NOTES,
  ROOT_FREQUENCIES,
  SCALE_TRIADS,
  SCALE_SEVENTHS,
  SCALE_CHROMATIC,
  randomRootNote,
  generateQuestion,
  getChordFrequencies,
  getChordData,
  getAvailableChords
};
