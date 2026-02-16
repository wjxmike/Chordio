/**
 * Chord Hero - 和弦数据模块
 * 包含12个调的大调音阶三和弦数据
 */

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

// 大调音阶的半音步进：全-全-半-全-全-全-半
// 从根音开始的半音间隔：0, 2, 4, 5, 7, 9, 11
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

/**
 * 根据根音获取大调音阶的7个音（半音索引）
 */
function getMajorScale(rootNote) {
  const rootIndex = SEMITONE_ORDER.indexOf(rootNote);
  return MAJOR_SCALE_INTERVALS.map(interval => (rootIndex + interval) % 12);
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
 * 获取三和弦的三个音的频率
 * @param {number[]} scaleNoteIndices - 音阶音符索引数组 (0-6)
 * @param {number[]} scale - 大调音阶的半音索引数组
 */
function getTriadFreqs(scaleNoteIndices, scale) {
  return scaleNoteIndices.map(scaleIndex => {
    const semitoneIndex = scale[scaleIndex % 7];
    // 如果超过第6个音，需要升八度
    const octaveOffset = Math.floor(scaleIndex / 7);
    return semitoneToFreq(semitoneIndex, 4 + octaveOffset);
  });
}

/**
 * 获取指定根音的所有三和弦频率
 */
function getScaleTriads(rootNote) {
  const scale = getMajorScale(rootNote);

  // 每个和弦由音阶的第n, n+2, n+4个音组成（三度叠置）
  // I: 1,3,5 (scale[0], scale[2], scale[4])
  // ii: 2,4,6 (scale[1], scale[3], scale[5])
  // iii: 3,5,7 (scale[2], scale[4], scale[6])
  // IV: 4,6,8(1) -> scale[3], scale[5], scale[0]+12
  // V: 5,7,9(2) -> scale[4], scale[6], scale[1]+12
  // vi: 6,8(1),10(3) -> scale[5], scale[0]+12, scale[2]+12
  // vii: 7,9(2),11(4) -> scale[6], scale[1]+12, scale[3]+12

  return {
    'I':   { freq: getTriadFreqsFromScale([0, 2, 4], scale) },
    'ii':  { freq: getTriadFreqsFromScale([1, 3, 5], scale) },
    'iii': { freq: getTriadFreqsFromScale([2, 4, 6], scale) },
    'IV':  { freq: getTriadFreqsFromScale([3, 5, 7], scale) },
    'V':   { freq: getTriadFreqsFromScale([4, 6, 8], scale) },
    'vi':  { freq: getTriadFreqsFromScale([5, 7, 9], scale) },
    'vii': { freq: getTriadFreqsFromScale([6, 8, 10], scale) }
  };
}

/**
 * 从音阶获取三和弦频率（处理八度跨越）
 */
function getTriadFreqsFromScale(scaleIndices, scale) {
  return scaleIndices.map(idx => {
    const scaleIdx = idx % 7;
    const octaveOffset = Math.floor(idx / 7);
    const semitoneIndex = scale[scaleIdx];
    return semitoneToFreq(semitoneIndex, 4 + octaveOffset);
  });
}

// 预计算所有调的三和弦数据
const SCALE_TRIADS = {};
ROOT_NOTES.forEach(root => {
  SCALE_TRIADS[root] = getScaleTriads(root);
});

// 和弦权重（vii出现概率少）
const CHORD_WEIGHTS = {
  'I': 15, 'ii': 12, 'iii': 10,
  'IV': 15, 'V': 15, 'vi': 12, 'vii': 5
};

// 每题和弦数量分布
const CHORD_COUNT_WEIGHTS = { 2: 15, 3: 25, 4: 60 };

/**
 * 按权重随机选择
 */
function weightedRandom(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let random = Math.random() * total;

  for (const [key, weight] of entries) {
    random -= weight;
    if (random <= 0) return key;
  }
  return entries[0][0];
}

/**
 * 按权重抽取指定数量的不重复和弦
 */
function pickWeightedChords(count, weights) {
  const result = [];
  const available = { ...weights };

  while (result.length < count) {
    const chord = weightedRandom(available);
    if (!result.includes(chord)) {
      result.push(chord);
      // 已选中的和弦权重降低，增加多样性
      delete available[chord];
    }
  }

  return result;
}

/**
 * 生成4个选项（包含正确答案 + 3个干扰项）
 */
function generateOptions(correctAnswer, weights) {
  const options = [correctAnswer];
  const available = { ...weights };
  delete available[correctAnswer];

  while (options.length < 4) {
    const chord = weightedRandom(available);
    if (!options.includes(chord)) {
      options.push(chord);
      delete available[chord];
    }
  }

  // 洗牌
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return options;
}

/**
 * 生成一道完整题目
 */
function generateQuestion(rootNote) {
  // 1. 决定和弦数量（2/3/4）
  const chordCount = parseInt(weightedRandom(CHORD_COUNT_WEIGHTS));

  // 2. 随机抽取 chordCount 个不重复的和弦
  const progression = pickWeightedChords(chordCount, CHORD_WEIGHTS);

  // 3. 随机选一个位置作为"空心"（需要用户识别的）
  const blankIndex = Math.floor(Math.random() * chordCount);
  const correctAnswer = progression[blankIndex];

  // 4. 生成4个选项
  const options = generateOptions(correctAnswer, CHORD_WEIGHTS);

  return {
    progression,
    blankIndex,
    correctAnswer,
    options
  };
}

/**
 * 随机选择根音
 */
function randomRootNote() {
  return ROOT_NOTES[Math.floor(Math.random() * ROOT_NOTES.length)];
}

module.exports = {
  ROOT_NOTES,
  ROOT_FREQUENCIES,
  SCALE_TRIADS,
  CHORD_WEIGHTS,
  CHORD_COUNT_WEIGHTS,
  randomRootNote,
  generateQuestion
};
