// lunar-javascript 没有官方 .d.ts，手动声明
// 完整 API 参考：https://6tail.cn/calendar/api.html
declare module 'lunar-javascript' {
  export class Solar {
    static fromDate(d: Date): Solar;
    static fromYmd(y: number, m: number, d: number): Solar;
    static fromJulianDay(jd: number): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getLunar(): Lunar;
    /** 获取节气（"立春"、"惊蛰"…），无节气返回空字符串 */
    getJieQi(): string;
    /** 获取下一节气 */
    getNextJieQi(): JieQi;
    /** 获取上一节气 */
    getPrevJieQi(): JieQi;
    toString(): string;
  }

  export class Lunar {
    static fromYmd(y: number, m: number, d: number): Lunar;
    static fromDate(d: Date): Lunar;
    getSolar(): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getYearInChinese(): string;       // 二〇二四
    getMonthInChinese(): string;      // 正
    getDayInChinese(): string;        // 初一
    getYearShengXiao(): string;       // 龙
    getYearInGanZhi(): string;        // 辰
    getMonthInGanZhi(): string;       // 壬辰
    getDayInGanZhi(): string;         // 丙午
    /** 时辰（0-23）→ 时柱干支 */
    getTimeInGanZhi(hour: number): string;
    getDayNaYin(): string;            // 日柱纳音
    getYearNaYin(): string;
    getMonthNaYin(): string;
    getTimeNaYin(): string;
    getEightChar(): EightChar;
    getJieQiTable(): Record<string, Solar>;
  }

  export class EightChar {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getHour(): string;
  }

  export interface JieQi {
    getName(): string;
    getSolar(): Solar;
  }
}
