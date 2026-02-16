/**
 * Chord Hero - 练习页面逻辑
 */

const chords = require('../../utils/chords');
const audio = require('../../utils/audio');

Page({
  data: {
    // 全局（整套练习）
    rootNote: 'C',           // 根音，随机生成一次
    totalQuestions: 15,      // 总题数
    currentIndex: 0,         // 当前第几题（0-14）

    // 当前题目
    progression: [],         // ['I', 'V', 'vi', 'IV']
    blankIndex: 0,           // 空心方块的位置
    correctAnswer: '',       // 正确答案 'vi'
    options: [],             // ['IV', 'vi', 'ii', 'V']

    // 用户交互状态
    pageState: 'idle',       // 'idle' | 'playing' | 'selected' | 'correct' | 'wrong'
    selectedAnswer: null,    // 用户当前选择的选项
    hasWronged: false,       // 本题是否答错过（用于控制底部按钮样式）

    // 统计
    correctCount: 0,         // 本套练习答对数量
  },

  onLoad() {
    // 1. 随机生成根音
    const rootNote = chords.randomRootNote();

    this.setData({ rootNote });

    // 2. 生成第一题
    this.generateAndStartQuestion();
  },

  /**
   * 生成新题目并开始播放
   */
  generateAndStartQuestion() {
    const q = chords.generateQuestion(this.data.rootNote);

    this.setData({
      progression: q.progression,
      blankIndex: q.blankIndex,
      correctAnswer: q.correctAnswer,
      options: q.options,
      pageState: 'playing',
      selectedAnswer: null,
      hasWronged: false,
    });

    // 自动播放整个进行
    const ctx = audio.getAudioContext();
    const duration = audio.playProgression(ctx, q.progression, this.data.rootNote);

    // 播放完成后切换到 idle
    setTimeout(() => {
      this.setData({ pageState: 'idle' });
    }, duration * 1000);
  },

  /**
   * 点击顶部方块（重新听某个和弦）
   */
  onBlockTap(e) {
    const { pageState } = this.data;
    // playing 状态下不允许点击
    if (pageState === 'playing') return;

    const index = e.currentTarget.dataset.index;
    const chordSymbol = this.data.progression[index];
    const ctx = audio.getAudioContext();
    audio.playOneChord(ctx, chordSymbol, this.data.rootNote);
  },

  /**
   * 点击底部按钮
   */
  onBottomButtonTap() {
    const { pageState, hasWronged, selectedAnswer, correctAnswer } = this.data;

    if (pageState === 'selected') {
      // 确认：判题
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
      // 播放根音
      const ctx = audio.getAudioContext();
      const rootFreq = audio.getRootFrequency(this.data.rootNote);
      audio.playRootNote(ctx, rootFreq);
    }
    // hasWronged 时点击无效（显示"再试试"但不需要特殊处理）
  },

  /**
   * 点击"下一题"
   */
  onNextTap() {
    if (this.data.pageState !== 'correct') return;

    const nextIndex = this.data.currentIndex + 1;
    if (nextIndex >= this.data.totalQuestions) {
      // 练习结束，跳转结果页或弹窗
      this.showResult();
      return;
    }

    this.setData({ currentIndex: nextIndex });
    this.generateAndStartQuestion();
  },

  /**
   * 显示结果
   */
  showResult() {
    const { correctCount, totalQuestions } = this.data;
    wx.showModal({
      title: '练习完成！',
      content: `你答对了 ${correctCount} / ${totalQuestions} 题`,
      showCancel: false,
      confirmText: '再来一次',
      success: () => {
        // 重新开始
        const rootNote = chords.randomRootNote();
        this.setData({
          rootNote,
          currentIndex: 0,
          correctCount: 0,
        });
        this.generateAndStartQuestion();
      }
    });
  },

  /**
   * 用户选择答案（仅选中 + 播放该选项和弦，不判题）
   */
  onOptionSelect(e) {
    const { pageState, selectedAnswer } = this.data;
    // playing 状态下不允许选择（防止自动播放未完成时操作）
    if (pageState === 'playing') return;

    const selected = e.currentTarget.dataset.chord;

    // 选中状态下再次点击同一选项：取消选择，回到 idle
    if (pageState === 'selected' && selected === selectedAnswer) {
      audio.stopCurrentPlayback();
      this.setData({
        selectedAnswer: null,
        pageState: 'idle',
        hasWronged: false
      });
      return;
    }

    this.setData({
      selectedAnswer: selected,
      pageState: 'selected'
    });

    // 播放所选选项的和弦
    const ctx = audio.getAudioContext();
    audio.playOneChord(ctx, selected, this.data.rootNote);
  },

  /**
   * 页面卸载时清理
   */
  onUnload() {
    // 可以在这里清理音频资源
  }
});
