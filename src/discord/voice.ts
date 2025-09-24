import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, NoSubscriberBehavior, StreamType, VoiceConnection } from '@discordjs/voice';
import { logger } from '../utils/logger';
import { VoicePipeline } from '../voice/pipeline';
import { Readable } from 'stream';
import prism from 'prism-media';

export class VoiceHandler {
  private player: AudioPlayer;
  private pipeline: VoicePipeline;

  constructor(pipeline?: VoicePipeline) {
    this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    this.pipeline = pipeline ?? new VoicePipeline();
    this.player.on(AudioPlayerStatus.Idle, () => {
      // idle
    });
    this.player.on('error', (err) => {
      logger.error(`Audio player error: ${err}`);
    });
  }

  attach(connection: VoiceConnection) {
    connection.subscribe(this.player);
  }

  async startListening(): Promise<void> {
    // TODO: Wire Discord voice receiver to pipeline.processAudio (Deepgram live)
    logger.info('startListening() invoked - streaming capture not yet implemented');
  }

  async stopListening(): Promise<void> {
    // TODO: Stop receiving stream
    logger.info('stopListening() invoked');
  }

  async speak(text: string): Promise<void> {
    // Get linear16 PCM at 16kHz mono and encode to Opus for Discord playback
    const pcm = await this.pipeline.synthesizeSpeech(text); // linear16, 16k, mono
    const pcmStream = Readable.from(pcm);

    // Encode PCM -> Opus (Discord expects Opus @ 48k usually; upsample to 48k)
    const encoder = new prism.opus.Encoder({
      rate: 48000,
      channels: 1,
      frameSize: 960,
    });

    // Resample 16k -> 48k mono using prism FFmpeg if available; fallback: try direct
    const resampler = new prism.FFmpeg({
      args: [
        '-f', 's16le',
        '-ar', '16000',
        '-ac', '1',
        '-i', 'pipe:0',
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '1',
        'pipe:1',
      ],
    });

    const opusStream = pcmStream.pipe(resampler).pipe(encoder);

    const resource = createAudioResource(opusStream, { inputType: StreamType.Opus });
    this.player.play(resource);
  }

  onAudioReceived(callback: (audio: Buffer) => void): void {
    // TODO: emit audio chunks as they arrive from receiver
    logger.info('Registered onAudioReceived callback (not yet wired)');
  }
}