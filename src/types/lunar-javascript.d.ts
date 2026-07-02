// lunar-javascript 没有官方 .d.ts，手动声明
declare module 'lunar-javascript' {
  export class Solar {
    static fromDate(d: Date): Solar;
    static fromYmd(y: number, m: number, d: number): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getLunar(): Lunar;
  }
  export class Lunar {
    static fromYmd(y: number, m: number, d: number): Lunar;
    getSolar(): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getYearInChinese(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getYearShengXiao(): string;
    getEightChar(): EightChar;
  }
  export class EightChar {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getHour(): string;
  }
}
