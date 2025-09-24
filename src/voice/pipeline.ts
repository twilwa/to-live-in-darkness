import { logger } from '../utils/logger';
import fetch from 'cross-fetch';

const DEFAULT_TTS_MODEL = process.env.DG_TTS_MODEL || 'aura-asteria-en';
const DEFAULT_SAMPLE_RATE = 16000; // linear16 mono

export class VoicePipeline {
  constructor() {}

  async processAudio(audioBuffer: Buffer): Promise<string> {
    // TODO: Send PCM frames to Deepgram Live transcription over WebSocket and return transcript text.
    logger.info(`processAudio() received ${audioBuffer.length} bytes`);
    return '';
  }

  async generateResponse(text: string): Promise<string> {
    // TODO: call LLM (OpenAI/Anthropic) for response
    logger.info(`generateResponse() input: ${text}`);
    return 'Acknowledged.';
  }

  async synthesizeSpeech(text: string): Promise<Buffer> {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) throw new Error('DEEPGRAM_API_KEY not set');

    // Use Deepgram Speak REST API to get linear16 PCM @ 16kHz mono
    // Docs: POST https://api.deepgram.com/v1/speak?model=aura-...&format=linear16&sample_rate=16000
    const url = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(
      DEFAULT_TTS_MODEL
    )}&format=linear16&sample_rate=${DEFAULT_SAMPLE_RATE}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      logger.error(`Deepgram Speak error: ${resp.status} ${resp.statusText} - ${errText}`);
      throw new Error(`Deepgram Speak failed: ${resp.status}`);
    }

    const arrayBuf = await resp.arrayBuffer();
    const pcm = Buffer.from(new Uint8Array(arrayBuf));
    logger.info(`synthesizeSpeech() received ${pcm.length} bytes PCM from Deepgram`);
    return pcm;
  }
}