-- =====================================================
-- 牧心堂 · 开发种子数据
-- 用法：在执行 0001_init.sql 后，本文件单独执行
-- 生产环境不要执行
-- =====================================================

-- 创作者
insert into public.creators (slug, name, honor, lineage, bio, avatar_glyph, specialties) values
  ('jiguang', '寂光阿阇梨', '根本上师', '唐密东密传承',
   '出家三十余年，专注于禅修指导与生命解码。', '☀',
   array['禅修指导', '八字与生命代码', '临终关怀']),
  ('mingxin', '明心居士', '研究员', '玄空飞星 · 藏医结合',
   '建筑学背景，把现代居住科学与传统堪舆融合。', '☷',
   array['家居风水', '环境心理学', '户型诊断']),
  ('kongxing', '空行居士', '研究员', '姓名学 · 音律学',
   '语言学博士，研究汉字的形音义三十年。', '✎',
   array['姓名学', '汉字字源', '音律场']),
  ('ruyi', '如意阿阇梨', '讲师', '净土 · 禅',
   '曾为高校哲学讲师，擅长用日常语言讲深奥道理。', '☸',
   array['经文导读', '心灵成长', '亲子关系'])
on conflict (slug) do nothing;

-- 四学文章（每个专栏 2 篇，与 mock-data 对齐）
insert into public.articles (category, slug, title, subtitle, body, is_free, tier_required, author_id, reading_minutes, published_at) values
  ('lifecode', 'intro', '生命代码：识自己的第一步', '从一串数字开始，看见本然频率',
   E'生辰如一串代码，写在你未出生之前。它不是宿命，而是注脚——\n\n我们用这套代码做什么？不是为了对号入座，而是为了在喧闹中找到一个轴心。\n\n当你静下来，呼吸回到丹田，代码就显影了。它不是写给你"信"的，是写给你"听"的。\n\n先放下评判，让这串数字变成一条河流，流过你的身体、心意、觉性。\n\n然后你就会明白：所谓命运，不是被困住，而是被看见。',
   true, 'free',
   (select id from public.creators where slug = 'jiguang'), 8, '2026-05-12'),
  ('lifecode', 'five-elements', '五行不缺，只是被遮蔽', '调候的智慧：从缺到通的修行',
   E'常有同修问："我命中缺金，该怎么补？"\n\n其实不是缺，是被遮蔽。打个比方——水不流动就成了死水，但水还是水。\n\n调候不是补救，是疏通。找到你生命中不流动的那一行，让它流起来。\n\n金主决断，水主智慧，木主生长，火主文明，土主承载。\n\n你以为你缺，其实是你忘了怎么用。',
   true, 'monthly',
   (select id from public.creators where slug = 'jiguang'), 12, '2026-05-20'),
  ('habitat', 'orientation', '方位：家的呼吸', '从玄空飞星到当下生活的智慧',
   E'房子不是钢筋水泥的容器，而是有呼吸的生命。\n\n进门先看气——是温润还是急躁？明堂是否开阔？\n\n不必拘泥于"东南摆什么、西北摆什么"的死法。\n\n让阳光、空气、动线服务于你和家人的状态，这就是最朴素的风水。',
   true, 'free',
   (select id from public.creators where slug = 'mingxin'), 10, '2026-04-30'),
  ('habitat', 'zodiac', '生肖与户型：不必迷信的对应', '一个现代人的家居笔记',
   E'网上常说"属虎不能住西边"——这其实把一门古老的学问简化成了标签。\n\n真正重要的是：你的生活节奏、家人关系、职业状态。\n\n户型服务于人，而非反过来。',
   false, 'yearly',
   (select id from public.creators where slug = 'mingxin'), 6, '2026-05-08'),
  ('name', 'strokes', '姓名与笔画：被滥用的"五格剖象"', '谈姓名学常见误区',
   E'姓名学最容易被工具化——输入两个字，跳出一个"分数"。\n\n但名字不是一个分数。它是你被叫出、写出、想起时的全部回声。\n\n笔画只是入口，音律、字形、五行、字义四者合参，方见真章。',
   true, 'free',
   (select id from public.creators where slug = 'kongxing'), 7, '2026-04-22'),
  ('name', 'phonetics', '音律场：名字如何"响"在世上', '从声调到共鸣',
   E'读一下自己的名字。读三遍。\n\n你听到了什么？是"硬"还是"软"？是"快"还是"慢"？\n\n音律场不是玄学，是语言学 + 心理学的结合。\n\n让名字的发声与你的内在状态对齐，本身就是一种修行。',
   true, 'monthly',
   (select id from public.creators where slug = 'kongxing'), 9, '2026-05-15'),
  ('teacher', 'dharma-1', '静坐之前，先问自己一个问题', '根本上师的开示（一）',
   E'"我真的在过想要的生活吗？"\n\n不要急着用大脑回答。让这个问题沉下去，沉到胸口，沉到丹田。\n\n如果你的答案是"是"——继续。\n\n如果你的答案是"不是"——也继续。\n\n因为这个问题本身，就是修行的开始。',
   true, 'free',
   (select id from public.creators where slug = 'jiguang'), 4, '2026-06-01'),
  ('teacher', 'dharma-2', '关于焦虑：让它流过', '根本上师的开示（二）',
   E'焦虑不是敌人。它是身体在对你说"请慢一点"。\n\n你不需要"战胜"它，你只需要让它流过。\n\n像观河流一样观你的焦虑——它会改变形状，但不会永远停留。',
   false, 'monthly',
   (select id from public.creators where slug = 'jiguang'), 6, '2026-06-12')
on conflict (category, slug) do nothing;

-- 小说章节
insert into public.novels (slug, chapter_index, title, subtitle, body, is_free, tier_required, author_id, reading_minutes, published_at) values
  ('ch1-the-call', 1, '第一卷 · 山门', '一声钟响，他回头',
   E'那年深秋，他 28 岁。\n\n从城里回来，山路转了 108 道弯，每一道弯都把他转得更轻一些。\n\n到山门的时候，已是黄昏。钟声响了三下，每一下都像敲在胸口。\n\n他回头——不是看身后的路，是看自己这一生。',
   true, 'free',
   (select id from public.creators where slug = 'jiguang'), 14, '2026-03-01'),
  ('ch2-the-bell', 2, '第二卷 · 钟', '师父说：你听见的是自己',
   E'师父没教他什么。\n\n只是每天拂晓敲钟，黄昏敲钟。\n\n三个月后，他问："师父，我该怎么修行？"\n\n师父说："你听见的是自己。"',
   true, 'monthly',
   (select id from public.creators where slug = 'jiguang'), 12, '2026-03-20'),
  ('ch3-the-shadow', 3, '第三卷 · 影', '每一个影子都是自己的一部分',
   E'他开始看见自己的影子。\n\n不是墙上的那种——是心里的那种。\n\n每一个不耐烦的念头，每一份说不出口的委屈，都是影子。\n\n师父说：不要赶走影子，陪着它走一段。\n\n走着走着，影子就变成了光。',
   false, 'yearly',
   (select id from public.creators where slug = 'jiguang'), 16, '2026-04-15')
on conflict (chapter_index) do nothing;

-- 研学随笔（模拟一些公开条目，user_id 留空表示管理员发布）
insert into public.journal_entries (author_name, type, title, excerpt, like_count, comment_count, published_at) values
  ('清和', '打卡', '今日静坐 30 分钟，呼吸回归', '第一天打卡。心还是有些散，但比昨天安静了一点……', 24, 3, '2026-06-28'),
  ('观自在', '随笔', '《道德经》第 11 章：三十辐共一毂', '"当其无，有车之用"——原来"无"才是真正的"有"。', 56, 12, '2026-06-27'),
  ('无为', '问答', '请教阿阇梨：如何处理工作中的人际烦恼？', '每天面对办公室的"小我"们，怎么保持自己不被打扰？', 38, 21, '2026-06-26'),
  ('月白', '分享', '推荐一个清晨的修行流', '108 拜 + 经行 30 分钟 + 静坐 20 分钟。三个月了，分享给同修。', 92, 18, '2026-06-25'),
  ('寂行', '打卡', '今日禅机：心若止水', '止，不是停止；是让水保持它本来的清澈。', 17, 2, '2026-06-24'),
  ('慧心', '随笔', '《心经》第一句的三个版本', '玄奘、鸠摩罗什、般若三藏的翻译，各有深意……', 71, 9, '2026-06-23');

-- 完成
select 'creators:' as table, count(*) from public.creators
union all select 'articles:', count(*) from public.articles
union all select 'novels:', count(*) from public.novels
union all select 'journal_entries:', count(*) from public.journal_entries;
