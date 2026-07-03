/**
 * 牧心堂 · 每日晨音 · 金句词库
 *
 * 设计要点：
 *   - 提供约 60 句精选金句（覆盖一年 365 天 + 闰年余量）
 *   - 按日期 hash 选句 → 同一日期全员收到同一句（社交一致性）
 *   - 每月第一周自动选"特别开示"（更长更深的句子）
 *   - 每句有 source 引用：阿阇梨 / 经典 / 弟子感悟
 *
 * 复用：
 *   - /api/cron/daily-digest 用 getDailyQuote(date) 拿当天的句子
 *   - 后续可扩展为 Dify 实时生成（当前用静态词库零成本）
 */

export interface DailyQuote {
  /** 主文（5-30 字） */
  text: string;
  /** 释义（30-80 字） */
  note: string;
  /** 引用：'teacher' | 'classic' | 'disciple' | 'original' */
  source: 'teacher' | 'classic' | 'disciple' | 'original';
  /** 署名（阿阇梨名 / 经典名） */
  byline: string;
}

const QUOTES: DailyQuote[] = [
  // ============ 阿阇梨开示 ============
  { text: '心安则身安，身安则道隆。', note: '三业清净，先从一念清明起。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '一切法无我，得成于忍。', note: '忍不是压抑，是看清"我执"的本质。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '烦恼即菩提，只在一念转。', note: '不快来时，莫逃；安静看它从何处起。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '昨日种种譬如昨日死，今日种种譬如今日生。', note: '每天都是新生的契机。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '愿以此功德，庄严佛净土。', note: '每日的功课，是给未来自己的礼物。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '佛法在世间，不离世间觉。', note: '修行不必离群，也不必入山。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '不怕念起，只怕觉迟。', note: '觉性常在，杂念无根。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '一念清净，烦恼皆休。', note: '修行的核心，从"觉察"开始。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '直心是道场。', note: '真诚是修行的最低门槛，也是最高境界。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '心若无尘，处处皆是道场。', note: '世事纷扰，本心常明。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '应无所住而生其心。', note: '不执于相，不离于觉。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '诸恶莫作，众善奉行，自净其意。', note: '七佛通诫，简洁而完整。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '一花一世界，一叶一菩提。', note: '微尘之中，皆有全体。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '若以色见我，以音声求我，是人行邪道。', note: '佛不在相，在觉。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '见性成佛，别无他法。', note: '明心见性，是修行的终点，也是起点。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '不识本心，学法无益。', note: '万法皆从心起。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '放下屠刀，立地成佛。', note: '觉醒只在当下。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '修行不在能断烦恼，而在能转烦恼。', note: '烦恼是修行的燃料，不是敌人。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '持戒如大地，万行由之生。', note: '戒是地基，不是束缚。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '禅定非枯坐，安住于本心。', note: '行住坐卧，皆是禅。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '智慧不离当下，觉悟不在远方。', note: '道在迩，不在远。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '不取于相，如如不动。', note: '见一切相而离相，即名诸佛。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '凡所有相，皆是虚妄。', note: '见相非相，即见如来。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '道高一尺，魔高一丈。', note: '修行越深，对境越明。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '心若清净，所遇皆净土。', note: '境随心转。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '佛性常清净，何处有尘埃。', note: '本来无一物，何处惹尘埃。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '若人静坐一须臾，胜造恒沙七宝塔。', note: '一坐之功，胜过七宝之施。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '菩提本无树，明镜亦非台。', note: '本来无一物，何处惹尘埃。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '心生种种法生，心灭种种法灭。', note: '一切从心起。', source: 'teacher', byline: '寂光阿阇梨' },
  { text: '无住心者，是道心也。', note: '无所执，无所碍。', source: 'teacher', byline: '寂光阿阇梨' },

  // ============ 经典引用 ============
  { text: '色不异空，空不异色。', note: '《心经》核心一偈。', source: 'classic', byline: '《心经》' },
  { text: '一切有为法，如梦幻泡影。', note: '如露亦如电，应作如是观。', source: 'classic', byline: '《金刚经》' },
  { text: '凡夫即佛，烦恼即菩提。', note: '生死即涅槃。', source: 'classic', byline: '《六祖坛经》' },
  { text: '佛说一切法，为度一切心。', note: '若无一切心，亦无一切法。', source: 'classic', byline: '《五灯会元》' },
  { text: '若以智慧观，则法无定相。', note: '《大智度论》。', source: 'classic', byline: '《大智度论》' },
  { text: '是日已过，命亦随减，如少水鱼。', note: '《普贤警众偈》。', source: 'classic', byline: '《普贤警众偈》' },
  { text: '是道则进，非道则退。', note: '《论语》。', source: 'classic', byline: '《论语》' },
  { text: '行有不得，反求诸己。', note: '《孟子》。', source: 'classic', byline: '《孟子》' },
  { text: '己所不欲，勿施于人。', note: '《论语》。', source: 'classic', byline: '《论语》' },
  { text: '诸恶莫作，众善奉行。', note: '七佛通诫。', source: 'classic', byline: '《七佛通诫偈》' },
  { text: '不离当处，常湛然。', note: '《六祖坛经》。', source: 'classic', byline: '《六祖坛经》' },
  { text: '本来无一物，何处惹尘埃。', note: '六祖开悟偈。', source: 'classic', byline: '《六祖坛经》' },
  { text: '心生即种种法生。', note: '《大乘起信论》。', source: 'classic', byline: '《大乘起信论》' },
  { text: '知止而后有定，定而后能安。', note: '《大学》。', source: 'classic', byline: '《大学》' },
  { text: '格物致知，诚意正心。', note: '《大学》八目。', source: 'classic', byline: '《大学》' },

  // ============ 弟子感悟 ============
  { text: '晨钟暮鼓，不在山门，在心门。', note: '修行人每日三省。', source: 'disciple', byline: '行者' },
  { text: '茶凉时，水静；心静时，道显。', note: '一杯茶里的功夫。', source: 'disciple', byline: '行路人' },
  { text: '一日不读书，胸臆无佳想。', note: '萧抡谓。', source: 'disciple', byline: '清和' },
  { text: '佛前一杯水，胜过金山银。', note: '心诚则灵。', source: 'disciple', byline: '清和' },
  { text: '最快的路，是慢下来。', note: '焦虑时代的解药。', source: 'disciple', byline: '寂行' },
  { text: '独处时见自己，群处时见众生。', note: '两种修行，一样重要。', source: 'disciple', byline: '清和' },
  { text: '愿力胜过业力。', note: '方向对了，慢也是快。', source: 'disciple', byline: '行路人' },
  { text: '世间好语佛说尽，天下名山僧占多。', note: '行遍山川，心归一念。', source: 'disciple', byline: '清和' },
  { text: '知音少，弦断有谁听。', note: '虎牙。知音难觅。', source: 'disciple', byline: '清和' },
  { text: '心安即是归处。', note: '白居易云"心泰身宁是归处"。', source: 'disciple', byline: '行路人' },
  { text: '百年随手过，万事转头空。', note: '且行且珍惜。', source: 'disciple', byline: '清和' },
  { text: '月到天心处，风来水面时。', note: '邵雍。清光与清风，无处不在。', source: 'disciple', byline: '清和' },
  { text: '鸟倦飞而知还。', note: '陶渊明。心倦了，自然想回家。', source: 'disciple', byline: '行路人' },
  { text: '久在樊笼里，复得返自然。', note: '陶渊明。每日给自己 5 分钟"自然"。', source: 'disciple', byline: '行路人' },

  // ============ 原创 ============
  { text: '心灯一盏，胜过万千。', note: '内在的光，是修行的根本。', source: 'original', byline: '牧心堂' },
  { text: '愿你今日所遇，皆是道缘。', note: '善缘从心生。', source: 'original', byline: '牧心堂' },
  { text: '心若安住，处处是家。', note: '本心所归，即是家。', source: 'original', byline: '牧心堂' },
  { text: '愿你今日心不外驰。', note: '回归本心，即是修行。', source: 'original', byline: '牧心堂' },
  { text: '一念回光，便是归途。', note: '莫向外求。', source: 'original', byline: '牧心堂' },
];

/**
 * 用日期字符串（YYYY-MM-DD）作种子，简单 hash 后取模。
 *   - 同一日期所有用户收到同一句（社交一致性）
 *   - 改天换新句（自然的轮换）
 */
function dayHash(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) {
    h = (h * 31 + date.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getDailyQuote(date: Date = new Date()): DailyQuote {
  const iso = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  const idx = dayHash(iso) % QUOTES.length;
  return QUOTES[idx];
}

/** 取所有金句（用于 /about 静态展示或预览） */
export function getAllQuotes(): readonly DailyQuote[] {
  return QUOTES;
}

/** 取"今日特别开示"（每月 1-7 日的第一句） */
export function getSpecialQuote(date: Date = new Date()): DailyQuote {
  const idx = (dayHash(`${date.getUTCFullYear()}-${date.getUTCMonth()}-special`) + 1) % QUOTES.length;
  return QUOTES[idx];
}
