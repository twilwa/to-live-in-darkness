import './config/env';
import { DiscordClient } from './discord/client';
import { VoiceHandler } from './discord/voice';
import { logger } from './utils/logger';

async function main() {
  const dc = new DiscordClient();
  await dc.connect();

  let voice: VoiceHandler | null = null;

  dc.onTextMessage(async (msg) => {
    if (!msg.content || msg.author.bot) return;

    if (msg.content.startsWith('!join')) {
      const parts = msg.content.split(/\s+/);
      const channelId = parts[1];
      if (!channelId) {
        await msg.reply('Usage: !join <voice_or_stage_channel_id>');
        return;
      }
      const conn = await dc.joinVoiceChannel(channelId);
      voice = new VoiceHandler();
      voice.attach(conn);
      await msg.reply('Joined. Continuous listening enabled (TTS available).');
      await voice.startListening();
      return;
    }

    if (msg.content.startsWith('!leave')) {
      await dc.leaveVoiceChannel();
      voice = null;
      await msg.reply('Left voice channel.');
      return;
    }

    if (msg.content.startsWith('!say ')) {
      const text = msg.content.slice('!say '.length).trim();
      if (!voice) {
        await msg.reply('Not in a voice channel. Use !join <channel_id> first.');
        return;
      }
      try {
        await msg.reply(`Saying: "${text}"`);
        await voice.speak(text);
      } catch (e: any) {
        logger.error(`!say error: ${e?.message || e}`);
        await msg.reply('Failed to speak via TTS. Check logs.');
      }
      return;
    }
  });

  process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    await dc.disconnect();
    process.exit(0);
  });
}

main().catch((e) => {
  logger.error(`Fatal error: ${e?.stack || e}`);
  process.exit(1);
});