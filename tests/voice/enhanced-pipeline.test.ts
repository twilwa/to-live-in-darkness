import { VoicePipeline } from '../../src/voice/pipeline';
import { VoiceHandler } from '../../src/discord/voice';
import { DiscordClient } from '../../src/discord/client';
import { DeepgramSTT } from '../../src/voice/deepgram-stt';

// Mock Discord.js
jest.mock('discord.js');
jest.mock('@discordjs/voice');

describe('Enhanced Voice Pipeline', () => {
  let pipeline: VoicePipeline;
  let handler: VoiceHandler;
  let client: DiscordClient;
  
  beforeEach(() => {
    // Set up mocks
    process.env.DEEPGRAM_API_KEY = 'test-key';
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.DISCORD_BOT_TOKEN = 'test-token';
    process.env.VERBOSE = 'true';
    
    pipeline = new VoicePipeline();
    handler = new VoiceHandler(pipeline);
    client = new DiscordClient();
  });
  
  describe('Auto-Listen Feature', () => {
    it('should automatically listen to all users in voice channel', async () => {
      // This test should FAIL until auto-listen is implemented
      const mockConnection = {
        channel: {
          members: new Map([
            ['user1', { user: { bot: false, username: 'User1' } }],
            ['user2', { user: { bot: false, username: 'User2' } }],
            ['bot', { user: { bot: true, username: 'Bot' } }],
          ])
        }
      };
      
      await handler.attach(mockConnection as any);
      await handler.startListening();
      
      // Should be listening to both non-bot users
      const activeUsers = handler.getActiveUsers();
      expect(activeUsers).toContain('user1');
      expect(activeUsers).toContain('user2');
      expect(activeUsers).not.toContain('bot');
    });
    
    it('should start listening to users who join after bot', async () => {
      // This test should FAIL until voice state tracking is implemented
      const mockConnection = { 
        on: jest.fn(),
        channel: { members: new Map() }
      };
      
      await handler.attach(mockConnection as any);
      await handler.startListening();
      
      // Simulate user joining
      const voiceStateHandler = mockConnection.on.mock.calls.find(
        call => call[0] === 'stateChange'
      )?.[1];
      
      expect(voiceStateHandler).toBeDefined();
      
      // User joins channel
      voiceStateHandler(
        { channelId: null },
        { channelId: 'channel1', userId: 'newUser' }
      );
      
      const activeUsers = handler.getActiveUsers();
      expect(activeUsers).toContain('newUser');
    });
  });
  
  describe('Verbose Logging', () => {
    it('should log Deepgram WebSocket messages when VERBOSE=true', async () => {
      const logSpy = jest.spyOn(console, 'log');
      process.env.VERBOSE = 'true';
      
      const stt = new DeepgramSTT();
      stt.setVerbose(true);
      
      await stt.connect();
      
      // Should log connection details
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deepgram WebSocket')
      );
    });
    
    it('should log audio buffer sizes when processing', () => {
      const logSpy = jest.spyOn(console, 'log');
      pipeline.setVerbose(true);
      
      const mockBuffer = Buffer.alloc(1024);
      pipeline.processAudio(mockBuffer);
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing audio buffer: 1024 bytes')
      );
    });
    
    it('should track and log audio statistics', () => {
      // This test should FAIL until audio stats tracking is implemented
      pipeline.setVerbose(true);
      
      // Process some audio
      for (let i = 0; i < 10; i++) {
        pipeline.processAudio(Buffer.alloc(1024));
      }
      
      const stats = pipeline.getAudioStats();
      expect(stats.totalBytes).toBe(10240);
      expect(stats.packetsProcessed).toBe(10);
      expect(stats.averagePacketSize).toBe(1024);
      expect(stats.lastPacketTime).toBeDefined();
    });
  });
  
  describe('Slash Commands', () => {
    it('should register slash commands on startup', async () => {
      // This test should FAIL until slash commands are implemented
      await client.connect();
      
      const commands = await client.getRegisteredCommands();
      const commandNames = commands.map(cmd => cmd.name);
      
      expect(commandNames).toContain('join');
      expect(commandNames).toContain('leave');
      expect(commandNames).toContain('say');
      expect(commandNames).toContain('clear');
      expect(commandNames).toContain('debug');
    });
    
    it('should handle /join slash command', async () => {
      // This test should FAIL until slash command handling is implemented
      await client.connect();
      
      const mockInteraction = {
        commandName: 'join',
        user: { id: 'user123' },
        reply: jest.fn(),
        guild: {
          members: {
            cache: new Map([
              ['user123', { voice: { channel: { id: 'voice123' } } }]
            ])
          }
        }
      };
      
      await client.handleSlashCommand(mockInteraction as any);
      
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('Joined')
      );
    });
    
    it('should handle /debug audio command', async () => {
      // This test should FAIL until debug commands are implemented
      const mockInteraction = {
        commandName: 'debug',
        options: { getString: () => 'audio' },
        reply: jest.fn()
      };
      
      await client.handleSlashCommand(mockInteraction as any);
      
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('Audio Statistics')
      );
    });
  });
  
  describe('Smart Join', () => {
    it('should join user\'s current voice channel without ID', async () => {
      // This test should FAIL until smart join is implemented
      await client.connect();
      
      const mockMessage = {
        content: '!join',
        author: { id: 'user123', bot: false },
        reply: jest.fn(),
        guild: {
          members: {
            cache: new Map([
              ['user123', { 
                voice: { 
                  channel: { 
                    id: 'voice123',
                    name: 'General Voice'
                  } 
                } 
              }]
            ])
          }
        }
      };
      
      await client.handleTextCommand(mockMessage as any);
      
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('Joined General Voice')
      );
    });
    
    it('should error if user not in voice channel', async () => {
      const mockMessage = {
        content: '!join',
        author: { id: 'user123', bot: false },
        reply: jest.fn(),
        guild: {
          members: {
            cache: new Map([
              ['user123', { voice: { channel: null } }]
            ])
          }
        }
      };
      
      await client.handleTextCommand(mockMessage as any);
      
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('not in a voice channel')
      );
    });
  });
  
  describe('Audio Pipeline Debugging', () => {
    it('should detect empty audio buffers', () => {
      // This test should FAIL until empty buffer detection is implemented
      const logSpy = jest.spyOn(console, 'warn');
      pipeline.setVerbose(true);
      
      const emptyBuffer = Buffer.alloc(0);
      pipeline.processAudio(emptyBuffer);
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Empty audio buffer received')
      );
    });
    
    it('should detect silence vs actual audio', () => {
      // This test should FAIL until silence detection is implemented
      pipeline.setVerbose(true);
      
      // All zeros = silence
      const silentBuffer = Buffer.alloc(1024, 0);
      const result1 = pipeline.detectSilence(silentBuffer);
      expect(result1).toBe(true);
      
      // Random data = audio
      const audioBuffer = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
      const result2 = pipeline.detectSilence(audioBuffer);
      expect(result2).toBe(false);
    });
    
    it('should verify FFmpeg is available', async () => {
      // This test should FAIL until FFmpeg check is implemented
      const isAvailable = await pipeline.checkFFmpeg();
      expect(isAvailable).toBe(true);
    });
    
    it('should track Deepgram connection state', () => {
      // This test should FAIL until connection tracking is implemented
      const stt = pipeline.getSTTClient();
      
      expect(stt.getConnectionState()).toBe('disconnected');
      
      stt.connect();
      expect(stt.getConnectionState()).toBe('connecting');
      
      // After connection
      setTimeout(() => {
        expect(stt.getConnectionState()).toBe('connected');
      }, 100);
    });
  });
  
  describe('Error Recovery', () => {
    it('should auto-reconnect Deepgram on disconnect', async () => {
      // This test should FAIL until auto-reconnect is implemented
      const stt = pipeline.getSTTClient();
      const reconnectSpy = jest.spyOn(stt, 'connect');
      
      await stt.connect();
      
      // Simulate disconnect
      stt.simulateDisconnect();
      
      // Should auto-reconnect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(reconnectSpy).toHaveBeenCalledTimes(2);
    });
    
    it('should handle audio processing errors gracefully', () => {
      const logSpy = jest.spyOn(console, 'error');
      
      // Send invalid audio
      pipeline.processAudio(null as any);
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process audio')
      );
      
      // Pipeline should still be functional
      const validBuffer = Buffer.alloc(1024);
      expect(() => pipeline.processAudio(validBuffer)).not.toThrow();
    });
  });
});