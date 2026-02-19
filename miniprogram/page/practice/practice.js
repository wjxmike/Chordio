/**
 * Chord Hero - 练习页面逻辑
 * 支持三个级别：三和弦、七和弦、离调和弦
 */

const chords = require('../../utils/chords');
const audio = require('../../utils/audio');

// 预加载钢琴采样
audio.initPiano();

// 级别名称映射
const LEVEL_NAMES = {
  'triads': '三和弦',
  'sevenths': '七和弦',
  'chromatic': '离调和弦'
};

Page({
  data: {
    // 关卡信息
    level: 'triads',       // 当前级别
    levelName: '三和弦',    // 级别名称

    // 全局（整套练习）
    rootNote: 'C',           // 根音，随机生成一次
    totalQuestions: 10,      // 总题数（改为10）
    currentIndex: 0,         // 当前第几题

    // 当前题目
    progression: [],         // ['I', 'V', 'vi', 'IV']
    blankIndex: 0,           // 空心方块的位置
    correctAnswer: '',       // 正确答案 'vi'
    options: [],             // ['IV', 'vi', 'ii', 'V']

    // 上一题信息（用于避免重复）
    prevProgression: null,
    prevBlankIndex: -1,

    // 用户交互状态
    pageState: 'idle',       // 'idle' | 'playing' | 'selected' | 'correct' | 'wrong'
    selectedAnswer: null,    // 用户当前选择的选项
    hasWronged: false,       // 本题是否答错过

    // 统计
    correctCount: 0,         // 本套练习答对数量
  },

  onLoad(options) {
    // 获取关卡参数
    const level = options.level || 'triads';
    const levelName = LEVEL_NAMES[level] || '三和弦';

    // 加载自定义字体（jsDelivr CDN）
    wx.loadFontFace({
      family: 'Protest Strike',
      source: 'url("https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/ProtestStrike.ttf")',
      success: (res) => console.log('字体加载成功', res),
      fail: (err) => console.error('字体加载失败', err)
    });

    wx.loadFontFace({
      family: 'Fredoka One',
      source: 'url("https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/FredokaOne-Regular.ttf")',
      success: (res) => console.log('Fredoka One 加载成功', res),
      fail: (err) => console.error('Fredoka One 加载失败', err)
    });

    // 设置关卡信息
    this.setData({
      level,
      levelName,
      prevProgression: null,
      prevBlankIndex: -1
    });

    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: levelName + '练习'
    });

    // 随机生成根音
    const rootNote = chords.randomRootNote();
    this.setData({ rootNote });

    // 生成第一题数据（界面立即显示）
    this.generateQuestion();
  },

  /**
   * 页面渲染完成后延迟播放音频
   */
  onReady() {
    setTimeout(() => {
      this.playCurrentProgression();
    }, 300);
  },

  /**
   * 生成新题目（只生成数据，不播放）
   */
  generateQuestion() {
    const { rootNote, level, progression: prevProgression, blankIndex: prevBlankIndex } = this.data;
    const q = chords.generateQuestion(rootNote, level, prevProgression, prevBlankIndex);

    this.setData({
      progression: q.progression,
      blankIndex: q.blankIndex,
      correctAnswer: q.correctAnswer,
      options: q.options,
      pageState: 'playing',
      selectedAnswer: null,
      hasWronged: false,
      prevProgression: q.progression,
      prevBlankIndex: q.blankIndex,
    });
  },

  /**
   * 播放当前和弦进行
   */
  playCurrentProgression() {
    const { progression, rootNote, level } = this.data;
    const ctx = audio.getAudioContext();
    const duration = audio.playProgression(ctx, progression, rootNote, level);

    setTimeout(() => {
      this.setData({ pageState: 'idle' });
    }, duration * 1000);
  },

  /**
   * 生成新题目并开始播放（用于下一题）
   */
  generateAndStartQuestion() {
    const { rootNote, level, progression: prevProgression, blankIndex: prevBlankIndex } = this.data;
    const q = chords.generateQuestion(rootNote, level, prevProgression, prevBlankIndex);

    this.setData({
      progression: q.progression,
      blankIndex: q.blankIndex,
      correctAnswer: q.correctAnswer,
      options: q.options,
      pageState: 'playing',
      selectedAnswer: null,
      hasWronged: false,
      prevProgression: q.progression,
      prevBlankIndex: q.blankIndex,
    });

    // 播放音频
    this.playCurrentProgression();
  },

  /**
   * 点击顶部方块（重新听某个和弦）
   */
  onBlockTap(e) {
    const { pageState, progression, rootNote, level } = this.data;
    // playing 状态下不允许点击
    if (pageState === 'playing') return;

    this.vibrateShort();
    const index = e.currentTarget.dataset.index;
    const chordSymbol = progression[index];
    const ctx = audio.getAudioContext();
    audio.playOneChord(ctx, chordSymbol, rootNote, level);
  },

  /**
   * 点击底部按钮
   */
  onBottomButtonTap() {
    const { pageState, hasWronged, selectedAnswer, correctAnswer } = this.data;

    if (pageState === 'selected') {
      // 确认：判题
      this.vibrateShort();
      if (selectedAnswer === correctAnswer) {
        this.setData({
          pageState: 'correct',
          correctCount: this.data.correctCount + 1
        });
      } else {
        this.setData({
          pageState: 'wrong',
          hasWronged: true
        });
        setTimeout(() => {
          this.setData({
            pageState: 'idle',
            selectedAnswer: null
          });
        }, 600);
      }
      return;
    }

    if (pageState === 'idle' && !hasWronged) {
      // 播放根音（正弦波）
      this.vibrateShort();
      this.playRootNoteSine();
    }
  },

  /**
   * 播放根音（正弦波）
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
  },

  /**
   * 点击"下一题"
   */
  onNextTap() {
    if (this.data.pageState !== 'correct') return;

    this.vibrateShort();
    const nextIndex = this.data.currentIndex + 1;
    if (nextIndex >= this.data.totalQuestions) {
      // 练习结束
      this.showResult();
      return;
    }

    this.setData({ currentIndex: nextIndex });
    this.generateAndStartQuestion();
  },

  /**
   * 显示结果并保存进度
   */
  showResult() {
    const { correctCount, totalQuestions, level } = this.data;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const isPerfect = percentage === 100;

    // 保存进度
    this.saveProgress(level, percentage);

    // 判断是否解锁下一关
    let unlockMessage = '';
    if (isPerfect) {
      if (level === 'triads') {
        unlockMessage = '\n🎉 已解锁：七和弦！';
      } else if (level === 'sevenths') {
        unlockMessage = '\n🎉 已解锁：离调和弦！';
      }
    }

    if (isPerfect) {
      // 100% 正确率：只显示"完成"按钮
      wx.showModal({
        title: '练习完成！',
        content: `正确率：${percentage}% (${correctCount}/${totalQuestions})${unlockMessage}`,
        showCancel: false,
        confirmText: '完成',
        success: () => {
          // 返回关卡选择页
          wx.navigateBack();
        }
      });
    } else {
      // 未达 100%：显示"返回"和"再来一次"
      wx.showModal({
        title: '练习完成！',
        content: `正确率：${percentage}% (${correctCount}/${totalQuestions})\n需要 100% 正确率才能解锁下一关`,
        showCancel: true,
        cancelText: '返回',
        confirmText: '再来一次',
        success: (res) => {
          if (res.confirm) {
            // 重新开始
            const rootNote = chords.randomRootNote();
            this.setData({
              rootNote,
              currentIndex: 0,
              correctCount: 0,
              prevProgression: null,
              prevBlankIndex: -1,
            });
            this.generateAndStartQuestion();
          } else {
            // 返回关卡选择页
            wx.navigateBack();
          }
        }
      });
    }
  },

  /**
   * 保存进度到本地存储
   */
  saveProgress(level, percentage) {
    const progress = wx.getStorageSync('levelProgress') || {
      triads: { completed: false, bestScore: 0 },
      sevenths: { completed: false, bestScore: 0 },
      chromatic: { completed: false, bestScore: 0 }
    };

    // 更新当前关卡进度
    progress[level] = {
      completed: true,
      bestScore: Math.max(progress[level]?.bestScore || 0, percentage)
    };

    wx.setStorageSync('levelProgress', progress);
    console.log('进度已保存:', progress);
  },

  /**
   * 用户选择答案（仅选中 + 播放该选项和弦，不判题）
   */
  onOptionSelect(e) {
    const { pageState, selectedAnswer, rootNote, level } = this.data;
    // playing 状态下不允许选择
    if (pageState === 'playing') return;

    const selected = e.currentTarget.dataset.chord;

    // 选中状态下再次点击同一选项：取消选择
    if (pageState === 'selected' && selected === selectedAnswer) {
      this.vibrateShort();
      audio.stopCurrentPlayback();
      this.setData({
        selectedAnswer: null,
        pageState: 'idle',
        hasWronged: false
      });
      return;
    }

    this.vibrateShort();
    this.setData({
      selectedAnswer: selected,
      pageState: 'selected'
    });

    // 播放所选选项的和弦
    const ctx = audio.getAudioContext();
    audio.playOneChord(ctx, selected, rootNote, level);
  },

  /**
   * 短震动反馈
   */
  vibrateShort() {
    // 确保音频已激活（移动端需要在用户交互后激活）
    audio.ensureAudioResumed();

    wx.vibrateShort({
      type: 'light'
    });
  },

  /**
   * 页面卸载时清理
   */
  onUnload() {
    // 停止当前音频播放
    audio.stopCurrentPlayback();
  }
});
