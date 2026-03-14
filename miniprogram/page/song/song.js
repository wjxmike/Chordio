/**
 * Chord Hero - 歌曲模式
 * 听歌曲片段，识别和弦进行
 */

const songs = require('../../data/songs');
const chords = require('../../utils/chords');
const audio = require('../../utils/audio');
const playCount = require('../../utils/play-count');

// 预加载钢琴采样
audio.initPiano();

Page({
  data: {
    // 歌曲信息
    song: null,           // { id, title, artist, album, cover }
    currentIndex: 0,      // 当前第几题（0-indexed）
    totalQuestions: 5,    // 总题数

    // 当前题目
    rootNote: 'C',
    rootNoteDisplay: 'C', // 显示用的根音（小调会显示 "Fm"）
    progression: [],      // [{symbol, isBlank, answer, userAnswer}, ...]
    blankIndex: 0,        // 填空位置
    correctAnswer: '',    // 正确答案
    options: [],          // 4个选项

    // 歌曲播放
    isPlaying: false,
    songProgress: 0,      // 0-100
    isDragging: false,    // 是否正在拖动进度条
    _wasPlayingBeforeDrag: false,  // 拖动前是否在播放
    shouldAutoPlay: false,  // 是否需要自动播放（等待 onCanplay）

    // 用户交互状态
    pageState: 'idle',    // 'idle' | 'playing' | 'selected' | 'correct' | 'wrong'
    selectedAnswer: null,
    flashingIndex: null,

    // 统计
    correctCount: 0,

    // 预加载
    preloadCover: '',  // 下一首歌曲封面
  },

  // InnerAudio 实例
  _songAudio: null,

  onLoad(options) {
    // 启用退出提示
    wx.enableAlertBeforeUnload({
      message: '练习中途退出将不会返还能量，确定要退出吗？'
    });

    // 加载字体
    wx.loadFontFace({
      family: 'Protest Strike',
      source: 'url("https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/ProtestStrike.ttf")',
      success: (res) => console.log('Protest Strike 加载成功', res),
      fail: (err) => console.error('Protest Strike 加载失败', err)
    });

    wx.loadFontFace({
      family: 'Fredoka One',
      source: 'url("https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/FredokaOne-Regular.ttf")',
      success: (res) => console.log('Fredoka One 加载成功', res),
      fail: (err) => console.error('Fredoka One 加载失败', err)
    });

    wx.loadFontFace({
      family: '江城圆体',
      source: 'url("https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/JiangChengYuanTi-700W-subset.ttf")',
      success: (res) => console.log('江城圆体 加载成功', res),
      fail: (err) => console.error('江城圆体 加载失败', err)
    });

    // 绑定和弦格式化函数供模板使用
    this.getChordNodes = chords.getChordNodes;

    // 初始化 InnerAudio
    this._songAudio = wx.createInnerAudioContext();
    this._songAudio.onEnded(() => {
      this.setData({ isPlaying: false, songProgress: 100 });
    });
    this._songAudio.onError((err) => {
      console.error('歌曲播放错误:', err);
      this.setData({ isPlaying: false, shouldAutoPlay: false });
    });
    this._songAudio.onCanplay(() => {
      // 音频准备好后，如果需要自动播放则播放
      if (this.data.shouldAutoPlay) {
        this._songAudio.play();
        this.setData({ isPlaying: true, shouldAutoPlay: false, pageState: 'idle' });

        // 启动进度更新
        this._updateProgressTimer = setInterval(() => {
          if (this._songAudio.duration > 0) {
            const progress = (this._songAudio.currentTime / this._songAudio.duration) * 100;
            this.setData({ songProgress: Math.min(progress, 100) });
          }
        }, 100);
      }
    });

    // 选择题目：最多10题，每首歌只出现一次
    this._shuffledQuestions = this.selectUniqueSongQuestions(10);
    this.setData({ totalQuestions: this._shuffledQuestions.length });

    // 生成第一题
    this.generateQuestion();
  },

  /**
   * 选择题目，确保每首歌只出现一次
   * @param {number} maxQuestions 最多题目数量
   */
  selectUniqueSongQuestions(maxQuestions) {
    const allQuestions = songs.getAllQuestions();
    const usedSongs = new Set();
    const selected = [];

    // 先打乱所有题目
    const shuffled = this.shuffleArray([...allQuestions]);

    // 按顺序选择，跳过已选过的歌曲
    for (const q of shuffled) {
      if (!usedSongs.has(q.songId)) {
        selected.push(q);
        usedSongs.add(q.songId);
        if (selected.length >= maxQuestions) break;
      }
    }

    // 再次打乱选中题目的顺序
    return this.shuffleArray(selected);
  },

  onReady() {
    // 页面准备好后播放歌曲片段
    // 播放由 onCanplay 事件驱动，无需固定延迟
    this.playSongAudio();
  },

  /**
   * 生成新题目
   */
  generateQuestion() {
    const { currentIndex } = this.data;
    const allQuestions = this._shuffledQuestions || songs.getAllQuestions();

    if (currentIndex >= allQuestions.length) {
      // 所有题目完成
      this.showResult();
      return;
    }

    const question = allQuestions[currentIndex];
    const song = songs.getSong(question.songId);

    // 随机选择填空位置
    const blankIndex = Math.floor(Math.random() * question.progression.length);
    const correctAnswer = question.progression[blankIndex];

    // 生成选项
    const options = this.generateOptions(correctAnswer);

    // 转换为带标记的数组
    const progression = question.progression.map((symbol, index) => ({
      symbol,
      isBlank: index === blankIndex,
      answer: index === blankIndex ? correctAnswer : null,
      userAnswer: null
    }));

    // 停止当前播放并设置新的音频源
    this._songAudio.stop();
    this._songAudio.src = question.audio;

    // 计算显示用的根音（小调显示 "Fm"，大调显示 "F"）
    const rootNoteDisplay = question.isMinor ? question.rootNote + 'm' : question.rootNote;

    // 重置自动播放状态，强制等待 onCanplay
    this.setData({
      song,
      rootNote: question.rootNote,
      rootNoteDisplay,
      progression,
      blankIndex,
      correctAnswer,
      options,
      pageState: 'playing',
      selectedAnswer: null,
      flashingIndex: null,
      isPlaying: false,
      songProgress: 0,
      shouldAutoPlay: false,  // 重置，等待 playSongAudio 设置
    });

    // 预加载下一首歌曲封面
    const nextIndex = currentIndex + 1;
    if (nextIndex < allQuestions.length) {
      const nextQuestion = allQuestions[nextIndex];
      const nextSong = songs.getSong(nextQuestion.songId);
      this.setData({ preloadCover: nextSong.cover });
    }
  },

  /**
   * 生成4个选项
   */
  generateOptions(correctAnswer) {
    // 获取所有可用和弦（包括七和弦和离调和弦）
    const availableChords = [
      'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii',
      'I△7', 'ii-7', 'iii-7', 'IV△7', 'V7', 'vi-7',
      'I7', 'v-7', 'III7', '#V',
      'iv', 'III', 'VI', 'VII',
      'i'
    ];

    const options = [correctAnswer];
    const remaining = availableChords.filter(c => c !== correctAnswer);

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
  },

  /**
   * 播放当前和弦进行
   */
  playCurrentProgression() {
    const { progression, rootNote } = this.data;
    const symbols = progression.map(p => p.symbol);
    const ctx = audio.getAudioContext();

    // 使用 chromatic 级别以支持所有和弦
    audio.playProgression(ctx, symbols, rootNote, 'chromatic');

    const duration = (symbols.length - 1) * 1.2 + 1;
    setTimeout(() => {
      if (this.data.pageState === 'playing') {
        this.setData({ pageState: 'idle' });
      }
    }, duration * 1000);
  },

  /**
   * 播放/暂停歌曲片段
   */
  toggleSongPlay() {
    if (this.data.isPlaying) {
      this._songAudio.pause();
      this.setData({ isPlaying: false });
    } else {
      this._songAudio.play();
      this.setData({ isPlaying: true });

      // 更新进度
      this._updateProgressTimer = setInterval(() => {
        if (this._songAudio.duration > 0) {
          const progress = (this._songAudio.currentTime / this._songAudio.duration) * 100;
          this.setData({ songProgress: Math.min(progress, 100) });
        }
      }, 100);
    }
  },

  /**
   * 播放歌曲片段（自动播放用）
   * 设置标记，等待 onCanplay 触发后播放
   */
  playSongAudio() {
    // 清理旧的进度更新定时器
    if (this._updateProgressTimer) {
      clearInterval(this._updateProgressTimer);
      this._updateProgressTimer = null;
    }

    // 设置自动播放标记，等待 onCanplay 触发
    this.setData({ shouldAutoPlay: true });

    // 不再依赖 duration 判断，完全由 onCanplay 驱动
  },

  /**
   * 进度条触摸开始
   */
  onProgressTouchStart(e) {
    // 停止进度更新定时器
    if (this._updateProgressTimer) {
      clearInterval(this._updateProgressTimer);
      this._updateProgressTimer = null;
    }

    // 记录是否在播放
    this._wasPlayingBeforeDrag = this.data.isPlaying;

    // 暂停播放
    if (this._songAudio && this.data.isPlaying) {
      this._songAudio.pause();
    }

    this.setData({ isDragging: true, isPlaying: false });

    // 计算进度
    this._updateProgressFromTouch(e);
  },

  /**
   * 进度条触摸移动
   */
  onProgressTouchMove(e) {
    if (!this.data.isDragging) return;
    this._updateProgressFromTouch(e);
  },

  /**
   * 进度条触摸结束
   */
  onProgressTouchEnd(e) {
    if (!this.data.isDragging) return;

    const { songProgress } = this.data;
    const duration = this._songAudio.duration || 0;

    // 跳转到新位置
    if (duration > 0) {
      const newTime = (songProgress / 100) * duration;
      this._songAudio.seek(newTime);
    }

    this.setData({ isDragging: false });

    // 如果之前在播放，继续播放
    if (this._wasPlayingBeforeDrag) {
      this._songAudio.play();
      this.setData({ isPlaying: true });

      // 重新启动进度更新
      this._updateProgressTimer = setInterval(() => {
        if (this._songAudio.duration > 0) {
          const progress = (this._songAudio.currentTime / this._songAudio.duration) * 100;
          this.setData({ songProgress: Math.min(progress, 100) });
        }
      }, 100);
    }
  },

  /**
   * 根据触摸位置更新进度
   */
  _updateProgressFromTouch(e) {
    const query = wx.createSelectorQuery().in(this);
    query.select('.song-progress-bar').boundingClientRect((rect) => {
      if (!rect) return;

      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const width = rect.width;
      const progress = Math.max(0, Math.min(100, (x / width) * 100));

      this.setData({ songProgress: progress });
    }).exec();
  },

  /**
   * 点击方块
   */
  onBlockTap(e) {
    const { pageState, progression, rootNote, blankIndex, correctAnswer } = this.data;
    if (pageState === 'playing') return;

    const index = e.currentTarget.dataset.index;

    // 点击填空处
    if (index === blankIndex) {
      if (pageState === 'correct') {
        // 答对后：播放正确答案的和弦
        wx.vibrateShort({ type: 'light' });
        const ctx = audio.getAudioContext();
        audio.playOneChord(ctx, correctAnswer, rootNote, 'chromatic');
        return;
      } else if (pageState === 'selected') {
        // 已选中：取消选择
        wx.vibrateShort({ type: 'light' });
        audio.stopCurrentPlayback();
        this.setData({
          selectedAnswer: null,
          pageState: 'idle'
        });
        return;
      } else {
        // idle 或 wrong 状态：不播放声音
        return;
      }
    }

    // 播放和弦
    wx.vibrateShort({ type: 'light' });
    const chordSymbol = progression[index].symbol;
    const ctx = audio.getAudioContext();
    audio.playOneChord(ctx, chordSymbol, rootNote, 'chromatic');
  },

  /**
   * 选择答案
   */
  onOptionSelect(e) {
    const { pageState, flashingIndex, options, rootNote } = this.data;
    if (pageState === 'playing') return;

    const index = e.currentTarget.dataset.index;
    const selected = options[index];

    // correct 状态下只播放声音，不改变答案
    if (pageState === 'correct') {
      wx.vibrateShort({ type: 'light' });
      const ctx = audio.getAudioContext();
      audio.playOneChord(ctx, selected, rootNote, 'chromatic');
      return;
    }

    // 取消选择（播放声音）
    if (flashingIndex === index) {
      wx.vibrateShort({ type: 'light' });
      const ctx = audio.getAudioContext();
      audio.playOneChord(ctx, selected, rootNote, 'chromatic');
      this.setData({ flashingIndex: null, selectedAnswer: null, pageState: 'idle' });
      return;
    }

    // 选中 + 短暂高亮 + 播放声音
    wx.vibrateShort({ type: 'light' });
    const ctx = audio.getAudioContext();
    audio.playOneChord(ctx, selected, rootNote, 'chromatic');

    this.setData({
      flashingIndex: index,
      selectedAnswer: selected,
      pageState: 'selected'
    });

    // 高亮后熄灭
    wx.nextTick(() => {
      setTimeout(() => {
        this.setData({ flashingIndex: null });
      }, 300);
    });
  },

  /**
   * 点击底部按钮
   */
  onBottomButtonTap() {
    const { pageState, selectedAnswer, correctAnswer } = this.data;

    if (pageState === 'selected') {
      // 确认答案 - 暂停歌曲播放
      this._songAudio.pause();
      this.setData({ isPlaying: false });
      if (this._updateProgressTimer) {
        clearInterval(this._updateProgressTimer);
      }

      wx.vibrateShort({ type: 'light' });
      if (selectedAnswer === correctAnswer) {
        this.setData({
          pageState: 'correct',
          correctCount: this.data.correctCount + 1
        });
      } else {
        // 答错：显示 wrong 状态，不自动重置
        this.setData({ pageState: 'wrong' });
      }
      return;
    }

    if (pageState === 'wrong') {
      // 再试试：重置选择
      wx.vibrateShort({ type: 'light' });
      this.setData({ pageState: 'idle', selectedAnswer: null });
      return;
    }

    if (pageState === 'idle') {
      // 播放根音
      this.playRootNoteSine();
    }
  },

  /**
   * 下一题
   */
  onNextQuestion() {
    const nextIndex = this.data.currentIndex + 1;
    const allQuestions = this._shuffledQuestions || songs.getAllQuestions();

    if (nextIndex >= allQuestions.length) {
      this.showResult();
      return;
    }

    this.setData({ currentIndex: nextIndex });
    this.generateQuestion();

    // 播放由 onCanplay 事件驱动，无需固定延迟
    this.playSongAudio();
  },

  /**
   * 播放根音
   */
  playRootNoteSine() {
    const { rootNote } = this.data;
    const freq = chords.ROOT_FREQUENCIES[rootNote];
    if (!freq) return;

    wx.vibrateShort({ type: 'light' });
    const ctx = audio.getAudioContext();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = freq / 2;

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
   * 打乱数组（Fisher-Yates 洗牌算法）
   */
  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  /**
   * 显示结果
   */
  showResult() {
    // 练习完成，禁用退出提示
    wx.disableAlertBeforeUnload();

    const { correctCount, totalQuestions } = this.data;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    // 检查剩余能量
    const remainingCount = playCount.getRemainingCount();
    const noMoreCount = remainingCount === 0;

    if (noMoreCount) {
      // 能量用完，提示分享
      wx.showModal({
        title: '练习完成',
        content: `答对 ${correctCount}/${totalQuestions} 题\n正确率：${percentage}%\n\n⚠️ 今日能量已用完，分享给好友可获得额外 3 点能量`,
        showCancel: true,
        cancelText: '稍后再说',
        confirmText: '去分享',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack({ delta: 2 });
          } else {
            wx.navigateBack();
          }
        }
      });
    } else {
      wx.showModal({
        title: '练习完成',
        content: `答对 ${correctCount}/${totalQuestions} 题\n正确率：${percentage}%\n\n剩余能量：${remainingCount}`,
        showCancel: false,
        confirmText: '返回',
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  onUnload() {
    // 清理
    if (this._songAudio) {
      this._songAudio.stop();
      this._songAudio.destroy();
    }
    if (this._updateProgressTimer) {
      clearInterval(this._updateProgressTimer);
    }
    audio.stopCurrentPlayback();
  },

  /**
   * 分享到好友/群聊（歌曲模式不支持朋友圈分享）
   */
  onShareAppMessage() {
    const { song } = this.data;
    return {
      title: song ? `${song.title} - ${song.artist}` : 'Chordiio - 歌曲模式',
      path: '/page/home/home'
    };
  }
});
