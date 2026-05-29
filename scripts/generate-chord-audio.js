/**
 * 和弦音频生成脚本
 *
 * 使用方法：
 * 1. 确保已安装 ffmpeg: brew install ffmpeg
 * 2. 运行: node scripts/generate-chord-audio.js
 * 3. 生成的文件在 miniprogram/assets/audio/chords/ 目录
 * 4. 上传到云存储的 chords/ 目录
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 音符采样目录
const SAMPLES_DIR = path.join(__dirname, '../miniprogram/assets/audio/piano');
// 输出目录
const OUTPUT_DIR = path.join(__dirname, '../miniprogram/assets/audio/chords');

// 12个调
const ROOT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// 半音顺序
const SEMITONE_ORDER = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// 大调音阶半音步进
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

// 小调音阶半音步进
const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

/**
 * 获取大调音阶
 */
function getMajorScale(rootNote) {
  const rootIndex = SEMITONE_ORDER.indexOf(rootNote);
  return MAJOR_SCALE_INTERVALS.map(i => (rootIndex + i) % 12);
}

/**
 * 获取小调音阶
 */
function getMinorScale(rootNote) {
  const rootIndex = SEMITONE_ORDER.indexOf(rootNote);
  return MINOR_SCALE_INTERVALS.map(i => (rootIndex + i) % 12);
}

/**
 * 获取混合利底亚调式
 */
function getMixolydianScale(rootNote) {
  const rootIndex = SEMITONE_ORDER.indexOf(rootNote);
  return [0, 2, 4, 5, 7, 9, 10].map(i => (rootIndex + i) % 12);
}

/**
 * 获取利底亚调式
 */
function getLydianScale(rootNote) {
  const rootIndex = SEMITONE_ORDER.indexOf(rootNote);
  return [0, 2, 4, 6, 7, 9, 11].map(i => (rootIndex + i) % 12);
}

/**
 * 获取和弦音符（返回音符名称数组，用于采样文件）
 */
function getChordNotes(rootNote, chordSymbol) {
  const majorScale = getMajorScale(rootNote);
  const minorScale = getMinorScale(rootNote);

  // 三和弦映射
  const triadMap = {
    'I':   [0, 2, 4],
    'ii':  [1, 3, 5],
    'iii': [2, 4, 6],
    'IV':  [3, 5, 7],
    'V':   [4, 6, 8],
    'vi':  [5, 7, 9],
    'vii': [6, 8, 10]
  };

  // 七和弦映射
  const seventhMap = {
    'I△7':   [0, 2, 4, 6],
    'ii-7':  [1, 3, 5, 7],
    'iii-7': [2, 4, 6, 8],
    'IV△7':  [3, 5, 7, 9],
    'V7':    [4, 6, 8, 10],
    'vi-7':  [5, 7, 9, 11],
    'viiØ7': [6, 8, 10, 12]
  };

  // 副属和弦映射
  const secondaryDominantMap = {
    'V7/vi': { root: 5 },
    'V7/V':  { root: 4 },
    'V7/IV': { root: 3 },
    'V7/ii': { root: 1 },
    'V7/iii': { root: 2 }
  };

  // 借调和弦映射（从小调）
  const borrowedMap = {
    'iv':   [3, 5, 7],
    'bVI':  [5, 7, 9],
    'bVII': [6, 8, 10],
    'III':  [2, 4, 6],
    'II':   [1, 3, 5],
    'iv7':  [3, 5, 7, 9]
  };

  let indices = null;
  let scale = majorScale;

  // 检查三和弦
  if (triadMap[chordSymbol]) {
    indices = triadMap[chordSymbol];
    scale = majorScale;
  }
  // 检查七和弦
  else if (seventhMap[chordSymbol]) {
    indices = seventhMap[chordSymbol];
    scale = majorScale;
  }
  // 检查副属和弦
  else if (secondaryDominantMap[chordSymbol]) {
    const { root } = secondaryDominantMap[chordSymbol];
    const targetRootSemitone = majorScale[root];
    const targetRootName = SEMITONE_ORDER[targetRootSemitone];
    scale = getMixolydianScale(targetRootName);
    indices = [0, 2, 4, 6];
  }
  // 检查借调和弦
  else if (borrowedMap[chordSymbol]) {
    indices = borrowedMap[chordSymbol];
    if (['iv', 'bVI', 'bVII', 'III', 'iv7'].includes(chordSymbol)) {
      scale = minorScale;
    } else if (chordSymbol === 'II') {
      scale = getLydianScale(rootNote);
    }
  }

  if (!indices) return null;

  // 转换为音符名称（带八度）
  const notes = [];

  // 根音在 octave 2（低音）
  const rootSemitone = scale[indices[0] % 7];
  const rootNoteName = SEMITONE_ORDER[rootSemitone];
  notes.push(`${rootNoteName}2`);

  // 和弦音在 octave 3-4
  indices.forEach((idx, i) => {
    if (i === 0) return; // 跳过根音，已经添加

    const scaleIdx = idx % 7;
    const octaveOffset = Math.floor(idx / 7);
    const semitone = scale[scaleIdx];
    const noteName = SEMITONE_ORDER[semitone];
    const octave = 3 + octaveOffset;
    notes.push(`${noteName}${octave}`);
  });

  return notes;
}

/**
 * 获取级别对应的所有和弦符号
 */
function getChordSymbols(level) {
  switch (level) {
    case 'triads':
      return ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];
    case 'sevenths':
      return ['I△7', 'ii-7', 'iii-7', 'IV△7', 'V7', 'vi-7', 'viiØ7'];
    case 'chromatic':
      return [
        'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii',
        'V7/vi', 'V7/V', 'V7/IV', 'V7/ii',
        'iv', 'bVI', 'bVII', 'III', 'II'
      ];
    default:
      return ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];
  }
}

/**
 * 清理文件名中的特殊字符
 */
function sanitizeFileName(name) {
  return name
    .replace(/\//g, '_')
    .replace(/△/g, 'M')
    .replace(/Ø/g, 'h')
    .replace(/-/g, 'm');
}

/**
 * 使用 ffmpeg 混合多个音频文件
 */
function mixAudioFiles(inputFiles, outputFile) {
  // 检查所有输入文件是否存在
  for (const file of inputFiles) {
    if (!fs.existsSync(file)) {
      console.warn(`\n    ⚠️  采样文件不存在: ${file}`);
      return false;
    }
  }

  // 构建 ffmpeg 命令
  const inputs = inputFiles.map(f => `-i "${f}"`).join(' ');
  const filterInputs = inputFiles.map((_, i) => `[${i}:a]`).join('');
  const filterComplex = `${filterInputs}amix=inputs=${inputFiles.length}:duration=longest:dropout_transition=0[aout]`;

  const cmd = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[aout]" -c:a aac -b:a 96k "${outputFile}"`;

  try {
    execSync(cmd, { stdio: 'pipe' });
    // 验证文件是否真的生成了
    if (fs.existsSync(outputFile)) {
      return true;
    } else {
      console.error(`\n    ❌ 文件未生成: ${outputFile}`);
      return false;
    }
  } catch (error) {
    console.error(`\n    ❌ ffmpeg 错误: ${error.message}`);
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🎹 和弦音频生成器\n');

  // 检查 ffmpeg
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
  } catch (e) {
    console.error('❌ 请先安装 ffmpeg: brew install ffmpeg');
    process.exit(1);
  }

  // 创建输出目录
  const levels = ['triads', 'sevenths', 'chromatic'];

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalExists = 0;

  // 生成所有和弦音频
  levels.forEach(level => {
    console.log(`\n📦 级别: ${level}`);

    ROOT_NOTES.forEach(rootNote => {
      // 创建输出目录
      const outputDir = path.join(OUTPUT_DIR, level, rootNote);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      process.stdout.write(`  ${rootNote}: `);
      const symbols = getChordSymbols(level);
      const results = [];

      symbols.forEach(symbol => {
        const notes = getChordNotes(rootNote, symbol);
        if (!notes) {
          results.push('⚠️');
          totalSkipped++;
          return;
        }

        const safeSymbol = sanitizeFileName(symbol);
        const outputFile = path.join(outputDir, `${safeSymbol}.m4a`);

        // 如果文件已存在，跳过
        if (fs.existsSync(outputFile)) {
          results.push('·');
          totalExists++;
          return;
        }

        // 获取输入文件路径
        const inputFiles = notes.map(note => path.join(SAMPLES_DIR, `${note}.m4a`));

        if (mixAudioFiles(inputFiles, outputFile)) {
          results.push('✓');
          totalGenerated++;
        } else {
          results.push('✗');
          totalSkipped++;
        }
      });

      console.log(results.join(''));
    });
  });

  console.log(`\n✅ 完成！`);
  console.log(`   生成: ${totalGenerated} 个`);
  console.log(`   跳过: ${totalSkipped} 个`);
  console.log(`   已存在: ${totalExists} 个`);
  console.log(`\n📁 输出目录: ${OUTPUT_DIR}`);
  console.log('\n📋 下一步: 将 chords/ 目录上传到云存储');
}

main();
