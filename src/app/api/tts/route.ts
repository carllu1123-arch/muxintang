/**
 * 牧心堂 · 语音合成 API
 *
 * GET /api/tts
 *   - 每日晨音：生成一段 30 秒的 136.1Hz om 音调 + 淡白噪
 *
 * POST /api/tts
 *   - 文本转语音：接收 { text: string }，生成对应语音（占位版本）
 *   - 当前版本：用 8-bit WAV 模拟人声朗读节奏（低通滤波 + 节奏控制）
 *   - 响应头：Content-Type: audio/wav
 *
 * 真实产品可替换为：
 *   - ElevenLabs / Azure Speech / 火山引擎 TTS
 *   - 预录制的阿阇梨真人语音
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ============ WAV 生成参数 ============ */
const SAMPLE_RATE = 8_000;        // 8 kHz 足够承载 136 Hz 基频
const BITS_PER_SAMPLE = 8;        // 8-bit unsigned PCM
const NUM_CHANNELS = 1;           // mono
const DURATION_SECONDS = 30;      // 占位 30 秒
const NUM_SAMPLES = SAMPLE_RATE * DURATION_SECONDS;

/** om 音基础频率（Hz）—— 接近大钟低频 */
const OM_FREQ = 136.1;
/** 第二次谐波（让声音不那么"平"） */
const HARMONIC_FREQ = 272.2;
/** 振幅：8-bit unsigned 中点是 128，最大 ±100 留出余量 */
const BASE_AMP = 60;              // 基频
const HARMONIC_AMP = 22;          // 谐波
const NOISE_AMP = 5;              // 极淡白噪

/** 简单的线性同余 PRNG（避免引入 noise 包） */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/**
 * 生成 30 秒的 8-bit mono PCM
 *  - 起始 1.5s 淡入
 *  - 中段稳态
 *  - 末尾 1.5s 淡出
 */
function generatePcmBytes(seed: number): Buffer {
  const rand = lcg(seed);
  const bytes = Buffer.alloc(NUM_SAMPLES);
  const fadeInEnd = SAMPLE_RATE * 1.5;       // 1.5s 淡入
  const fadeOutStart = SAMPLE_RATE * 28.5;   // 28.5s 起淡出

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    // 包络
    let env = 1;
    if (i < fadeInEnd) {
      env = i / fadeInEnd;
    } else if (i > fadeOutStart) {
      env = Math.max(0, 1 - (i - fadeOutStart) / (SAMPLE_RATE * 1.5));
    }
    // 合成：基频 + 谐波 + 极淡白噪
    const base = Math.sin(2 * Math.PI * OM_FREQ * t) * BASE_AMP;
    const harm = Math.sin(2 * Math.PI * HARMONIC_FREQ * t) * HARMONIC_AMP;
    const noise = (rand() * 2 - 1) * NOISE_AMP;
    const sample = (base + harm + noise) * env;
    // 8-bit unsigned：限制到 0..255
    const u8 = Math.max(0, Math.min(255, Math.round(128 + sample)));
    bytes[i] = u8;
  }
  return bytes;
}

/**
 * 把 PCM 字节 + 元数据打包成完整 WAV 文件
 */
function buildWav(pcm: Buffer): Buffer {
  const dataSize = pcm.length;
  const fileSize = 36 + dataSize; // 36 = header(12) + fmt(24)
  const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);

  const header = Buffer.alloc(44);
  // RIFF 头
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8, 'ascii');
  // fmt 子块
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);              // fmt chunk size
  header.writeUInt16LE(1, 20);               // PCM
  header.writeUInt16LE(NUM_CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  // data 子块
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

/** 用日期做种子，让同一天"晨音"一致（如果以后做内容变化也方便） */
function dateSeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export async function GET() {
  const pcm = generatePcmBytes(dateSeed());
  const wav = buildWav(pcm);

  // 复制到新的 Uint8Array<ArrayBuffer>，避开 Node Buffer 的 ArrayBufferLike 类型
  const out = new Uint8Array(wav.byteLength);
  out.set(wav);
  const body = new Blob([out.buffer], { type: 'audio/wav' });

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Length': String(wav.length),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store, max-age=0',
      'X-Audio-Duration': `${DURATION_SECONDS}s`,
      'X-Audio-Placeholder': 'om-drone-136hz',
    },
  });
}

/* ============ POST /api/tts — 文本转语音 ============ */

/**
 * 根据文本生成模拟语音波形
 * - 每个汉字约 0.35 秒朗读时间
 * - 用基频 + 调制模拟人声
 * - 标点停顿：。！？约 0.6s，，约 0.2s
 */
function generateSpeechPcm(text: string): Buffer {
  const charDuration = SAMPLE_RATE * 0.35;
  const longPause = SAMPLE_RATE * 0.6;
  const shortPause = SAMPLE_RATE * 0.2;

  const chars = text.split('');
  let totalSamples = 0;
  for (const c of chars) {
    if (/[。！？]/.test(c)) {
      totalSamples += longPause;
    } else if (/[，,、]/.test(c)) {
      totalSamples += shortPause;
    } else {
      totalSamples += charDuration;
    }
  }
  // 淡入淡出各 0.3s
  totalSamples += SAMPLE_RATE * 0.6;

  const bytes = Buffer.alloc(totalSamples);
  const fadeLen = SAMPLE_RATE * 0.3;
  let pos = 0;

  for (const c of chars) {
    const isLongPause = /[。！？]/.test(c);
    const isShortPause = /[，,、]/.test(c);
    const duration = isLongPause ? longPause : isShortPause ? shortPause : charDuration;

    for (let i = 0; i < duration; i++) {
      const t = (pos + i) / SAMPLE_RATE;
      // 包络
      let env = 1;
      if (pos + i < fadeLen) {
        env = (pos + i) / fadeLen;
      } else if (pos + i > totalSamples - fadeLen) {
        env = Math.max(0, 1 - (pos + i - (totalSamples - fadeLen)) / fadeLen);
      }

      let sample = 0;
      if (!isLongPause && !isShortPause) {
        // 模拟人声：基频 + 多个谐波 + 振幅调制
        const baseFreq = 180 + Math.sin(t * 2) * 20;
        const harm1 = Math.sin(2 * Math.PI * baseFreq * t) * 45;
        const harm2 = Math.sin(2 * Math.PI * baseFreq * 2.5 * t) * 18;
        const harm3 = Math.sin(2 * Math.PI * baseFreq * 4.2 * t) * 8;
        // 振幅调制模拟语调变化
        const am = 0.6 + Math.sin(t * 8) * 0.3 + Math.sin(t * 2.5) * 0.1;
        sample = (harm1 + harm2 + harm3) * am * env;
      } else {
        // 停顿：极淡的环境音
        sample = Math.sin(2 * Math.PI * 136.1 * t) * 8 * env;
      }

      const u8 = Math.max(0, Math.min(255, Math.round(128 + sample)));
      bytes[pos + i] = u8;
    }
    pos += duration;
  }

  return bytes;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = String(body.text || '');
    if (!text.trim()) {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 自动追加落款签名
    const fullText = `${text}——牧心堂阿阇梨`;

    const pcm = generateSpeechPcm(fullText);
    const wav = buildWav(pcm);

    const out = new Uint8Array(wav.byteLength);
    out.set(wav);
    const blob = new Blob([out.buffer], { type: 'audio/wav' });

    const duration = Math.round(pcm.length / SAMPLE_RATE);

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(wav.length),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store, max-age=0',
        'X-Audio-Duration': `${duration}s`,
        'X-Audio-Placeholder': 'text-to-speech',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
