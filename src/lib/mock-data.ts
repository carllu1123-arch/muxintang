/**
 * 牧心堂 · 中央 Mock 数据层
 *
 * 设计原则：
 * 1. 所有路由共用同一份 mock 数据，便于日后切换为 Supabase 真实数据
 * 2. 全部类型显式声明，方便编辑器跳转与重构
 * 3. generateStaticParams 用同一个查找函数，确保预渲染数量正确
 */

export type LearnCategory = 'lifecode' | 'habitat' | 'name' | 'teacher';

export interface CategoryMeta {
  id: LearnCategory;
  title: string;
  sub: string;
  desc: string;
  href: string;
  glyph: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'lifecode',
    title: '生命格局',
    sub: 'Lifecode',
    desc: '从八字到数字命理，识自己。',
    href: '/learn/lifecode',
    glyph: '☷',
  },
  {
    id: 'habitat',
    title: '家居环境',
    sub: 'Habitat',
    desc: '风水堪舆与现代居住的和解。',
    href: '/learn/habitat',
    glyph: '◉',
  },
  {
    id: 'name',
    title: '姓名心解',
    sub: 'Namenoma',
    desc: '一个字，便是一生的回向。',
    href: '/learn/name',
    glyph: '✎',
  },
  {
    id: 'teacher',
    title: '阿阇梨开示',
    sub: 'Ācārya',
    desc: '根本上师的当机法语。',
    href: '/learn/teacher',
    glyph: '◈',
  },
];

/* ============ 密解文章 ============ */

export interface Article {
  category: LearnCategory;
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  publishedAt: string; // ISO date
  readingMinutes: number;
  body: string[]; // 段落数组
}

export const ARTICLES: Article[] = [
  {
    category: 'lifecode',
    slug: 'intro',
    title: '生命代码：识自己的第一步',
    subtitle: '从一串数字开始，看见本然频率',
    author: '寂光阿阇梨',
    publishedAt: '2026-05-12',
    readingMinutes: 8,
    body: [
      '生辰如一串代码，写在你未出生之前。它不是宿命，而是注脚——',
      '我们用这套代码做什么？不是为了对号入座，而是为了在喧闹中找到一个轴心。',
      '当你静下来，呼吸回到丹田，代码就显影了。它不是写给你"信"的，是写给你"听"的。',
      '先放下评判，让这串数字变成一条河流，流过你的身体、心意、觉性。',
      '然后你就会明白：所谓命运，不是被困住，而是被看见。',
    ],
  },
  {
    category: 'lifecode',
    slug: 'five-elements',
    title: '五行不缺，只是被遮蔽',
    subtitle: '调候的智慧：从缺到通的修行',
    author: '寂光阿阇梨',
    publishedAt: '2026-05-20',
    readingMinutes: 12,
    body: [
      '常有同修问："我命中缺金，该怎么补？"',
      '其实不是缺，是被遮蔽。打个比方——水不流动就成了死水，但水还是水。',
      '调候不是补救，是疏通。找到你生命中不流动的那一行，让它流起来。',
      '金主决断，水主智慧，木主生长，火主文明，土主承载。',
      '你以为你缺，其实是你忘了怎么用。',
    ],
  },
  {
    category: 'habitat',
    slug: 'orientation',
    title: '方位：家的呼吸',
    subtitle: '从玄空飞星到当下生活的智慧',
    author: '明心居士',
    publishedAt: '2026-04-30',
    readingMinutes: 10,
    body: [
      '房子不是钢筋水泥的容器，而是有呼吸的生命。',
      '进门先看气——是温润还是急躁？明堂是否开阔？',
      '不必拘泥于"东南摆什么、西北摆什么"的死法。',
      '让阳光、空气、动线服务于你和家人的状态，这就是最朴素的风水。',
    ],
  },
  {
    category: 'habitat',
    slug: 'zodiac',
    title: '生肖与户型：不必迷信的对应',
    subtitle: '一个现代人的家居笔记',
    author: '明心居士',
    publishedAt: '2026-05-08',
    readingMinutes: 6,
    body: [
      '网上常说"属虎不能住西边"——这其实把一门古老的学问简化成了标签。',
      '真正重要的是：你的生活节奏、家人关系、职业状态。',
      '户型服务于人，而非反过来。',
    ],
  },
  {
    category: 'name',
    slug: 'strokes',
    title: '姓名与笔画：被滥用的"五格剖象"',
    subtitle: '谈姓名学常见误区',
    author: '空行居士',
    publishedAt: '2026-04-22',
    readingMinutes: 7,
    body: [
      '姓名学最容易被工具化——输入两个字，跳出一个"分数"。',
      '但名字不是一个分数。它是你被叫出、写出、想起时的全部回声。',
      '笔画只是入口，音律、字形、五行、字义四者合参，方见真章。',
    ],
  },
  {
    category: 'name',
    slug: 'phonetics',
    title: '音律场：名字如何"响"在世上',
    subtitle: '从声调到共鸣',
    author: '空行居士',
    publishedAt: '2026-05-15',
    readingMinutes: 9,
    body: [
      '读一下自己的名字。读三遍。',
      '你听到了什么？是"硬"还是"软"？是"快"还是"慢"？',
      '音律场不是玄学，是语言学 + 心理学的结合。',
      '让名字的发声与你的内在状态对齐，本身就是一种修行。',
    ],
  },
  {
    category: 'teacher',
    slug: 'dharma-1',
    title: '静坐之前，先问自己一个问题',
    subtitle: '根本上师的开示（一）',
    author: '寂光阿阇梨',
    publishedAt: '2026-06-01',
    readingMinutes: 4,
    body: [
      '"我真的在过想要的生活吗？"',
      '不要急着用大脑回答。让这个问题沉下去，沉到胸口，沉到丹田。',
      '如果你的答案是"是"——继续。',
      '如果你的答案是"不是"——也继续。',
      '因为这个问题本身，就是修行的开始。',
    ],
  },
  {
    category: 'teacher',
    slug: 'dharma-2',
    title: '关于焦虑：让它流过',
    subtitle: '根本上师的开示（二）',
    author: '寂光阿阇梨',
    publishedAt: '2026-06-12',
    readingMinutes: 6,
    body: [
      '焦虑不是敌人。它是身体在对你说"请慢一点"。',
      '你不需要"战胜"它，你只需要让它流过。',
      '像观河流一样观你的焦虑——它会改变形状，但不会永远停留。',
    ],
  },
];

/* ============ 行者故事（小说章节） ============ */

export interface Chapter {
  slug: string;
  number: number;
  title: string;
  subtitle: string;
  publishedAt: string;
  readingMinutes: number;
  body: string[];
  /** 故事类型：serial=长篇连载 / short=短篇精选 */
  storyType: 'serial' | 'short';
}

export const CHAPTERS: Chapter[] = [
  {
    slug: 'ch1-the-call',
    number: 1,
    title: '第一卷 · 山门',
    subtitle: '一声钟响，他回头',
    publishedAt: '2026-03-01',
    readingMinutes: 14,
    storyType: 'serial',
    body: [
      '那年深秋，他 28 岁。',
      '从城里回来，山路转了 108 道弯，每一道弯都把他转得更轻一些。',
      '到山门的时候，已是黄昏。钟声响了三下，每一下都像敲在胸口。',
      '他回头——不是看身后的路，是看自己这一生。',
    ],
  },
  {
    slug: 'ch2-the-bell',
    number: 2,
    title: '第二卷 · 钟',
    subtitle: '师父说：你听见的是自己',
    publishedAt: '2026-03-20',
    readingMinutes: 12,
    storyType: 'serial',
    body: [
      '师父没教他什么。',
      '只是每天拂晓敲钟，黄昏敲钟。',
      '三个月后，他问："师父，我该怎么修行？"',
      '师父说："你听见的是自己。"',
    ],
  },
  {
    slug: 'ch3-the-shadow',
    number: 3,
    title: '第三卷 · 影',
    subtitle: '每一个影子都是自己的一部分',
    publishedAt: '2026-04-15',
    readingMinutes: 16,
    storyType: 'serial',
    body: [
      '他开始看见自己的影子。',
      '不是墙上的那种——是心里的那种。',
      '每一个不耐烦的念头，每一份说不出口的委屈，都是影子。',
      '师父说：不要赶走影子，陪着它走一段。',
      '走着走着，影子就变成了光。',
    ],
  },
  /* ============ 短篇精选 ============ */
  {
    slug: 'short-moon-tea',
    number: 0,
    title: '月下茶',
    subtitle: '一个人喝的茶，才喝得出味道',
    publishedAt: '2026-05-01',
    readingMinutes: 5,
    storyType: 'short',
    body: [
      '月光落在茶汤里，像一块旧银币。',
      '他端起杯子，没有喝，只是看着。',
      '师父曾说：茶有三次——第一次解渴，第二次品味，第三次忘我。',
      '他喝到第三口时，忘了自己在喝茶。',
      '只剩月光，只剩茶，只剩夜。',
    ],
  },
  {
    slug: 'short-empty-boat',
    number: 0,
    title: '空船',
    subtitle: '若无人舟，谁来渡河',
    publishedAt: '2026-05-20',
    readingMinutes: 4,
    storyType: 'short',
    body: [
      '河上有条船，没有船夫。',
      '他等了一个时辰，无人来渡。',
      '后来他想通了——自己上船，自己撑篙，自己靠岸。',
      '到了对岸回头看，船还在原地。',
      '原来渡他的，从来不是船。',
    ],
  },
  {
    slug: 'short-road-home',
    number: 0,
    title: '回家的路',
    subtitle: '最远的路，是回到心里',
    publishedAt: '2026-06-01',
    readingMinutes: 6,
    storyType: 'short',
    body: [
      '他在城里住了十年，以为家在远方。',
      '每年回去一次，母亲都老一点。',
      '后来母亲走了，他才发现——回家的路，不是通往某个地方。',
      '是通往某个再也见不到的人。',
      '他坐了很久。然后起身，把门关好。',
    ],
  },
];

/* ============ 灵性研学：随笔 / 打卡 ============ */

export interface JournalEntry {
  id: string;
  author: string;
  title: string;
  excerpt: string;
  type: '打卡' | '随笔' | '问答' | '分享';
  likes: number;
  comments: number;
  publishedAt: string;
}

export const JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'j-001',
    author: '清和',
    title: '今日静坐 30 分钟，呼吸回归',
    excerpt: '第一天打卡。心还是有些散，但比昨天安静了一点……',
    type: '打卡',
    likes: 24,
    comments: 3,
    publishedAt: '2026-06-28',
  },
  {
    id: 'j-002',
    author: '观自在',
    title: '《道德经》第 11 章：三十辐共一毂',
    excerpt: '"当其无，有车之用"——原来"无"才是真正的"有"。',
    type: '随笔',
    likes: 56,
    comments: 12,
    publishedAt: '2026-06-27',
  },
  {
    id: 'j-003',
    author: '无为',
    title: '请教阿阇梨：如何处理工作中的人际烦恼？',
    excerpt: '每天面对办公室的"小我"们，怎么保持自己不被打扰？',
    type: '问答',
    likes: 38,
    comments: 21,
    publishedAt: '2026-06-26',
  },
  {
    id: 'j-004',
    author: '月白',
    title: '推荐一个清晨的修行流',
    excerpt: '108 拜 + 经行 30 分钟 + 静坐 20 分钟。三个月了，分享给同修。',
    type: '分享',
    likes: 92,
    comments: 18,
    publishedAt: '2026-06-25',
  },
  {
    id: 'j-005',
    author: '寂行',
    title: '今日禅机：心若止水',
    excerpt: '止，不是停止；是让水保持它本来的清澈。',
    type: '打卡',
    likes: 17,
    comments: 2,
    publishedAt: '2026-06-24',
  },
  {
    id: 'j-006',
    author: '慧心',
    title: '《心经》第一句的三个版本',
    excerpt: '玄奘、鸠摩罗什、般若三藏的翻译，各有深意……',
    type: '随笔',
    likes: 71,
    comments: 9,
    publishedAt: '2026-06-23',
  },
];

/* ============ 创作者矩阵：阿阇梨资料 ============ */

export interface Creator {
  id: string;
  name: string;
  honor: string; // 称号
  lineage: string; // 法脉
  bio: string;
  specialties: string[];
  glyph: string;
}

export const CREATORS: Creator[] = [
  {
    id: 'jiguang',
    name: '寂光阿阇梨',
    honor: '根本上师',
    lineage: '唐密东密传承',
    bio: '出家三十余年，专注于禅修指导与生命解码。',
    specialties: ['禅修指导', '八字与生命代码', '临终关怀'],
    glyph: '☀',
  },
  {
    id: 'mingxin',
    name: '明心居士',
    honor: '研究员',
    lineage: '玄空飞星 · 藏医结合',
    bio: '建筑学背景，把现代居住科学与传统堪舆融合。',
    specialties: ['家居风水', '环境心理学', '户型诊断'],
    glyph: '☷',
  },
  {
    id: 'kongxing',
    name: '空行居士',
    honor: '研究员',
    lineage: '姓名学 · 音律学',
    bio: '语言学博士，研究汉字的形音义三十年。',
    specialties: ['姓名学', '汉字字源', '音律场'],
    glyph: '✎',
  },
  {
    id: 'ruyi',
    name: '如意阿阇梨',
    honor: '讲师',
    lineage: '净土 · 禅',
    bio: '曾为高校哲学讲师，擅长用日常语言讲深奥道理。',
    specialties: ['经文导读', '心灵成长', '亲子关系'],
    glyph: '☸',
  },
];

/* ============ 会员方案 ============ */

export interface MembershipPlan {
  id: 'free' | 'monthly' | 'yearly';
  name: string;
  price: number; // CNY
  period: string; // "月" / "年" / "永久"
  highlight: boolean;
  benefits: string[];
}

export const PLANS: MembershipPlan[] = [
  {
    id: 'free',
    name: '访客',
    price: 0,
    period: '永久',
    highlight: false,
    benefits: [
      '首页与公开文章可读',
      '每日 1 次智测体验',
      '社区只读不可发帖',
    ],
  },
  {
    id: 'monthly',
    name: '月度会员',
    price: 38,
    period: '月',
    highlight: false,
    benefits: [
      '全部密解专栏 + 故事',
      '无限次智测工具',
      '社区发帖 + 修行打卡',
      '每月 1 次阿阇梨在线答疑',
    ],
  },
  {
    id: 'yearly',
    name: '年度会员',
    price: 388,
    period: '年',
    highlight: true,
    benefits: [
      '月度会员全部权益',
      '每月 4 次阿阇梨在线答疑',
      '线下共修活动 8 折',
      '专属修行手册（电子）',
      '结业证书可申请',
    ],
  },
];

/* ============ 工具（Bazi）Mock 命例 ============ */

export interface BaziSample {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  element: string;
  summary: string;
  suggestion: string;
}

export const BAZI_SAMPLES: BaziSample[] = [
  {
    yearPillar: '丙午',
    monthPillar: '辛卯',
    dayPillar: '壬申',
    hourPillar: '癸丑',
    element: '水',
    summary: '壬水日元生于卯月，木旺泄秀。坐下午火七杀透干，志在四方。',
    suggestion: '近三年宜守不宜攻，从"金"的方向打开突破口——西、白色、决断。',
  },
  {
    yearPillar: '甲子',
    monthPillar: '丙寅',
    dayPillar: '戊辰',
    hourPillar: '壬戌',
    element: '土',
    summary: '戊土日元通根辰戌，库气厚重。丙火食神当头，才华外显。',
    suggestion: '土厚需要木疏，建议在日常中加入更多"生长型"活动：写作、远行、接触新人。',
  },
  {
    yearPillar: '己未',
    monthPillar: '癸酉',
    dayPillar: '乙卯',
    hourPillar: '丁丑',
    element: '木',
    summary: '乙木日元生于酉月，印绶当权。学习力强，但易被框架束缚。',
    suggestion: '下半年水木相生，是进修、认证、深造的良机，宜在秋分后做重要决定。',
  },
];

/* ============ 查找工具函数（被 generateStaticParams 与 page 使用） ============ */

export function findArticle(
  category: string,
  slug: string,
): Article | undefined {
  return ARTICLES.find((a) => a.category === category && a.slug === slug);
}

export function findChapter(slug: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.slug === slug);
}

export function findCategory(id: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
