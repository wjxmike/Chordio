/**
 * 歌曲模式题组：生成、预下载调度
 */

const songs = require('../data/songs');
const songCache = require('./song-cache');

const STORAGE_KEY = 'songNextSession';
const MAX_QUESTIONS = 10;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function selectQuestions(maxQuestions = MAX_QUESTIONS) {
  const allQuestions = songs.getAllQuestions();
  const shuffled = shuffleArray([...allQuestions]);
  return shuffled.slice(0, Math.min(maxQuestions, shuffled.length));
}

function saveSession(session) {
  wx.setStorageSync(STORAGE_KEY, session);
}

function loadSession() {
  try {
    const session = wx.getStorageSync(STORAGE_KEY);
    if (!session || !Array.isArray(session.questions) || !session.createdAt) {
      return null;
    }
    if (Date.now() - session.createdAt > SESSION_TTL_MS) {
      wx.removeStorageSync(STORAGE_KEY);
      return null;
    }
    if (session.questions.length === 0) {
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

/**
 * 重排下载队列：当前题 + 下一题优先，其余按题目顺序
 */
function scheduleSessionDownloads(questions, currentIndex = 0) {
  songCache.scheduleSession(questions, currentIndex);

  const current = questions[currentIndex];
  if (current && current.audio) {
    songCache.prioritizeDownload(current.audio).catch((err) => {
      console.warn('[song-session] current clip download failed:', err);
    });
  }
}

/**
 * 为 App 启动 / 首页预下载准备题组（歌曲页每次进入会重新随机，此处仅用于预热缓存）
 */
function prepareNextSessionAndPrefetchFirst(options = {}) {
  songCache.ensureDir();

  let session = options.forceNew ? null : loadSession();
  if (!session) {
    session = {
      questions: selectQuestions(MAX_QUESTIONS),
      createdAt: Date.now()
    };
    saveSession(session);
  }

  scheduleSessionDownloads(session.questions, 0);
  return session;
}

function peekSessionFirstAudio() {
  const session = loadSession();
  if (!session || !session.questions.length) {
    return null;
  }
  return session.questions[0].audio || null;
}

module.exports = {
  MAX_QUESTIONS,
  selectQuestions,
  prepareNextSessionAndPrefetchFirst,
  scheduleSessionDownloads,
  peekSessionFirstAudio
};
