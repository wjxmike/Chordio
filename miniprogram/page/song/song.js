/**
 * Chord Hero - 歌曲模式
 * 听歌曲片段，识别和弦进行
 */

const songs = require('../../data/songs');
const chords = require('../../utils/chords');
const audio = require('../../utils/audio');
const playCount = require('../../utils/play-count');
const songCache = require('../../utils/song-cache');
const songSession = require('../../utils/song-session');
const sharePrompt = require('../../utils/share-prompt');
const { getAssetUrl, ensureAssetsReady } = require('../../config/assets');

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

    // 用户交互状态
    pageState: 'idle',    // 'idle' | 'selected' | 'correct' | 'wrong'
    selectedAnswer: null,
    flashingIndex: null,
    hasWronged: false,    // 本题是否答错过

    // 统计
    correctCount: 0,

    // 预加载
    preloadCover: '',  // 下一首歌曲封面

    showShareModal: false,
    shareModalTitle: '',
    shareModalMessage: '',
    shareModalCancelText: '稍后再说',
    navigateAfterShare: false
  },

  // InnerAudio 实例
  _songAudio: null,
  _songLoadId: 0,
  _pendingAutoPlay: false,
  _currentAudioPath: '',
  _streamFallbackTimer: null,

  /** 下载过慢时先切 CDN 流式，避免一直卡住 */
  STREAM_FALLBACK_MS: 8000,

  onLoad(options) {
    ensureAssetsReady();
    songCache.ensureDir();

    // 启用退出提示
    wx.enableAlertBeforeUnload({
      message: '练习中途退出将不会返还能量，确定要退出吗？'
    });

    // 先初始化音频与第一题，避免字体加载阻塞首曲播放
    this._songAudio = wx.createInnerAudioContext();
    this._songAudio.onEnded(() => {
      this.setData({ isPlaying: false, songProgress: 100 });
    });
    this._songAudio.onError((err) => {
      console.error('歌曲播放错误:', err);
      const shouldAutoPlay = this._pendingAutoPlay;
      this.setData({ isPlaying: false });
      this._pendingAutoPlay = false;
      this._clearAutoPlayPoll();

      if (this._currentAudioPath && this._lastSrcWasLocal) {
        console.warn('[song] local clip failed, retry stream');
        this._applySongSrc(getAssetUrl(this._currentAudioPath), shouldAutoPlay, this._songLoadId);
      }
    });
    this._songAudio.onCanplay(() => {
      this._tryAutoPlay();
    });
    this._songAudio.onPlay(() => {
      if (this._pendingAutoPlay) {
        this._tryAutoPlay();
      }
    });

    this.getChordNodes = chords.getChordNodes;

    // 每次进入都从头开始，随机新题组
    this._shuffledQuestions = songSession.selectQuestions(songSession.MAX_QUESTIONS);
    this.setData({
      totalQuestions: this._shuffledQuestions.length,
      currentIndex: 0,
      correctCount: 0
    });

    songSession.scheduleSessionDownloads(this._shuffledQuestions, 0);
    this.generateQuestion();

    audio.initPiano();

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
      source: 'url("https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/JiangChengYuanTi-700W-subset.woff2")',
      success: (res) => console.log('江城圆体 加载成功', res),
      fail: (err) => console.error('江城圆体 加载失败', err)
    });
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
    const songRaw = songs.getSong(question.songId);
    const song = {
      ...songRaw,
      cover: getAssetUrl(songRaw.cover)
    };

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

    // 计算显示用的根音（小调显示 "Fm"，大调显示 "F"）
    const rootNoteDisplay = question.isMinor ? question.rootNote + 'm' : question.rootNote;

    this.setData({
      song,
      rootNote: question.rootNote,
      rootNoteDisplay,
      progression,
      blankIndex,
      correctAnswer,
      options,
      pageState: 'idle',
      selectedAnswer: null,
      flashingIndex: null,
      hasWronged: false,
      isPlaying: false,
      songProgress: 0
    });

    // 预加载下一首歌曲封面 + 后台预下载后续题目音频
    const nextIndex = currentIndex + 1;
    if (nextIndex < allQuestions.length) {
      const nextQuestion = allQuestions[nextIndex];
      const nextSong = songs.getSong(nextQuestion.songId);
      this.setData({ preloadCover: getAssetUrl(nextSong.cover) });
    }
    songSession.scheduleSessionDownloads(allQuestions, currentIndex);

    this.prepareSongClip(question.audio, true);
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
      this._clearProgressTimer();
      return;
    }

    if (!this._songClipReady) {
      if (this._currentAudioPath) {
        this._playViaStream(this._currentAudioPath, false);
      }
      return;
    }

    const duration = this._songAudio.duration || 0;
    const atEnd = duration > 0 && this._songAudio.currentTime >= duration - 0.05;
    if (atEnd || this.data.songProgress >= 99) {
      this._songAudio.seek(0);
      this.setData({ songProgress: 0 });
    }

    this._songAudio.play();
    this.setData({ isPlaying: true });
    this._startProgressTimer();
  },

  _clearProgressTimer() {
    if (this._updateProgressTimer) {
      clearInterval(this._updateProgressTimer);
      this._updateProgressTimer = null;
    }
  },

  _startProgressTimer() {
    this._clearProgressTimer();
    this._updateProgressTimer = setInterval(() => {
      if (this._songAudio && this._songAudio.duration > 0) {
        const progress = (this._songAudio.currentTime / this._songAudio.duration) * 100;
        this.setData({ songProgress: Math.min(progress, 100) });
      }
    }, 100);
  },

  _clearAutoPlayPoll() {
    if (this._autoPlayPoll) {
      clearInterval(this._autoPlayPoll);
      this._autoPlayPoll = null;
    }
  },

  _clearStreamFallbackTimer() {
    if (this._streamFallbackTimer) {
      clearTimeout(this._streamFallbackTimer);
      this._streamFallbackTimer = null;
    }
  },

  _startPlayback() {
    if (!this._songClipReady) return;

    const player = this._songAudio;
    player.seek(0);
    player.play();

    this.setData({
      isPlaying: true,
      songProgress: 0
    });
    this._startProgressTimer();
  },

  _tryAutoPlay() {
    if (!this._pendingAutoPlay || !this._songClipReady) return;

    this._pendingAutoPlay = false;
    this._clearAutoPlayPoll();
    this._startPlayback();
  },

  _startAutoPlayPoll(loadId) {
    this._clearAutoPlayPoll();
    let attempts = 0;

    this._autoPlayPoll = setInterval(() => {
      if (loadId !== this._songLoadId || !this._pendingAutoPlay) {
        this._clearAutoPlayPoll();
        return;
      }

      attempts += 1;
      if (this._songAudio.duration > 0) {
        this._tryAutoPlay();
        return;
      }

      if (attempts >= 50) {
        this._clearAutoPlayPoll();
        this._tryAutoPlay();
      }
    }, 100);
  },

  _playViaStream(relativePath, autoPlay) {
    this._clearStreamFallbackTimer();
    this._applySongSrc(getAssetUrl(relativePath), autoPlay, this._songLoadId);
    if (!autoPlay) {
      wx.nextTick(() => {
        if (this._songClipReady) {
          this._startPlayback();
        }
      });
    }
  },

  _applySongSrc(src, autoPlay, loadId) {
    if (loadId !== this._songLoadId) return;

    this._clearStreamFallbackTimer();
    this._lastSrcWasLocal = src && !songCache.isRemoteUrl(src);
    this._songAudio.src = src;
    this._songClipReady = true;

    if (autoPlay) {
      this._pendingAutoPlay = true;
      if (this._songAudio.duration > 0) {
        this._tryAutoPlay();
      } else {
        wx.nextTick(() => {
          if (loadId !== this._songLoadId || !this._pendingAutoPlay) return;
          if (this._songAudio.duration > 0) {
            this._tryAutoPlay();
            return;
          }
          this._startAutoPlayPoll(loadId);
        });
      }
    }
  },

  /**
   * 先下载到本地再设置 src，避免流式加载从中间开始播
   */
  prepareSongClip(relativePath, autoPlay) {
    this._songLoadId += 1;
    const loadId = this._songLoadId;
    this._currentAudioPath = relativePath;
    this._pendingAutoPlay = false;
    this._songClipReady = false;
    this._clearAutoPlayPoll();
    this._clearStreamFallbackTimer();
    this._clearProgressTimer();
    if (this._songAudio.src) {
      this._songAudio.stop();
    }

    this.setData({ isPlaying: false, songProgress: 0 });

    const cachedPath = songCache.getLocalPathIfCached(relativePath);
    if (cachedPath) {
      this._applySongSrc(cachedPath, autoPlay, loadId);
      return;
    }

    this._streamFallbackTimer = setTimeout(() => {
      if (loadId !== this._songLoadId || this._songClipReady) return;
      console.warn('[song] download slow, fallback to stream', relativePath);
      this._playViaStream(relativePath, autoPlay);
    }, this.STREAM_FALLBACK_MS);

    songCache.prioritizeDownload(relativePath)
      .then((localPath) => {
        if (loadId !== this._songLoadId) return;
        if (this._songClipReady) return;
        this._applySongSrc(localPath, autoPlay, loadId);
      })
      .catch((err) => {
        if (loadId !== this._songLoadId) return;
        if (this._songClipReady) return;
        console.warn('[song] download failed, fallback to stream', err);
        this._playViaStream(relativePath, autoPlay);
      });
  },

  /**
   * 进度条触摸开始
   */
  onProgressTouchStart(e) {
    this._clearProgressTimer();

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
      this._startProgressTimer();
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
    const { pageState, hasWronged, selectedAnswer, correctAnswer } = this.data;

    if (pageState === 'selected') {
      // 确认答案 - 暂停歌曲播放
      this._songAudio.pause();
      this.setData({ isPlaying: false });
      this._clearProgressTimer();

      wx.vibrateShort({ type: 'light' });
      if (selectedAnswer === correctAnswer) {
        this.setData({
          pageState: 'correct',
          // 只有第一次答对才计入正确数
          correctCount: hasWronged ? this.data.correctCount : this.data.correctCount + 1
        });
      } else {
        // 答错：显示 wrong 状态，标记已答错
        this.setData({ pageState: 'wrong', hasWronged: true });
      }
      return;
    }

    if (pageState === 'wrong') {
      // 再试试：重置选择
      wx.vibrateShort({ type: 'light' });
      this.setData({ pageState: 'idle', selectedAnswer: null });
      return;
    }

    if (pageState === 'idle' && !hasWronged) {
      // 播放根音（只有未答错过才能播放）
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
    wx.disableAlertBeforeUnload();
    songSession.prepareNextSessionAndPrefetchFirst({ forceNew: true });

    const { correctCount, totalQuestions } = this.data;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    // 检查剩余能量
    const remainingCount = playCount.getRemainingCount();
    const noMoreCount = remainingCount === 0;

    if (noMoreCount) {
      this.setData({
        showShareModal: true,
        shareModalTitle: '练习完成',
        shareModalMessage: sharePrompt.buildEnergyShareMessage(
          `答对 ${correctCount}/${totalQuestions} 题\n正确率：${percentage}%`
        ),
        shareModalCancelText: '稍后再说',
        navigateAfterShare: false
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
    if (this._songAudio) {
      this._songAudio.stop();
      this._songAudio.destroy();
    }
    this._clearProgressTimer();
    this._clearAutoPlayPoll();
    this._clearStreamFallbackTimer();
    audio.stopCurrentPlayback();
  },

  onShareModalCancel() {
    this.setData({ showShareModal: false });
    wx.navigateBack();
  },

  onShareModalShare() {
    this.setData({ showShareModal: false, navigateAfterShare: true });
  },

  /**
   * 分享到好友/群聊（歌曲模式不支持朋友圈分享）
   */
  onShareAppMessage() {
    const result = sharePrompt.getShareAppMessageReturn();
    if (this.data.navigateAfterShare) {
      this.setData({ navigateAfterShare: false });
      setTimeout(() => wx.navigateBack(), 300);
    }
    const { song } = this.data;
    if (song) {
      result.title = `${song.title} - ${song.artist}`;
    }
    return result;
  }
});
