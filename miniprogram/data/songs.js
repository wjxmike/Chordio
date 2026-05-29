/**
 * Chord Hero - 歌曲模式题库
 */

// 资源相对路径（播放时用 config/assets.js 解析为 CDN 或云 fileID）

// 歌曲基本信息
const SONGS = {
  '1': {
    id: '1',
    title: '丑八怪',
    artist: '薛之谦',
    album: '意外',
    cover: `covers/1.jpeg`
  },
  '2': {
    id: '2',
    title: '多远都要在一起',
    artist: '邓紫棋',
    album: '新的心跳',
    cover: `covers/2.jpeg`
  },
  '3': {
    id: '3',
    title: '从没去过巴塞隆纳',
    artist: '告五人',
    album: '我肯定在几百年前就说过爱你',
    cover: `covers/3.jpeg`
  },
  '4': {
    id: '4',
    title: '只要你开心',
    artist: 'JOYCE 就以斯',
    album: '才華換桃花',
    cover: `covers/4.jpeg`
  },
  '5': {
    id: '5',
    title: '我想要做点流行音乐',
    artist: '回环 RingAgain',
    album: '我想要做点流行音乐',
    cover: `covers/5.jpeg`
  },
  '6': {
    id: '6',
    title: 'We are',
    artist: 'ONE OK ROCK',
    album: 'Ambitions',
    cover: `covers/6.jpeg`
  },
  '7': {
    id: '7',
    title: '凄美地',
    artist: '郭顶',
    album: '飞行器的执行周期',
    cover: `covers/7.jpeg`
  },
  '8': {
    id: '8',
    title: '鲜花 (Live)',
    artist: '回春丹',
    album: '乐队的夏天3',
    cover: `covers/8.jpeg`
  },
  '9': {
    id: '9',
    title: 'Heartbreak Anniversary',
    artist: 'GIVEON',
    album: 'Heartbreak Anniversary',
    cover: `covers/9.jpeg`
  },
  '10': {
    id: '10',
    title: 'When We Were Young',
    artist: 'Adele',
    album: '25',
    cover: `covers/10.jpeg`
  },
  '11': {
    id: '11',
    title: '5:10 a.m.',
    artist: '傻子與白痴',
    album: '夜场梦少',
    cover: `covers/11.jpeg`
  },
  '12': {
    id: '12',
    title: 'Changes',
    artist: 'Charlie Puth',
    album: 'Changes',
    cover: `covers/12.jpeg`
  },
  '13': {
    id: '13',
    title: 'Lose Control',
    artist: 'Teddy Swims',
    album: 'Lose Control',
    cover: `covers/13.jpeg`
  },
  '14': {
    id: '14',
    title: 'Messy',
    artist: 'Lola Young',
    album: 'Messy',
    cover: `covers/14.jpeg`
  },
  '15': {
    id: '15',
    title: 'Mojito',
    artist: 'Jay Chou',
    album: '最伟大的作品',
    cover: `covers/15.jpeg`
  },
  '16': {
    id: '16',
    title: 'Replay',
    artist: 'SHINee',
    album: 'The SHINee World',
    cover: `covers/16.jpeg`
  },
  '17': {
    id: '17',
    title: 'Rolling in the Deep',
    artist: 'Adele',
    album: '21',
    cover: `covers/17.jpeg`
  },
  '18': {
    id: '18',
    title: 'Satisfied',
    artist: 'Renée Elise Goldsberry',
    album: 'Hamilton',
    cover: `covers/18.jpeg`
  },
  '19': {
    id: '19',
    title: '你要的全拿走',
    artist: '胡彦斌',
    album: '覅忒好',
    cover: `covers/19.jpeg`
  },
  '20': {
    id: '20',
    title: '王妃',
    artist: '萧敬腾',
    album: '王妃',
    cover: `covers/20.jpeg`
  }
};

// 题目列表
const QUESTIONS = [
  // 1. 丑八怪 - 薛之谦
  {
    id: '1-1',
    songId: '1',
    audio: `song-audio/1-1.mp3`,
    rootNote: 'Db',
    progression: ['IV△7', 'I△7', 'IV△7', 'I△7']
  },
  {
    id: '1-2',
    songId: '1',
    audio: `song-audio/1-2.mp3`,
    rootNote: 'Db',
    progression: ['IV△7', 'iii-7']
  },

  // 2. 多远都要在一起 - 邓紫棋
  {
    id: '2-1',
    songId: '2',
    audio: `song-audio/2-1.mp3`,
    rootNote: 'Eb',
    progression: ['I', 'iii', 'IV', 'V']
  },
  {
    id: '2-2',
    songId: '2',
    audio: `song-audio/2-2.mp3`,
    rootNote: 'Eb',
    progression: ['vi', 'III7', 'IV', 'V', '#V']
  },
  {
    id: '2-3',
    songId: '2',
    audio: `song-audio/2-3.mp3`,
    rootNote: 'E',
    progression: ['I', 'iii', 'IV', 'V']
  },

  // 3. 从没去过巴塞隆纳 - 告五人
  {
    id: '3-1',
    songId: '3',
    audio: `song-audio/3-1.mp3`,
    rootNote: 'C',
    progression: ['IV', 'I', 'V', 'vi']
  },
  {
    id: '3-2',
    songId: '3',
    audio: `song-audio/3-2.mp3`,
    rootNote: 'C',
    progression: ['vi', 'V', 'IV']
  },
  {
    id: '3-3',
    songId: '3',
    audio: `song-audio/3-3.mp3`,
    rootNote: 'C',
    progression: ['vi', 'V', 'IV', 'I']
  },

  // 4. 只要你开心 - JOYCE 就以斯
  {
    id: '4-1',
    songId: '4',
    audio: `song-audio/4-1.mp3`,
    rootNote: 'E',
    progression: ['I△7', 'IV']
  },
  {
    id: '4-2',
    songId: '4',
    audio: `song-audio/4-2.mp3`,
    rootNote: 'E',
    progression: ['I', 'I', 'v-7']
  },

  // 5. 我想要做点流行音乐 - 回环 RingAgain
  {
    id: '5-1',
    songId: '5',
    audio: `song-audio/5-1.mp3`,
    rootNote: 'Eb',
    progression: ['I', 'I7', 'IV△7', 'iv']
  },
  {
    id: '5-2',
    songId: '5',
    audio: `song-audio/5-2.mp3`,
    rootNote: 'Eb',
    progression: ['I', 'I7', 'IV△7', 'IV']
  },

  // 6. We are - ONE OK ROCK
  {
    id: '6-1',
    songId: '6',
    audio: `song-audio/6-1.mp3`,
    rootNote: 'F',
    progression: ['IV', 'V', 'vi', 'iii']
  },
  {
    id: '6-2',
    songId: '6',
    audio: `song-audio/6-2.mp3`,
    rootNote: 'F',
    progression: ['IV', 'V', 'vi']
  },
  {
    id: '6-3',
    songId: '6',
    audio: `song-audio/6-3.mp3`,
    rootNote: 'F',
    progression: ['IV', 'V', 'vi', 'iii']
  },

  // 7. 凄美地 - 郭顶 (Fm 小调)
  {
    id: '7-1',
    songId: '7',
    audio: `song-audio/7-1.mp3`,
    rootNote: 'F',
    isMinor: true,
    progression: ['i', 'VI', 'III', 'V7']
  },
  {
    id: '7-2',
    songId: '7',
    audio: `song-audio/7-2.mp3`,
    rootNote: 'F',
    isMinor: true,
    progression: ['VI', 'III', 'V', 'i', 'VII']
  },

  // 8. 鲜花 (Live) - 回春丹
  {
    id: '8-1',
    songId: '8',
    audio: `song-audio/8-1.mp3`,
    rootNote: 'E',
    progression: ['I', 'V', 'vi', 'IV']
  },
  {
    id: '8-2',
    songId: '8',
    audio: `song-audio/8-2.mp3`,
    rootNote: 'E',
    progression: ['vi', 'IV', 'iv']
  },

  // 9. Heartbreak Anniversary - GIVEON
  {
    id: '9-1',
    songId: '9',
    audio: `song-audio/9-1.mp3`,
    rootNote: 'C',
    progression: ['I△7', 'III7', 'IV△7']
  },
  {
    id: '9-2',
    songId: '9',
    audio: `song-audio/9-2.mp3`,
    rootNote: 'C',
    progression: ['I△7', 'III7', 'IV△7']
  },

  // 10. When We Were Young - Adele
  {
    id: '10-1',
    songId: '10',
    audio: `song-audio/10-1.mp3`,
    rootNote: 'Eb',
    progression: ['vi', 'iii', 'IV', 'iii', 'ii']
  },
  {
    id: '10-2',
    songId: '10',
    audio: `song-audio/10-2.mp3`,
    rootNote: 'Eb',
    progression: ['IV', 'V', 'iii', 'IV']
  },
  {
    id: '10-3',
    songId: '10',
    audio: `song-audio/10-3.mp3`,
    rootNote: 'Eb',
    progression: ['I', 'iii', 'IV', 'V']
  },

  // 11. 5:10 a.m. - 傻子與白痴
  {
    id: '11-1',
    songId: '11',
    audio: `song-audio/11-1.mp3`,
    rootNote: 'F',
    progression: ['iii', 'ii', 'I', 'III7']
  },
  {
    id: '11-2',
    songId: '11',
    audio: `song-audio/11-2.mp3`,
    rootNote: 'F',
    progression: ['IV', 'V', 'III7', 'vi']
  },

  // 12. Changes - Charlie Puth
  {
    id: '12-1',
    songId: '12',
    audio: `song-audio/12-1.mp3`,
    rootNote: 'F',
    progression: ['I', 'V', 'IV', 'V']
  },
  {
    id: '12-2',
    songId: '12',
    audio: `song-audio/12-2.mp3`,
    rootNote: 'F',
    progression: ['V', 'ii-7', 'IV△7', 'vi-7']
  },
  {
    id: '12-3',
    songId: '12',
    audio: `song-audio/12-3.mp3`,
    rootNote: 'F',
    progression: ['ii-7', 'iii-7', 'ii-7', 'IV']
  },

  // 13. Lose Control - Teddy Swims
  {
    id: '13-1',
    songId: '13',
    audio: `song-audio/13-1.mp3`,
    rootNote: 'A',
    progression: ['iv', 'I△7']
  },
  {
    id: '13-2',
    songId: '13',
    audio: `song-audio/13-2.mp3`,
    rootNote: 'A',
    progression: ['iv', 'I']
  },

  // 14. Messy - Lola Young
  {
    id: '14-1',
    songId: '14',
    audio: `song-audio/14-1.mp3`,
    rootNote: 'A',
    progression: ['IV', 'V']
  },
  {
    id: '14-2',
    songId: '14',
    audio: `song-audio/14-2.mp3`,
    rootNote: 'A',
    progression: ['IV△7', 'V']
  },
  {
    id: '14-3',
    songId: '14',
    audio: `song-audio/14-3.mp3`,
    rootNote: 'A',
    progression: ['IV△7', 'V']
  },

  // 15. Mojito - Jay Chou (Am 小调)
  {
    id: '15-1',
    songId: '15',
    audio: `song-audio/15-1.mp3`,
    rootNote: 'A',
    isMinor: true,
    progression: ['iv-7', 'V7', 'i']
  },
  {
    id: '15-2',
    songId: '15',
    audio: `song-audio/15-2.mp3`,
    rootNote: 'A',
    isMinor: true,
    progression: ['iv', 'V7', 'i']
  },

  // 16. Replay - SHINee
  {
    id: '16-1',
    songId: '16',
    audio: `song-audio/16-1.mp3`,
    rootNote: 'Ab',
    progression: ['IV', 'V', 'vi', 'IV']
  },
  {
    id: '16-2',
    songId: '16',
    audio: `song-audio/16-2.mp3`,
    rootNote: 'Ab',
    progression: ['IV', 'V', 'vi', 'IV']
  },

  // 17. Rolling in the Deep - Adele (Cm 小调)
  {
    id: '17-1',
    songId: '17',
    audio: `song-audio/17-1.mp3`,
    rootNote: 'C',
    isMinor: true,
    progression: ['i', 'v', 'VII', 'v', 'VII']
  },
  {
    id: '17-2',
    songId: '17',
    audio: `song-audio/17-2.mp3`,
    rootNote: 'C',
    isMinor: true,
    progression: ['i', 'VII', 'VI', 'VII']
  },

  // 18. Satisfied - Renée Elise Goldsberry (Cm 小调)
  {
    id: '18-1',
    songId: '18',
    audio: `song-audio/18-1.mp3`,
    rootNote: 'C',
    isMinor: true,
    progression: ['i', 'III', 'iv']
  },
  {
    id: '18-2',
    songId: '18',
    audio: `song-audio/18-2.mp3`,
    rootNote: 'C',
    isMinor: true,
    progression: ['i', 'III']
  },

  // 19. 你要的全拿走 - 胡彦斌 (Em 小调)
  {
    id: '19-1',
    songId: '19',
    audio: `song-audio/19-1.mp3`,
    rootNote: 'E',
    isMinor: true,
    progression: ['I', 'iv', 'I', 'iv']
  },
  {
    id: '19-2',
    songId: '19',
    audio: `song-audio/19-2.mp3`,
    rootNote: 'E',
    isMinor: true,
    progression: ['IV△7', 'I△7', 'ii-7']
  },
  {
    id: '19-3',
    songId: '19',
    audio: `song-audio/19-3.mp3`,
    rootNote: 'E',
    isMinor: true,
    progression: ['iv-7', 'V', 'IV']
  },

  // 20. 王妃 - 萧敬腾 (#Fm 小调)
  {
    id: '20-1',
    songId: '20',
    audio: `song-audio/20-1.mp3`,
    rootNote: 'F#',
    isMinor: true,
    progression: ['i', 'v', 'i']
  },
  {
    id: '20-2',
    songId: '20',
    audio: `song-audio/20-2.mp3`,
    rootNote: 'F#',
    isMinor: true,
    progression: ['i', 'VI', 'VII', 'III']
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
