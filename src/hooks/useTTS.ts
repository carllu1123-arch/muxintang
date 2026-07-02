'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useTTS
 *  - speak(text)：调 POST /api/tts 拿 MP3 Blob，存 localStorage 后用 <audio> 播放
 *  - 自动取消之前的播放，避免并发（同一个页面所有 useTTS() 共享一个 audio 元素）
 *  - MD5(text) 作为缓存 key
 *  - 可选 speechSynthesis.cancel() 兜底（关闭浏览器内置 TTS，避免与音频同时发声）
 *
 * 用法：
 *   const { speak, isSpeaking, isLoading } = useTTS()
 *   <button onClick={() => speak(message.content)}>🔊</button>
 */

// 模块级 audio：所有 hook 实例共享，保证 speak() 一定打断之前的播放
let _sharedAudio: HTMLAudioElement | null = null;
function getAudio(): HTMLAudioElement {
  if (typeof window === 'undefined') {
    // SSR 不会执行 speak()，仅占位
    return { pause() {}, play() {}, src: '' } as any;
  }
  if (!_sharedAudio) {
    _sharedAudio = new Audio();
    _sharedAudio.preload = 'auto';
  }
  return _sharedAudio;
}

/** localStorage 缓存 key */
const CACHE_PREFIX = 'tts:v1:';
const CACHE_MAX = 30; // 最多缓存条数（防爆）

/** Web Crypto MD5 不可用 → SHA-256 代替（仅做缓存 key，不需要密码学强度） */
async function hashKey(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

/** blob → dataURL（存 localStorage 用） */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

/** dataURL → blob */
function dataURLToBlob(dataURL: string): Blob {
  const [head, b64] = dataURL.split(',');
  const mime = /data:(.*?);/.exec(head)?.[1] || 'audio/mpeg';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function readCache(key: string): string | null {
  try {
    return localStorage.getItem(CACHE_PREFIX + key);
  } catch {
    return null;
  }
}

function writeCache(key: string, dataURL: string) {
  try {
    // 限制条数：FIFO 删除最早的
    const all: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) all.push(k);
    }
    if (all.length >= CACHE_MAX) {
      all
        .sort()
        .slice(0, all.length - CACHE_MAX + 1)
        .forEach((k) => localStorage.removeItem(k));
    }
    localStorage.setItem(CACHE_PREFIX + key, dataURL);
  } catch (e) {
    // localStorage 满 / 隐私模式 → 静默失败（仅本次播放）
    console.warn('[useTTS] localStorage 写入失败', e);
  }
}

/** 关闭浏览器内置 TTS（防止与硅基流动音频同时发声） */
function cancelBrowserTTS() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

export interface UseTTSReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 防止上一个 speak() 还没拿到 blob 时又来新 speak() 抢走
  const seqRef = useRef(0);
  // 当前正在播的 hash key
  const playingKeyRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    seqRef.current++; // 让在飞的 fetch 失效
    const a = getAudio();
    try {
      a.pause();
      a.currentTime = 0;
    } catch {
      /* ignore */
    }
    cancelBrowserTTS();
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    const clean = (text || '').trim();
    if (!clean) return;

    // 1. 中断之前的播放（HTMLAudio + speechSynthesis 双保险）
    stop();
    cancelBrowserTTS();

    const mySeq = ++seqRef.current;
    setError(null);
    setIsLoading(true);

    try {
      const key = await hashKey(clean);

      // 2. 命中缓存 → 直接放 dataURL
      const cached = readCache(key);
      if (cached) {
        await playFromDataURL(cached, mySeq, key);
        return;
      }

      // 3. 调 /api/tts
      setIsLoading(true);
      const r = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean }),
      });
      if (mySeq !== seqRef.current) return; // 已被新的 speak() 抢走

      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${r.status}`);
      }

      const blob = await r.blob();
      if (mySeq !== seqRef.current) return;

      // 4. 写缓存 + 播放
      const dataURL = await blobToDataURL(blob);
      writeCache(key, dataURL);

      await playFromDataURL(dataURL, mySeq, key);
    } catch (e: any) {
      if (mySeq !== seqRef.current) return;
      setError(e?.message || 'TTS 播放失败');
      setIsLoading(false);
      setIsSpeaking(false);
    }
  }, [stop]);

  useEffect(() => {
    // 卸载时停掉
    return () => {
      const a = _sharedAudio;
      if (a) {
        try {
          a.pause();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  async function playFromDataURL(
    dataURL: string,
    mySeq: number,
    key: string,
  ) {
    const a = getAudio();
    if (mySeq !== seqRef.current) return;

    playingKeyRef.current = key;
    a.src = dataURL;
    a.currentTime = 0;

    a.onended = () => {
      if (mySeq !== seqRef.current) return;
      setIsSpeaking(false);
      setIsLoading(false);
    };
    a.onerror = () => {
      if (mySeq !== seqRef.current) return;
      setIsSpeaking(false);
      setIsLoading(false);
      setError('音频播放失败');
    };

    try {
      await a.play();
      if (mySeq !== seqRef.current) {
        a.pause();
        return;
      }
      setIsSpeaking(true);
      setIsLoading(false);
    } catch (e: any) {
      if (mySeq !== seqRef.current) return;
      // Autoplay policy 阻止 / 资源错误
      setIsSpeaking(false);
      setIsLoading(false);
      setError(e?.message || '播放失败');
    }
  }

  return { speak, stop, isSpeaking, isLoading, error };
}

export default useTTS;
