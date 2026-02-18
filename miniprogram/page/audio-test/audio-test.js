/**
 * Web Audio 真机测试页面
 * 用于诊断 Web Audio 在真机环境下的行为
 */

Page({
  data: {
    logs: [],
    ctxState: '未创建',
    ctxSampleRate: '-',
    ctxCurrentTime: '-',
    samplesLoaded: 0,
    samplesTotal: 49,
    isPlaying: false,
    testResults: []
  },

  onLoad() {
    this.log('页面加载');
    this.checkWebAudioSupport();
  },

  /**
   * 添加日志
   */
  log(msg, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const logMsg = `[${time}] ${msg}`;
    console.log(logMsg);
    this.setData({
      logs: [...this.data.logs, { msg: logMsg, type }]
    });
  },

  /**
   * 检测 Web Audio 支持
   */
  checkWebAudioSupport() {
    this.log('检测 Web Audio 支持...');

    if (typeof wx.createWebAudioContext === 'function') {
      this.log('✓ wx.createWebAudioContext 可用');
    } else {
      this.log('✗ wx.createWebAudioContext 不可用', 'error');
      return;
    }

    // 检测 InnerAudio
    if (typeof wx.createInnerAudioContext === 'function') {
      this.log('✓ wx.createInnerAudioContext 可用');
    } else {
      this.log('✗ wx.createInnerAudioContext 不可用', 'error');
    }
  },

  /**
   * 创建 Web Audio 上下文
   */
  createCtx() {
    this.log('创建 Web Audio 上下文...');

    try {
      this.audioCtx = wx.createWebAudioContext();
      this.log(`✓ 上下文创建成功`);
      this.log(`  - state: ${this.audioCtx.state}`);
      this.log(`  - sampleRate: ${this.audioCtx.sampleRate}`);

      this.setData({
        ctxState: this.audioCtx.state,
        ctxSampleRate: this.audioCtx.sampleRate
      });

      // 监听状态变化
      if (this.audioCtx.onstatechange) {
        this.audioCtx.onstatechange = () => {
          this.log(`状态变化: ${this.audioCtx.state}`);
          this.setData({ ctxState: this.audioCtx.state });
        };
      }
    } catch (e) {
      this.log(`✗ 创建失败: ${e.message}`, 'error');
    }
  },

  /**
   * 获取上下文状态
   */
  checkCtxState() {
    if (!this.audioCtx) {
      this.log('上下文未创建', 'error');
      return;
    }

    this.log(`当前状态: ${this.audioCtx.state}`);
    this.log(`当前时间: ${this.audioCtx.currentTime.toFixed(3)}s`);
    this.log(`采样率: ${this.audioCtx.sampleRate}`);

    this.setData({
      ctxState: this.audioCtx.state,
      ctxCurrentTime: this.audioCtx.currentTime.toFixed(3)
    });
  },

  /**
   * 尝试恢复上下文
   */
  async resumeCtx() {
    if (!this.audioCtx) {
      this.log('上下文未创建', 'error');
      return;
    }

    this.log(`尝试恢复... 当前状态: ${this.audioCtx.state}`);

    try {
      await this.audioCtx.resume();
      this.log(`✓ 恢复成功，新状态: ${this.audioCtx.state}`);
      this.setData({ ctxState: this.audioCtx.state });
    } catch (e) {
      this.log(`✗ 恢复失败: ${e.message}`, 'error');
    }
  },

  /**
   * 测试1: 直接播放纯音（无用户交互前）
   */
  testPlayBeforeInteraction() {
    this.log('【测试1】无交互直接播放...');
    this.playOscillator(440);
  },

  /**
   * 测试2: 用户点击后播放
   */
  testPlayAfterInteraction() {
    this.log('【测试2】用户点击后播放...');
    this.playOscillator(660);
  },

  /**
   * 播放振荡器（纯音）
   */
  playOscillator(freq) {
    if (!this.audioCtx) {
      this.log('上下文未创建', 'error');
      return;
    }

    try {
      this.log(`创建振荡器 ${freq}Hz，当前状态: ${this.audioCtx.state}`);

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.3;

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      // 调度播放
      const startTime = this.audioCtx.currentTime;
      osc.start(startTime);
      osc.stop(startTime + 0.5);

      this.log(`✓ 调度成功，开始时间: ${startTime.toFixed(3)}`);
      this.setData({ isPlaying: true });

      osc.onended = () => {
        this.log('播放结束');
        this.setData({ isPlaying: false });
      };

    } catch (e) {
      this.log(`✗ 播放失败: ${e.message}`, 'error');
    }
  },

  /**
   * 测试3: 加载并播放音频采样
   */
  async testLoadAndPlaySample() {
    this.log('【测试3】加载并播放采样...');

    if (!this.audioCtx) {
      this.log('上下文未创建', 'error');
      return;
    }

    // 使用一个简单的网络音频
    const testUrl = 'https://downsc.chinaz.net/files/download/sound1/201509/5835.mp3';

    this.log(`下载测试音频: ${testUrl}`);

    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: testUrl,
          responseType: 'arraybuffer',
          success: resolve,
          fail: (err) => {
            this.log(`wx.request fail: ${JSON.stringify(err)}`, 'error');
            reject(err);
          }
        });
      });

      this.log(`下载完成，状态码: ${res.statusCode}，大小: ${res.data ? res.data.byteLength : 0} bytes`);

      if (res.statusCode !== 200 || !res.data) {
        this.log(`✗ 下载失败: HTTP ${res.statusCode}`, 'error');
        return;
      }

      // 解码
      this.log('开始解码...');
      const buffer = await new Promise((resolve, reject) => {
        this.audioCtx.decodeAudioData(res.data,
          (buf) => {
            this.log(`decodeAudioData 成功回调`);
            resolve(buf);
          },
          (err) => {
            this.log(`decodeAudioData 错误回调: ${JSON.stringify(err)}`, 'error');
            reject(err);
          }
        );
      });

      this.log(`✓ 解码成功，时长: ${buffer.duration.toFixed(2)}s，采样率: ${buffer.sampleRate}`);

      // 播放
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioCtx.destination);
      source.start(0);

      this.log('✓ 采样播放已调度');

    } catch (e) {
      this.log(`✗ 测试失败: ${JSON.stringify(e)}`, 'error');
    }
  },

  /**
   * 测试3b: 使用 InnerAudio 播放（对比测试）
   */
  testInnerAudio() {
    this.log('【测试3b】使用 InnerAudio 播放...');

    // 使用云存储的音频文件
    const cloudPath = 'cloud://cloudbase-3gk50z3ibc7a8b9f.636c-cloudbase-3gk50z3ibc7a8b9f-1391793431/piano/C4.m4a';

    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloudbase-3gk50z3ibc7a8b9f',
        traceUser: true
      });
    }

    // 先下载，再用 InnerAudio 播放
    wx.cloud.downloadFile({
      fileID: cloudPath,
      success: (res) => {
        this.log(`下载成功: ${res.tempFilePath}`);
        const innerAudio = wx.createInnerAudioContext();
        innerAudio.src = res.tempFilePath;
        innerAudio.volume = 1;

        innerAudio.onCanplay(() => {
          this.log('InnerAudio: onCanplay');
          innerAudio.play();
        });

        innerAudio.onPlay(() => {
          this.log('InnerAudio: onPlay');
        });

        innerAudio.onEnded(() => {
          this.log('InnerAudio: onEnded');
          innerAudio.destroy();
        });

        innerAudio.onError((err) => {
          this.log(`InnerAudio onError: ${JSON.stringify(err)}`, 'error');
        });
      },
      fail: (err) => {
        this.log(`下载失败: ${JSON.stringify(err)}`, 'error');
      }
    });
  },

  /**
   * 测试3c: 直接用云存储路径 InnerAudio 播放
   */
  testInnerAudioCloud() {
    this.log('【测试3c】InnerAudio 直接使用云路径...');

    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloudbase-3gk50z3ibc7a8b9f',
        traceUser: true
      });
    }

    const cloudPath = 'cloud://cloudbase-3gk50z3ibc7a8b9f.636c-cloudbase-3gk50z3ibc7a8b9f-1391793431/piano/C4.m4a';

    const innerAudio = wx.createInnerAudioContext();
    innerAudio.src = cloudPath;  // 直接使用云路径
    innerAudio.volume = 1;

    innerAudio.onCanplay(() => {
      this.log('InnerAudio: onCanplay');
      innerAudio.play();
    });

    innerAudio.onPlay(() => {
      this.log('InnerAudio: onPlay');
    });

    innerAudio.onEnded(() => {
      this.log('InnerAudio: onEnded');
      innerAudio.destroy();
    });

    innerAudio.onError((err) => {
      this.log(`InnerAudio onError: ${JSON.stringify(err)}`, 'error');
    });
  },

  /**
   * 测试4: 预加载钢琴采样（使用 wx.cloud.downloadFile）
   */
  async testPreloadPianoSamples() {
    this.log('【测试4】预加载钢琴采样（使用 cloud.downloadFile）...');

    if (!this.audioCtx) {
      this.log('上下文未创建', 'error');
      return;
    }

    // 初始化云开发
    if (wx.cloud) {
      try {
        wx.cloud.init({
          env: 'cloudbase-3gk50z3ibc7a8b9f',
          traceUser: true
        });
        this.log('云开发初始化成功');
      } catch (e) {
        this.log(`云开发初始化失败: ${JSON.stringify(e)}`, 'error');
      }
    } else {
      this.log('wx.cloud 不可用', 'error');
      return;
    }

    const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const octaves = [3, 4];
    let loaded = 0;

    this.sampleBuffers = {};

    for (const octave of octaves) {
      for (const note of notes) {
        const key = `${note}${octave}`;
        const cloudPath = `cloud://cloudbase-3gk50z3ibc7a8b9f.636c-cloudbase-3gk50z3ibc7a8b9f-1391793431/piano/${key}.m4a`;

        this.log(`加载 ${key}...`);

        try {
          // 使用 wx.cloud.downloadFile 下载到本地
          this.log(`  下载: ${cloudPath}`);
          const downloadRes = await new Promise((resolve, reject) => {
            wx.cloud.downloadFile({
              fileID: cloudPath,
              success: resolve,
              fail: (err) => {
                this.log(`  downloadFile fail: ${JSON.stringify(err)}`, 'error');
                reject(err);
              }
            });
          });

          this.log(`  下载成功，临时路径: ${downloadRes.tempFilePath}`);

          // 读取文件为 ArrayBuffer
          const fileData = await new Promise((resolve, reject) => {
            wx.getFileSystemManager().readFile({
              filePath: downloadRes.tempFilePath,
              success: (res) => resolve(res.data),
              fail: (err) => {
                this.log(`  readFile fail: ${JSON.stringify(err)}`, 'error');
                reject(err);
              }
            });
          });

          this.log(`  读取成功，大小: ${fileData.byteLength} bytes`);

          // 解码
          this.log(`  解码中...`);
          const buffer = await new Promise((resolve, reject) => {
            this.audioCtx.decodeAudioData(fileData,
              (buf) => resolve(buf),
              (err) => {
                this.log(`  decodeAudioData fail: ${JSON.stringify(err)}`, 'error');
                reject(err);
              }
            );
          });

          this.sampleBuffers[key] = buffer;
          loaded++;
          this.setData({ samplesLoaded: loaded });
          this.log(`✓ ${key} 加载成功，时长: ${buffer.duration.toFixed(2)}s`);

        } catch (e) {
          this.log(`✗ ${key} 加载异常: ${JSON.stringify(e)}`, 'error');
        }
      }
    }

    this.log(`采样加载完成: ${loaded}/${notes.length * octaves.length}`);
  },

  /**
   * 测试5: 播放钢琴采样
   */
  testPlayPianoSample() {
    this.log('【测试5】播放钢琴采样...');

    if (!this.audioCtx) {
      this.log('上下文未创建', 'error');
      return;
    }

    if (!this.sampleBuffers || Object.keys(this.sampleBuffers).length === 0) {
      this.log('没有已加载的采样，请先执行测试4', 'error');
      return;
    }

    const keys = Object.keys(this.sampleBuffers);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];

    this.log(`播放: ${randomKey}`);

    try {
      const source = this.audioCtx.createBufferSource();
      const gain = this.audioCtx.createGain();

      source.buffer = this.sampleBuffers[randomKey];
      gain.gain.value = 0.5;

      source.connect(gain);
      gain.connect(this.audioCtx.destination);

      source.start(0);

      this.log(`✓ ${randomKey} 播放已调度`);
      this.setData({ isPlaying: true });

      source.onended = () => {
        this.log(`${randomKey} 播放结束`);
        this.setData({ isPlaying: false });
      };

    } catch (e) {
      this.log(`✗ 播放失败: ${e.message}`, 'error');
    }
  },

  /**
   * 测试6: 同时播放多个音符（测试同步）
   */
  testPlayChord() {
    this.log('【测试6】同时播放3个音符（和弦测试）...');

    if (!this.audioCtx) {
      this.log('上下文未创建', 'error');
      return;
    }

    if (!this.sampleBuffers || Object.keys(this.sampleBuffers).length < 3) {
      this.log('采样不足，请先执行测试4', 'error');
      return;
    }

    const keys = ['C4', 'E4', 'G4'];
    this.log(`播放和弦: ${keys.join(' + ')}`);

    const startTime = this.audioCtx.currentTime + 0.1;
    this.log(`调度时间: ${startTime.toFixed(3)}`);

    keys.forEach(key => {
      if (this.sampleBuffers[key]) {
        const source = this.audioCtx.createBufferSource();
        const gain = this.audioCtx.createGain();

        source.buffer = this.sampleBuffers[key];
        gain.gain.value = 0.4;

        source.connect(gain);
        gain.connect(this.audioCtx.destination);

        source.start(startTime);

        this.log(`  ${key} 已调度`);
      } else {
        this.log(`  ${key} 采样不存在`, 'error');
      }
    });

    this.setData({ isPlaying: true });
    setTimeout(() => {
      this.setData({ isPlaying: false });
      this.log('和弦播放结束');
    }, 2000);
  },

  /**
   * 测试7: 连续播放（测试延迟）
   */
  testSequentialPlay() {
    this.log('【测试7】连续播放5个音符（延迟测试）...');

    if (!this.audioCtx) {
      this.log('上下文未创建', 'error');
      return;
    }

    if (!this.sampleBuffers || Object.keys(this.sampleBuffers).length < 5) {
      this.log('采样不足，请先执行测试4', 'error');
      return;
    }

    const sequence = ['C4', 'D4', 'E4', 'F4', 'G4'];
    const interval = 0.5; // 500ms 间隔

    this.log(`播放序列: ${sequence.join(' → ')}`);

    sequence.forEach((key, index) => {
      if (this.sampleBuffers[key]) {
        const source = this.audioCtx.createBufferSource();
        const gain = this.audioCtx.createGain();

        source.buffer = this.sampleBuffers[key];
        gain.gain.value = 0.5;

        source.connect(gain);
        gain.connect(this.audioCtx.destination);

        const startTime = this.audioCtx.currentTime + index * interval;
        source.start(startTime);

        this.log(`  ${key} 调度于 ${(index * interval * 1000).toFixed(0)}ms`);
      }
    });

    this.setData({ isPlaying: true });
    setTimeout(() => {
      this.setData({ isPlaying: false });
      this.log('序列播放结束');
    }, sequence.length * interval * 1000 + 1000);
  },

  /**
   * 清除日志
   */
  clearLogs() {
    this.setData({ logs: [] });
    this.log('日志已清除');
  },

  /**
   * 复制日志
   */
  copyLogs() {
    const logText = this.data.logs.map(l => l.msg).join('\n');
    wx.setClipboardData({
      data: logText,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  /**
   * 运行所有测试
   */
  async runAllTests() {
    this.log('========== 开始运行所有测试 ==========');

    this.createCtx();
    await this.sleep(500);

    this.checkCtxState();
    await this.sleep(300);

    await this.resumeCtx();
    await this.sleep(300);

    this.testPlayBeforeInteraction();
    await this.sleep(1000);

    this.testPlayAfterInteraction();
    await this.sleep(1000);

    this.log('========== 所有测试完成 ==========');
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
});
