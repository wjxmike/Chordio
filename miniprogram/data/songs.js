/**
 * Chord Hero - 歌曲模式题库
 */

// 云存储基础路径
const CLOUD_BASE = 'cloud://cloudbase-3gk50z3ibc7a8b9f.636c-cloudbase-3gk50z3ibc7a8b9f-1391793431';

// 歌曲基本信息
const SONGS = {
  '1': {
    id: '1',
    title: '丑八怪',
    artist: '薛之谦',
    album: '意外',
    cover: `${CLOUD_BASE}/covers/1.jpeg`
  },
  '2': {
    id: '2',
    title: '多远都要在一起',
    artist: '邓紫棋',
    album: '新的心跳',
    cover: `${CLOUD_BASE}/covers/2.jpeg`
  },
  '3': {
    id: '3',
    title: '从没去过巴塞隆纳',
    artist: '告五人',
    album: '我肯定在几百年前就说过爱你',
    cover: `${CLOUD_BASE}/covers/3.jpeg`
  },
  '4': {
    id: '4',
    title: '只要你开心',
    artist: 'JOYCE 就以斯',
    album: '才華換桃花',
    cover: `${CLOUD_BASE}/covers/4.jpeg`
  },
  '5': {
    id: '5',
    title: '我想要做点流行音乐',
    artist: '回环 RingAgain',
    album: '我想要做点流行音乐',
    cover: `${CLOUD_BASE}/covers/5.jpeg`
  },
  '6': {
    id: '6',
    title: 'We are',
    artist: 'ONE OK ROCK',
    album: 'Ambitions',
    cover: `${CLOUD_BASE}/covers/6.jpeg`
  },
  '7': {
    id: '7',
    title: '凄美地',
    artist: '郭顶',
    album: '飞行器的执行周期',
    cover: `${CLOUD_BASE}/covers/7.jpeg`
  },
  '8': {
    id: '8',
    title: '鲜花 (Live)',
    artist: '回春丹',
    album: '乐队的夏天3',
    cover: `${CLOUD_BASE}/covers/8.jpeg`
  },
  '9': {
    id: '9',
    title: 'Heartbreak Anniversary',
    artist: 'GIVEON',
    album: 'Heartbreak Anniversary',
    cover: `${CLOUD_BASE}/covers/9.jpeg`
  },
  '10': {
    id: '10',
    title: 'When We Were Young',
    artist: 'Adele',
    album: '25',
    cover: `${CLOUD_BASE}/covers/10.jpeg`
  }
};

// 和弦记号转换：CSV -> 系统内部
function convertChordSymbol(symbol) {
  const map = {
    'IM7': 'I△7',
    'IVM7': 'IV△7',
    'iiM7': 'ii△7',
    'ii-7': 'ii-7',
    'iii-7': 'iii-7',
    'vi-7': 'vi-7',
    'v-7': 'v-7'
  };
  return map[symbol] || symbol;
}

// 题目列表
const QUESTIONS = [
  // 1. 丑八怪 - 薛之谦
  {
    id: '1-1',
    songId: '1',
    audio: `${CLOUD_BASE}/song-audio/1-1.mp3`,
    rootNote: 'Db',
    progression: ['IV△7', 'I△7', 'IV△7', 'I△7']
  },
  {
    id: '1-2',
    songId: '1',
    audio: `${CLOUD_BASE}/song-audio/1-2.mp3`,
    rootNote: 'Db',
    progression: ['IV△7', 'iii-7']
  },

  // 2. 多远都要在一起 - 邓紫棋
  {
    id: '2-1',
    songId: '2',
    audio: `${CLOUD_BASE}/song-audio/2-1.mp3`,
    rootNote: 'Eb',
    progression: ['I', 'iii', 'IV', 'V']
  },
  {
    id: '2-2',
    songId: '2',
    audio: `${CLOUD_BASE}/song-audio/2-2.mp3`,
    rootNote: 'Eb',
    progression: ['vi', 'III7', 'IV', 'V', '#V']
  },
  {
    id: '2-3',
    songId: '2',
    audio: `${CLOUD_BASE}/song-audio/2-3.mp3`,
    rootNote: 'E',
    progression: ['I', 'iii', 'IV', 'V']
  },

  // 3. 从没去过巴塞隆纳 - 告五人
  {
    id: '3-1',
    songId: '3',
    audio: `${CLOUD_BASE}/song-audio/3-1.mp3`,
    rootNote: 'C',
    progression: ['IV', 'I', 'V', 'vi']
  },
  {
    id: '3-2',
    songId: '3',
    audio: `${CLOUD_BASE}/song-audio/3-2.mp3`,
    rootNote: 'C',
    progression: ['vi', 'V', 'IV']
  },
  {
    id: '3-3',
    songId: '3',
    audio: `${CLOUD_BASE}/song-audio/3-3.mp3`,
    rootNote: 'C',
    progression: ['vi', 'V', 'IV', 'I']
  },

  // 4. 只要你开心 - JOYCE 就以斯
  {
    id: '4-1',
    songId: '4',
    audio: `${CLOUD_BASE}/song-audio/4-1.mp3`,
    rootNote: 'E',
    progression: ['I△7', 'IV']
  },
  {
    id: '4-2',
    songId: '4',
    audio: `${CLOUD_BASE}/song-audio/4-2.mp3`,
    rootNote: 'E',
    progression: ['I', 'I', 'v-7']
  },

  // 5. 我想要做点流行音乐 - 回环 RingAgain
  {
    id: '5-1',
    songId: '5',
    audio: `${CLOUD_BASE}/song-audio/5-1.mp3`,
    rootNote: 'Eb',
    progression: ['I', 'I7', 'IV△7', 'iv']
  },
  {
    id: '5-2',
    songId: '5',
    audio: `${CLOUD_BASE}/song-audio/5-2.mp3`,
    rootNote: 'Eb',
    progression: ['I', 'I7', 'IV△7', 'IV']
  },

  // 6. We are - ONE OK ROCK
  {
    id: '6-1',
    songId: '6',
    audio: `${CLOUD_BASE}/song-audio/6-1.mp3`,
    rootNote: 'F',
    progression: ['IV', 'V', 'vi', 'iii']
  },
  {
    id: '6-2',
    songId: '6',
    audio: `${CLOUD_BASE}/song-audio/6-2.mp3`,
    rootNote: 'F',
    progression: ['IV', 'V', 'vi']
  },
  {
    id: '6-3',
    songId: '6',
    audio: `${CLOUD_BASE}/song-audio/6-3.mp3`,
    rootNote: 'F',
    progression: ['IV', 'V', 'vi', 'iii']
  },

  // 7. 凄美地 - 郭顶 (Fm 小调)
  {
    id: '7-1',
    songId: '7',
    audio: `${CLOUD_BASE}/song-audio/7-1.mp3`,
    rootNote: 'F',
    isMinor: true,  // Fm = F 小调
    progression: ['i', 'VI', 'III', 'V7']
  },
  {
    id: '7-2',
    songId: '7',
    audio: `${CLOUD_BASE}/song-audio/7-2.mp3`,
    rootNote: 'F',
    isMinor: true,  // Fm = F 小调
    progression: ['VI', 'III', 'V', 'i', 'VII']
  },

  // 8. 鲜花 (Live) - 回春丹
  {
    id: '8-1',
    songId: '8',
    audio: `${CLOUD_BASE}/song-audio/8-1.mp3`,
    rootNote: 'E',
    progression: ['I', 'V', 'vi', 'IV']
  },
  {
    id: '8-2',
    songId: '8',
    audio: `${CLOUD_BASE}/song-audio/8-2.mp3`,
    rootNote: 'E',
    progression: ['vi', 'IV', 'iv']
  },

  // 9. Heartbreak Anniversary - GIVEON
  {
    id: '9-1',
    songId: '9',
    audio: `${CLOUD_BASE}/song-audio/9-1.mp3`,
    rootNote: 'C',
    progression: ['I△7', 'III7', 'IV△7']
  },
  {
    id: '9-2',
    songId: '9',
    audio: `${CLOUD_BASE}/song-audio/9-2.mp3`,
    rootNote: 'C',
    progression: ['I△7', 'III7', 'IV△7']
  },

  // 10. When We Were Young - Adele
  {
    id: '10-1',
    songId: '10',
    audio: `${CLOUD_BASE}/song-audio/10-1.mp3`,
    rootNote: 'Eb',
    progression: ['vi', 'iii', 'IV', 'iii', 'ii']
  },
  {
    id: '10-2',
    songId: '10',
    audio: `${CLOUD_BASE}/song-audio/10-2.mp3`,
    rootNote: 'Eb',
    progression: ['IV', 'V', 'iii', 'IV']
  },
  {
    id: '10-3',
    songId: '10',
    audio: `${CLOUD_BASE}/song-audio/10-3.mp3`,
    rootNote: 'Eb',
    progression: ['I', 'iii', 'IV', 'V']
  }
];

/**
 * 获取歌曲信息
 */
function getSong(songId) {
  return SONGS[songId];
}

/**
 * 获取题目
 */
function getQuestion(questionId) {
  return QUESTIONS.find(q => q.id === questionId);
}

/**
 * 获取某歌曲的所有题目
 */
function getQuestionsBySong(songId) {
  return QUESTIONS.filter(q => q.songId === songId);
}

/**
 * 获取所有题目（按顺序）
 */
function getAllQuestions() {
  return [...QUESTIONS];
}

module.exports = {
  SONGS,
  QUESTIONS,
  getSong,
  getQuestion,
  getQuestionsBySong,
  getAllQuestions
};
