/**
 * 牧心堂 · 通用工具函数
 * - cn: clsx + tailwind-merge 合并 className
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
