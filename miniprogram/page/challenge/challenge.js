/**
 * Chord Hero - 挑战模式
 * 无限答题，5条命，计时器，难度递增
 */

const chords = require('../../utils/chords');
const audio = require('../../utils/audio');

// 难度配置
const DIFFICULTY_CONFIG = {
  // 分数阈值 -> { 时间, 填空数 }
  0: { time: 15, blanks: 1 },
  10: { time: 12, blanks: 1 },
  20: { time: 10, blanks: 2 },
  40: { time: 8, blanks: 2 },
  60: { time: 6, blanks: 2 },
  80: { time: 5, blanks: 3 },
};

Page({
  data: {
    // 游戏状态
    hearts: [true, true, true, true, true],  // 5条命
    score: 0,
    timer: 15,
    maxTime: 15,
    gameOver: false,

    // 当前题目
    rootNote: 'C',
    progression: [],     // [{symbol: 'I', isBlank: false, answer: null}, ...]
    correctAnswer: '',   // 当前填空的正确答案
    options: [],

    // 用户交互
    pageState: 'playing',  // 'playing' | 'idle' | 'selected' | 'correct' | 'wrong'
    selectedIndex: null,
  },

  // 计时器
  _timerInterval: null,
  _currentBlanks: 1,

  onLoad() {
    // 加载自定义字体
    wx.loadFontFace({
      family: 'Fredoka One',
      source: 'url("https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/FredokaOne-Regular.ttf")',
      success: (res) => console.log('Fredoka One 加载成功', res),
      fail: (err) => console.error('Fredoka One 加载失败', err)
    });

    wx.loadFontFace({
      family: '江城圆体',
      source: 'url("https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets@ed749764/fonts/JiangChengYuanTi-700W.ttf")',
      success: (res) => console.log('江城圆体 加载成功', res),
      fail: (err) => console.error('江城圆体 加载失败', err)
    });

    wx.loadFontFace({
      family: 'Protest Strike',
      source: 'url("https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/ProtestStrike.ttf")',
      success: (res) => console.log('Protest Strike 加载成功', res),
      fail: (err) => console.error('Protest Strike 加载失败', err)
    });

    // 初始化根音
    const rootNote = chords.randomRootNote();
    this.setData({ rootNote });

    // 生成第一题
    this.generateQuestion();
  },

  onReady() {
    setTimeout(() => {
      this.playCurrentProgression();
      this.startTimer();
    }, 300);
  },

  /**
   * 获取当前难度配置
   */
  getDifficultyConfig() {
    const { score } = this.data;
    let config = DIFFICULTY_CONFIG[0];

    for (const threshold of Object.keys(DIFFICULTY_CONFIG).sort((a, b) => b - a)) {
      if (score >= parseInt(threshold)) {
        config = DIFFICULTY_CONFIG[threshold];
        break;
      }
    }

    return config;
  },

  /**
   * 生成新题目
   */
  generateQuestion() {
    const { rootNote } = this.data;
    const config = this.getDifficultyConfig();
    this._currentBlanks = config.blanks;

    // 生成基础问题（单填空）
    const q = chords.generateQuestion(rootNote, 'triads', null, -1);

    // 转换为带标记的数组
    const progression = q.progression.map((symbol, index) => ({
      symbol,
      isBlank: index === q.blankIndex,
      answer: index === q.blankIndex ? q.correctAnswer : null
    }));

    this.setData({
      progression,
      correctAnswer: q.correctAnswer,
      options: q.options,
      pageState: 'playing',
      selectedIndex: null,
      timer: config.time,
      maxTime: config.time,
    });
  },

  /**
   * 播放当前和弦进行
   */
  playCurrentProgression() {
    const { progression, rootNote } = this.data;
    const symbols = progression.map(p => p.symbol);
    const ctx = audio.getAudioContext();
    audio.playProgression(ctx, symbols, rootNote, 'triads');

    // 播放结束后切换到 idle
    const duration = symbols.length * 1.6;
    setTimeout(() => {
      if (this.data.pageState === 'playing') {
        this.setData({ pageState: 'idle' });
      }
    }, duration * 1000);
  },

  /**
   * 开始计时器
   */
  startTimer() {
    this.stopTimer();
    this._timerInterval = setInterval(() => {
      const newTime = this.data.timer - 1;
      if (newTime <= 0) {
        // 时间到，扣血
        this.onTimeUp();
      } else {
        this.setData({ timer: newTime });
      }
    }, 1000);
  },

  stopTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  },

  /**
   * 时间到
   */
  onTimeUp() {
    this.stopTimer();
    this.loseHeart();
  },

  /**
   * 扣血
   */
  loseHeart() {
    const hearts = [...this.data.hearts];
    const aliveCount = hearts.filter(h => h).length;

    if (aliveCount <= 1) {
      // 游戏结束
      hearts[hearts.findIndex(h => h)] = false;
      this.setData({ hearts, gameOver: true });
      this.stopTimer();
      this.showGameOver();
      return;
    }

    // 扣一条命
    for (let i = hearts.length - 1; i >= 0; i--) {
      if (hearts[i]) {
        hearts[i] = false;
        break;
      }
    }

    this.setData({ hearts, pageState: 'wrong' });

    // 震动反馈
    wx.vibrateShort({ type: 'heavy' });

    // 短暂显示后进入下一题
    setTimeout(() => {
      this.nextQuestion();
    }, 800);
  },

  /**
   * 点击方块重新听
   */
  onBlockTap(e) {
    const { pageState, progression, rootNote } = this.data;
    if (pageState === 'playing') return;

    const index = e.currentTarget.dataset.index;
    const chordSymbol = progression[index].symbol;
    const ctx = audio.getAudioContext();
    audio.playOneChord(ctx, chordSymbol, rootNote, 'triads');
    wx.vibrateShort({ type: 'light' });
  },

  /**
   * 选择答案
   */
  onOptionSelect(e) {
    const { pageState, selectedIndex } = this.data;
    if (pageState === 'playing') return;

    const index = e.currentTarget.dataset.index;
    const selected = this.data.options[index];

    // 取消选择
    if (selectedIndex === index) {
      this.setData({ selectedIndex: null, pageState: 'idle' });
      audio.stopCurrentPlayback();
      return;
    }

    // 选中
    this.setData({ selectedIndex: index, pageState: 'selected' });

    // 播放所选和弦
    const ctx = audio.getAudioContext();
    audio.playOneChord(ctx, selected, this.data.rootNote, 'triads');
    wx.vibrateShort({ type: 'light' });
  },

  /**
   * 底部按钮点击
   */
  onBottomButtonTap() {
    const { pageState, selectedIndex, correctAnswer, options } = this.data;

    if (pageState === 'selected' && selectedIndex !== null) {
      // 确认答案
      const selected = options[selectedIndex];
      wx.vibrateShort({ type: 'light' });

      if (selected === correctAnswer) {
        // 答对
        this.stopTimer();
        this.setData({
          pageState: 'correct',
          score: this.data.score + 10
        });

        // 可能更换根音（10%概率）
        if (Math.random() < 0.1) {
          const newRoot = chords.randomRootNote();
          this.setData({ rootNote: newRoot });
        }
      } else {
        // 答错
        this.loseHeart();
      }
    } else if (pageState === 'idle') {
      // 播放根音（正弦波）
      this.playRootNoteSine();
    }
  },

  /**
   * 下一题
   */
  onNextQuestion() {
    if (this.data.gameOver) return;

    this.generateQuestion();

    setTimeout(() => {
      this.playCurrentProgression();
      this.startTimer();
    }, 300);
  },

  nextQuestion() {
    this.onNextQuestion();
  },

  /**
   * 播放根音（正弦波，低八度）
   */
  playRootNoteSine() {
    const { rootNote } = this.data;
    const freq = chords.ROOT_FREQUENCIES[rootNote];
    if (!freq) return;

    const ctx = audio.getAudioContext();

    // 创建振荡器
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = freq / 2;  // 低一个八度

    // ADSR 包络
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + 1.5);

    wx.vibrateShort({ type: 'light' });
  },

  /**
   * 游戏结束
   */
  showGameOver() {
    const { score } = this.data;

    // 保存最高分
    const bestScore = wx.getStorageSync('challengeBestScore') || 0;
    if (score > bestScore) {
      wx.setStorageSync('challengeBestScore', score);
    }

    wx.showModal({
      title: '游戏结束',
      content: `最终得分：${score}分\n最高记录：${Math.max(score, bestScore)}分`,
      showCancel: true,
      cancelText: '返回',
      confirmText: '再来一次',
      success: (res) => {
        if (res.confirm) {
          this.restartGame();
        } else {
          wx.navigateBack();
        }
      }
    });
  },

  /**
   * 重新开始
   */
  restartGame() {
    const rootNote = chords.randomRootNote();
    this.setData({
      hearts: [true, true, true, true, true],
      score: 0,
      gameOver: false,
      rootNote,
    });
    this.generateQuestion();

    setTimeout(() => {
      this.playCurrentProgression();
      this.startTimer();
    }, 300);
  },

  onUnload() {
    this.stopTimer();
    audio.stopCurrentPlayback();
  }
});
