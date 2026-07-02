/**
 * 牧心堂 · 本地排盘解读模板
 *
 * 用途：
 *   当 Dify 未配置 / 调用失败时，用这套本地模板生成 AI 解读。
 *   保证即开即用，永不返回 "解读服务不可用" 这种空话。
 *
 * 设计：
 *   - 不用 LLM，纯字符串模板
 *   - 覆盖：格局总论、五行喜忌、唐密本尊、修行建议
 *   - 保持玄学语境 + 实用性
 */

import type { BaziOutput } from './bazi-engine';

const ELEMENT_ADVICE: Record<string, { color: string; direction: string; season: string; practice: string }> = {
  金: { color: '白 / 银 / 乳白', direction: '西方', season: '秋', practice: '念诵阿弥陀佛、持诵金刚萨埵心咒' },
  木: { color: '青 / 翠 / 墨绿', direction: '东方', season: '春', practice: '持诵虚空藏菩萨心咒、习书法冥想' },
  水: { color: '黑 / 深蓝 / 玄', direction: '北方', season: '冬', practice: '持诵观音菩萨圣号、习静水观' },
  火: { color: '红 / 紫 / 赭', direction: '南方', season: '夏', practice: '持诵大日如来真言、习光明观' },
  土: { color: '黄 / 咖 / 驼', direction: '中央', season: '长夏与四季末', practice: '持诵地藏菩萨圣号、习安那般那' },
};

const DEITY_DESCRIPTION: Record<string, string> = {
  虚空藏菩萨: '虚空藏菩萨主福德、智慧与宝藏，能满足众生善愿、赐予辩才与记忆力。',
  文殊菩萨: '文殊菩萨主般若智慧，左手持青莲表清净无染，右手持剑断一切众生烦恼。',
  大日如来: '大日如来为密教本尊，五方佛之中央，表法界体性、自性清净。',
  宝生佛: '宝生佛为五方佛之南方，表福德聚足、修行菩提之胜妙宝。',
  阿弥陀佛: '阿弥陀佛为西方极乐世界之教主，以四十八愿接引众生往生净土。',
  观自在菩萨: '观自在菩萨（观音）以慈悲方便救苦救难，闻声救度。',
  不动明王: '不动明王为五大明王之首，以大慈悲现愤怒相，降伏一切魔障。',
  普贤菩萨: '普贤菩萨主实践与行愿，以十大愿王导归净土。',
  地藏菩萨: '地藏菩萨"地狱不空誓不成佛"，主救度地狱众生与幽冥超拔。',
};

const GOD_SUGGESTION: Record<string, string> = {
  比肩: '独立、刚毅。需学会合作、避免固执。',
  劫财: '慷慨、好胜。注意财务与人际的平衡。',
  食神: '温和、福禄。宜发展个人兴趣与艺术。',
  伤官: '聪明、叛逆。需以正见引导才情。',
  偏财: '灵活、善缘。宜拓展人脉、把握机会。',
  正财: '稳健、务实。宜守成、量入为出。',
  七杀: '果决、有魄力。需以仁慈化解刚烈。',
  正官: '正直、有名。宜循规蹈矩、修齐治平。',
  偏印: '内省、孤高。需打开心扉、亲近善友。',
  正印: '仁慈、博学。宜亲近明师、深入经典。',
};

export function buildLocalInterpretation(bazi: BaziOutput): string {
  const dm = bazi.dayMasterElement;
  const advice = ELEMENT_ADVICE[dm] ?? ELEMENT_ADVICE['土'];
  const deityDesc = DEITY_DESCRIPTION[bazi.deity] ?? '';
  const godList = bazi.tenGods.map((t) => t.god).filter((g) => g && g !== '—');

  // 找最强 / 最弱五行
  const sorted = Object.entries(bazi.fiveElements).sort((a, b) => b[1] - a[1]);
  const strongest = sorted[0]?.[0] ?? '—';
  const weakest = sorted[sorted.length - 1]?.[0] ?? '—';

  const lines: string[] = [];

  lines.push(`## 命盘概览`);
  lines.push(
    `您生于 ${bazi.lunarDate}（${bazi.zodiac}年），日主为 **${bazi.dayMaster}（${dm}）**。`,
  );
  lines.push(``);
  lines.push(`四柱：年柱 ${bazi.yearPillar} · 月柱 ${bazi.monthPillar} · 日柱 ${bazi.dayPillar} · 时柱 ${bazi.hourPillar}。`);
  if (bazi.nayin) lines.push(`日柱纳音：${bazi.nayin}。`);
  if (bazi.solarTerm && bazi.solarTerm !== '无节气') lines.push(`所处节气：${bazi.solarTerm}。`);
  lines.push(``);

  lines.push(`## 唐密本尊 · 您的根本守护`);
  lines.push(`**${bazi.deity}** 慈悲护念，与您此生命格相应。`);
  if (deityDesc) lines.push(deityDesc);
  lines.push(``);
  lines.push(`> 建议每日定时持诵本尊圣号或真言，以祈身心安定。`);
  lines.push(``);

  lines.push(`## 五行能量分布`);
  const bar = (el: string) => {
    const v = bazi.fiveElements[el as keyof typeof bazi.fiveElements] ?? 0;
    const len = Math.round(v * 20);
    return `${el} ${'█'.repeat(len)}${'░'.repeat(20 - len)} ${(v * 100).toFixed(0)}%`;
  };
  lines.push('```');
  lines.push(bar('金'));
  lines.push(bar('木'));
  lines.push(bar('水'));
  lines.push(bar('火'));
  lines.push(bar('土'));
  lines.push('```');
  lines.push(``);
  lines.push(`**最旺**：${strongest}；**最弱**：${weakest}。喜用神宜取与最弱元素相生之五行。`);
  lines.push(``);

  lines.push(`## 修行建议`);
  lines.push(`- **方位**：久居宜向${advice.direction}；`);
  lines.push(`- **色彩**：日常服饰与居所可多用${advice.color}；`);
  lines.push(`- **季节**：${advice.season}为最相应之季；`);
  lines.push(`- **功课**：${advice.practice}。`);
  lines.push(``);

  if (godList.length > 0) {
    lines.push(`## 十神要点`);
    const seen = new Set<string>();
    for (const g of godList) {
      if (seen.has(g)) continue;
      seen.add(g);
      const tip = GOD_SUGGESTION[g];
      if (tip) lines.push(`- **${g}**：${tip}`);
    }
    lines.push(``);
  }

  lines.push(`## 结语`);
  lines.push(`命理不是宿命，是地图。本尊与修行即是我们手中调频的钥匙。`);
  lines.push(`愿您在牧心堂，得一灯可传。`);

  return lines.join('\n');
}
