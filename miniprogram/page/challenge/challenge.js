/**
 * Chord Hero - 挑战模式
 * 无限答题，5条命，计时器，难度递增
 */

const chords = require('../../utils/chords');
const audio = require('../../utils/audio');
const playCount = require('../../utils/play-count');
const sharePrompt = require('../../utils/share-prompt');

audio.initPiano();

// 难度配置
const DIFFICULTY_CONFIG = {
  // 分数阈值 -> { 时间, 填空数 }
  0: { time: 20, blanks: 1 },
  10: { time: 17, blanks: 1 },
  20: { time: 15, blanks: 2 },
  40: { time: 13, blanks: 2 },
  60: { time: 11, blanks: 2 },
  80: { time: 10, blanks: 3 },
};

Page({
  data: {
    // 游戏状态
    hearts: [true, true, true, true, true],  // 5条命
    score: 0,
    timer: 15,
    maxTime: 15,
    gameOver: false,

    showShareModal: false,
    shareModalTitle: '',
    shareModalMessage: '',
    shareModalCancelText: '稍后再说',
    navigateAfterShare: false,

    // 当前题目
    rootNote: 'C',
    progression: [],       // [{symbol: 'I', isBlank: false, answer: null, userAnswer: null}, ...]
    blankIndices: [],      // 填空位置数组
    correctAnswers: [],    // 所有填空的正确答案
    options: [],

    // 用户交互
    pageState: 'playing',  // 'playing' | 'idle' | 'selected' | 'correct' | 'wrong'
    flashingIndex: null,
    selectedAnswer: null,
    hasWronged: false,     // 本题是否答错过
  },

  // 计时器
  _timerInterval: null,
  _currentBlanks: 1,

  onLoad() {
    // 启用退出提示
    wx.enableAlertBeforeUnload({
      message: '挑战中途退出将不会返还能量，确定要退出吗？'
    });

    // 加载自定义字体
    wx.loadFontFace({
      family: 'Fredoka One',
      source: 'url("https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/FredokaOne-Regular.ttf")',
      success: (res) => console.log('Fredoka One 加载成功', res),
      fail: (err) => console.error('Fredoka One 加载失败', err)
    });

    wx.loadFontFace({
      family: '江城圆体',
      source: 'url("https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/JiangChengYuanTi-700W-subset.woff2")',
      success: (res) => console.log('江城圆体 加载成功', res),
      fail: (err) => console.error('江城圆体 加载失败', err)
    });

    wx.loadFontFace({
      family: 'Protest Strike',
      source: 'url("https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/ProtestStrike.ttf")',
      success: (res) => console.log('Protest Strike 加载成功', res),
      fail: (err) => console.error('Protest Strike 加载失败', err)
    });

    // 绑定和弦格式化函数供模板使用
    this.getChordNodes = chords.getChordNodes;

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

    // 生成多填空问题
    const q = chords.generateQuestion(rootNote, 'triads', null, -1, config.blanks);

    // 转换为带标记的数组
    const progression = q.progression.map((symbol, index) => ({
      symbol,
      isBlank: q.blankIndices.includes(index),
      answer: q.blankIndices.includes(index) ? q.correctAnswers[q.blankIndices.indexOf(index)] : null,
      userAnswer: null
    }));

    this.setData({
      progression,
      blankIndices: q.blankIndices,
      correctAnswers: q.correctAnswers,
      options: q.options,
      pageState: 'playing',
      flashingIndex: null,
      selectedAnswer: null,
      hasWronged: false,
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

    // 最后一个和弦开始后 1 秒切换到 idle（可操作）
    const duration = (symbols.length - 1) * 1.2 + 1;
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
      // 游戏结束，禁用退出提示
      wx.disableAlertBeforeUnload();
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

    this.stopTimer();
    this.setData({ hearts, pageState: 'wrong' });

    // 震动反馈
    wx.vibrateShort({ type: 'heavy' });

    // 不自动进入下一题，等待用户点击"下一题"
  },

  /**
   * 点击方块重新听或清除填空
   */
  onBlockTap(e) {
    const { pageState, progression, rootNote } = this.data;
    if (pageState === 'playing') return;

    const index = e.currentTarget.dataset.index;
    const block = progression[index];

    // 点击填空处
    if (block.isBlank) {
      if (pageState === 'correct' || pageState === 'wrong') {
        // 答题完成：播放正确答案的和弦，不取消选择
        const ctx = audio.getAudioContext();
        audio.playOneChord(ctx, block.answer, rootNote, 'triads');
        wx.vibrateShort({ type: 'light' });
      } else if (block.userAnswer) {
        // idle/selected 状态且已有答案：清除
        const newProgression = [...progression];
        newProgression[index] = { ...newProgression[index], userAnswer: null };
        this.setData({
          progression: newProgression,
          flashingIndex: null,
          selectedAnswer: null,
          pageState: 'idle'
        });
      } else if (pageState === 'idle') {
        // 空白处且 idle 状态：播放这个位置的和弦
        const ctx = audio.getAudioContext();
        audio.playOneChord(ctx, block.symbol, rootNote, 'triads');
        wx.vibrateShort({ type: 'light' });
      }
      return;
    }

    // 点击其他方块：播放和弦
    const ctx = audio.getAudioContext();
    audio.playOneChord(ctx, block.symbol, rootNote, 'triads');
    wx.vibrateShort({ type: 'light' });
  },

  /**
   * 选择答案
   */
  onOptionSelect(e) {
    const { pageState, flashingIndex, options, progression, blankIndices } = this.data;
    if (pageState === 'playing' || pageState === 'correct' || pageState === 'wrong') return;

    const index = e.currentTarget.dataset.index;
    const selected = options[index];

    // 取消选择（不播放声音）
    if (flashingIndex === index) {
      this.setData({ flashingIndex: null, selectedAnswer: null, pageState: 'idle' });
      return;
    }

    // 选中 + 短暂高亮（不播放声音）
    wx.vibrateShort({ type: 'light' });

    // 找到第一个未填的填空位置
    let targetBlankIndex = null;
    for (const blankIdx of blankIndices) {
      if (!progression[blankIdx].userAnswer) {
        targetBlankIndex = blankIdx;
        break;
      }
    }

    // 如果没有空位，替换最后一个填空
    if (targetBlankIndex === null && blankIndices.length > 0) {
      targetBlankIndex = blankIndices[blankIndices.length - 1];
    }

    // 更新填空
    if (targetBlankIndex !== null) {
      const newProgression = [...progression];
      newProgression[targetBlankIndex] = {
        ...newProgression[targetBlankIndex],
        userAnswer: selected
      };

      // 检查是否所有填空都已填写
      const allFilled = blankIndices.every(idx => newProgression[idx].userAnswer);

      this.setData({
        progression: newProgression,
        flashingIndex: index,
        selectedAnswer: selected,
        pageState: allFilled ? 'selected' : 'idle'
      });
    } else {
      this.setData({
        flashingIndex: index,
        selectedAnswer: selected,
        pageState: 'selected'
      });
    }

    // 高亮后熄灭
    wx.nextTick(() => {
      setTimeout(() => {
        this.setData({ flashingIndex: null });
      }, 300);
    });
  },

  /**
   * 底部按钮点击
   */
  onBottomButtonTap() {
    const { pageState, progression, blankIndices, correctAnswers, hasWronged } = this.data;

    if (pageState === 'selected') {
      // 确认答案 - 检查所有填空
      wx.vibrateShort({ type: 'light' });

      // 检查每个填空是否正确
      let allCorrect = true;
      for (let i = 0; i < blankIndices.length; i++) {
        const blankIdx = blankIndices[i];
        const userAnswer = progression[blankIdx].userAnswer;
        if (userAnswer !== correctAnswers[i]) {
          allCorrect = false;
          break;
        }
      }

      if (allCorrect) {
        // 答对
        this.stopTimer();
        this.setData({
          pageState: 'correct',
          // 只有第一次答对才加分
          score: hasWronged ? this.data.score : this.data.score + 10
        });

        // 可能更换根音（10%概率）
        if (Math.random() < 0.1) {
          const newRoot = chords.randomRootNote();
          this.setData({ rootNote: newRoot });
        }
      } else {
        // 答错：标记每个填空是否答对
        const newProgression = [...progression];
        for (let i = 0; i < blankIndices.length; i++) {
          const blankIdx = blankIndices[i];
          const userAnswer = progression[blankIdx].userAnswer;
          newProgression[blankIdx] = {
            ...newProgression[blankIdx],
            isUserCorrect: userAnswer === correctAnswers[i]
          };
        }
        this.setData({ hasWronged: true, progression: newProgression });
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

    // 检查剩余能量
    const remainingCount = playCount.getRemainingCount();
    const noMoreCount = remainingCount === 0;

    if (noMoreCount) {
      this.setData({
        showShareModal: true,
        shareModalTitle: '游戏结束',
        shareModalMessage: sharePrompt.buildEnergyShareMessage(
          `最终得分：${score}分\n最高记录：${Math.max(score, bestScore)}分`
        ),
        shareModalCancelText: '稍后再说',
        navigateAfterShare: false
      });
    } else {
      wx.showModal({
        title: '游戏结束',
        content: `最终得分：${score}分\n最高记录：${Math.max(score, bestScore)}分\n\n剩余能量：${remainingCount}`,
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
    }
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
  },

  onShareModalCancel() {
    this.setData({ showShareModal: false });
    wx.navigateBack();
  },

  onShareModalShare() {
    this.setData({ showShareModal: false, navigateAfterShare: true });
  },

  onShareAppMessage() {
    const result = sharePrompt.getShareAppMessageReturn();
    if (this.data.navigateAfterShare) {
      this.setData({ navigateAfterShare: false });
      setTimeout(() => wx.navigateBack(), 300);
    }
    return result;
  }
});
