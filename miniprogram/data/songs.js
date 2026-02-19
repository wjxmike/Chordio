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
  }
};

// 题目列表
const QUESTIONS = [
  {
    id: '1-1',
    songId: '1',
    audio: `${CLOUD_BASE}/song-audio/1-1.mp3`,
    rootNote: 'Db',
    // 原始: IVM7 IM7 IVM7 IM7 → IV△7 I△7 IV△7 I△7
    progression: ['IV△7', 'I△7', 'IV△7', 'I△7']
  },
  {
    id: '1-2',
    songId: '1',
    audio: `${CLOUD_BASE}/song-audio/1-2.mp3`,
    rootNote: 'Db',
    // 原始: IVM7 iii-7 → IV△7 iii-7
    progression: ['IV△7', 'iii-7']
  },
  {
    id: '2-1',
    songId: '2',
    audio: `${CLOUD_BASE}/song-audio/2-1.mp3`,
    rootNote: 'Eb',
    // I iii IV V
    progression: ['I', 'iii', 'IV', 'V']
  },
  {
    id: '2-2',
    songId: '2',
    audio: `${CLOUD_BASE}/song-audio/2-2.mp3`,
    rootNote: 'Eb',
    // vi III7 IV V #V
    progression: ['vi', 'III7', 'IV', 'V', '#V']
  },
  {
    id: '2-3',
    songId: '2',
    audio: `${CLOUD_BASE}/song-audio/2-3.mp3`,
    rootNote: 'E',
    // I iii IV V
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
