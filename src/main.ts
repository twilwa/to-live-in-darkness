import './config/env';
import { DiscordClient } from './discord/client';
import { VoiceHandler } from './discord/voice';
import { logger } from './utils/logger';
import { ChannelType } from 'discord.js';

async function main() {
  const dc = new DiscordClient();
  await dc.connect();

  let voice: VoiceHandler | null = null;

  dc.onTextMessage(async (msg) => {
    if (!msg.content || msg.author.bot) return;

    if (msg.content.startsWith('!join')) {
      const parts = msg.content.split(/\s+/);
      const channelId = parts[1];
      
      try {
        let targetChannelId = channelId;
        
        // If no channel ID provided, find the user's current voice channel
        if (!targetChannelId) {
          const member = msg.guild?.members.cache.get(msg.author.id);
          const userChannel = member?.voice?.channel;
          
          if (!userChannel) {
            await msg.reply('You are not in a voice channel. Please join one first or specify a channel ID.');
            return;
          }
          
          targetChannelId = userChannel.id;
          logger.info(`Smart join: Found user ${msg.author.username} in channel ${userChannel.name}`);
        }
        
        // Check if it's a stage channel
        const channel = await dc.getClient().channels.fetch(targetChannelId);
        const isStage = channel?.type === ChannelType.GuildStageVoice;
        const channelName = (channel as any)?.name || targetChannelId;
        
        const conn = isStage 
          ? await dc.joinStageChannel(targetChannelId)
          : await dc.joinVoiceChannel(targetChannelId);
          
        voice = new VoiceHandler();
        await voice.attach(conn);
        
        if (isStage) {
          await msg.reply(`Joined stage channel "${channelName}". Requesting speaker permission...`);
          await dc.requestSpeakerPermission();
        } else {
          await msg.reply(`Joined voice channel "${channelName}". Auto-listening to all users enabled.`);
        }
        
        // Start auto-listening to all users
        await voice.startListening();
      } catch (e: any) {
        logger.error(`Failed to join channel: ${e?.message || e}`);
        await msg.reply(`Failed to join channel: ${e?.message || 'Unknown error'}`);
      }
      return;
    }

    if (msg.content.startsWith('!stage')) {
      const parts = msg.content.split(/\s+/);
      const channelId = parts[1];
      if (!channelId) {
        await msg.reply('Usage: !stage <stage_channel_id>');
        return;
      }
      
      try {
        const conn = await dc.joinStageChannel(channelId);
        voice = new VoiceHandler();
        await voice.attach(conn);
        await msg.reply('Joined stage channel. Requesting speaker permission...');
        await dc.requestSpeakerPermission();
        await voice.startListening();
      } catch (e: any) {
        logger.error(`Failed to join stage: ${e?.message || e}`);
        await msg.reply(`Failed to join stage: ${e?.message || 'Unknown error'}`);
      }
      return;
    }

    if (msg.content.startsWith('!listen')) {
      const parts = msg.content.split(/\s+/);
      const userId = parts[1];
      
      if (!voice) {
        await msg.reply('Not in a voice channel. Use !join first.');
        return;
      }
      
      if (!userId) {
        await msg.reply('Usage: !listen <user_id>');
        return;
      }
      
      voice.startListeningToUser(userId);
      await msg.reply(`Now listening to user ${userId}`);
      return;
    }

    if (msg.content.startsWith('!leave')) {
      if (voice) {
        await voice.stopListening();
      }
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
    
    if (msg.content.startsWith('!clear')) {
      if (voice) {
        voice.clearContext();
        await msg.reply('Conversation context cleared.');
      } else {
        await msg.reply('No active voice session.');
      }
      return;
    }
  });

  process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    if (voice) {
      await voice.stopListening();
    }
    await dc.disconnect();
    process.exit(0);
  });
}

main().catch((e) => {
  logger.error(`Fatal error: ${e?.stack || e}`);
  process.exit(1);
});