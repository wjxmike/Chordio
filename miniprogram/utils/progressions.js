/**
 * Chord Hero - 和弦走向题库
 * 每个级别包含 20+ 条真实存在的和弦走向
 */

// Level 1: 三和弦 (Triads)
// 基于自然大调的 I, ii, iii, IV, V, vi, vii°
const TRIADS_PROGRESSIONS = [
  // 流行经典
  ['I', 'V', 'vi', 'IV'],           // Axis of Awesome / "4 chords"
  ['I', 'IV', 'V', 'I'],             // 最基础
  ['I', 'vi', 'IV', 'V'],            // 50s progression
  ['vi', 'IV', 'I', 'V'],            // Pop punk / rock
  ['I', 'V', 'vi', 'V'],             // 循环感
  ['I', 'IV', 'I', 'V'],             // 简单流行

  // 爵士/标准
  ['ii', 'V', 'I'],                  // 爵士基础
  ['I', 'vi', 'ii', 'V'],            // Circle of fifths
  ['iii', 'vi', 'ii', 'V'],          // 爵士前奏
  ['I', 'IV', 'ii', 'V'],            // Turnaround 变体

  // 摇滚/民谣
  ['I', 'IV', 'V', 'IV'],            // Rock classic
  ['I', 'V', 'IV', 'I'],             // Blues rock
  ['vi', 'I', 'V', 'IV'],            // Alternative
  ['I', 'iii', 'IV', 'I'],           // Folk
  ['I', 'IV', 'I', 'IV'],            // Folk/Blues

  // 更多变化
  ['I', 'ii', 'IV', 'V'],            // 混合
  ['vi', 'ii', 'V', 'I'],            // 逆五度圈
  ['I', 'V', 'IV', 'V'],             // 循环
  ['IV', 'I', 'V', 'vi'],            // 变体
  ['I', 'iii', 'vi', 'IV'],          // 情感丰富
  ['vi', 'V', 'IV', 'I'],            // 下行
  ['I', 'ii', 'vi', 'IV'],           // 柔和
  ['V', 'vi', 'IV', 'I'],            // 从属开始
  ['I', 'IV', 'vi', 'V'],            // 逆转
  ['ii', 'IV', 'I', 'V'],            // 流行变体
];

// Level 2: 七和弦 (Seventh Chords)
// I△7, ii-7, iii-7, IV△7, V7, vi-7, viiØ7
const SEVENTHS_PROGRESSIONS = [
  // 爵士标准
  ['ii-7', 'V7', 'I△7'],             // 最基础 ii-V-I
  ['I△7', 'vi-7', 'ii-7', 'V7'],     // I-vi-ii-V
  ['iii-7', 'vi-7', 'ii-7', 'V7'],   // iii-vi-ii-V
  ['ii-7', 'V7', 'I△7', 'vi-7'],     // ii-V-I-vi
  ['vi-7', 'ii-7', 'V7', 'I△7'],     // vi-ii-V-I

  // Bossa Nova
  ['I△7', 'iii-7', 'vi-7', 'ii-7'],  // 下行三度
  ['ii-7', 'V7', 'iii-7', 'vi-7'],   // ii-V-iii-vi
  ['I△7', 'IV△7', 'iii-7', 'vi-7'],  // 柔和下行

  // R&B/Soul
  ['I△7', 'IV△7', 'V7', 'I△7'],     // I-IV-V-I with 7ths
  ['I△7', 'V7', 'vi-7', 'IV△7'],     // Pop with 7ths
  ['vi-7', 'V7', 'IV△7', 'I△7'],     // 下行
  ['I△7', 'iii-7', 'vi-7', 'V7'],    // 情感

  // 更多爵士
  ['I△7', 'ii-7', 'iii-7', 'IV△7'],  // 顺阶上行
  ['IV△7', 'iii-7', 'ii-7', 'I△7'],  // 顺阶下行
  ['I△7', 'IV△7', 'ii-7', 'V7'],     // 转位
  ['viiØ7', 'iii-7', 'vi-7', 'ii-7'], // 半减开始
  ['ii-7', 'viiØ7', 'I△7', 'vi-7'],  // 混合半减

  // Fusion/Modern
  ['I△7', 'V7', 'IV△7', 'I△7'],     // 电力
  ['vi-7', 'I△7', 'ii-7', 'V7'],     // 循环
  ['iii-7', 'V7', 'I△7', 'vi-7'],    // 变体
  ['I△7', 'vi-7', 'V7', 'IV△7'],     // 反向
  ['ii-7', 'I△7', 'vi-7', 'V7'],     // 交换
  ['IV△7', 'V7', 'vi-7', 'I△7'],     // 从IV开始
];

// Level 3: 离调和弦 (Chromatic Chords)
// 包含副属和弦、借调和弦等
// 使用简化标记：
// V/vi = V7(vi), V/IV = V7(IV), etc.
// iv = iv (小调 iv), bVI, bVII (Mixolydian)
// II = II (大调 II，来自 Lydian)
const CHROMATIC_PROGRESSIONS = [
  // 副属和弦 - Secondary Dominants
  ['I', 'V7/vi', 'vi', 'IV'],        // I -> V/vi -> vi
  ['I', 'V7/V', 'V', 'I'],           // 属的属
  ['I', 'V7/ii', 'ii', 'V'],         // supertonic 的属
  ['vi', 'V7/V', 'V', 'I'],          // 从 vi 开始
  ['I', 'V7/IV', 'IV', 'V'],         // 下属的属

  // 借调和弦 - Borrowed Chords
  ['I', 'IV', 'iv', 'I'],            // iv (小调 iv) - 非常经典
  ['I', 'bVII', 'IV', 'I'],          // Mixolydian bVII
  ['I', 'bVI', 'bVII', 'I'],         // Aeolian bVI-bVII
  ['I', 'V', 'iv', 'I'],             // 变体
  ['I', 'IV', 'bVII', 'I'],          // Folk rock

  // 流行/摇滚的离调
  ['I', 'V7/vi', 'vi', 'V7/V'],      // 连续副属
  ['I', 'III', 'IV', 'I'],           // III (来自平行小调)
  ['I', 'bVII', 'bVI', 'I'],         // 下行
  ['I', 'VII', 'IV', 'I'],           // VII (来自平行小调)
  ['I', 'II', 'IV', 'I'],            // II (Lydian)

  // 爵士离调
  ['I', 'V7/vi', 'vi-7', 'ii-7'],    // 爵士版副属
  ['ii-7', 'V7/V', 'V7', 'I△7'],     // 爵士 ii-V-I 变体
  ['I△7', 'IV7', 'iv7', 'I△7'],      // 7th 版借调
  ['I', 'V7/IV', 'IV', 'V7/vi'],     // 连环副属

  // 更多混合
  ['I', 'iv', 'IV', 'V'],            // 情感转折
  ['vi', 'V7/V', 'V', 'V7/IV'],      // 副属链
  ['I', 'bVI', 'IV', 'V'],           // 戏剧性
  ['I', 'III', 'vi', 'IV'],          // 平行小调借调
  ['I', 'V7/ii', 'ii', 'V7/vi'],     // 双副属
  ['IV', 'iv', 'I', 'V'],            // iv 作为过渡
];

module.exports = {
  TRIADS_PROGRESSIONS,
  SEVENTHS_PROGRESSIONS,
  CHROMATIC_PROGRESSIONS
};
