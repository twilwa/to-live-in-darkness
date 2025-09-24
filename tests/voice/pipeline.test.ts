import { VoicePipeline } from '../../src/voice/pipeline';

describe('VoicePipeline', () => {
  let pipeline: VoicePipeline;

  beforeEach(() => {
    pipeline = new VoicePipeline();
  });

  describe('Audio Processing Pipeline', () => {
    it('should process audio buffer and return transcribed text', async () => {
      const mockAudioBuffer = Buffer.from('mock-audio-data');
      const result = await pipeline.processAudio(mockAudioBuffer);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty audio buffer gracefully', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = await pipeline.processAudio(emptyBuffer);
      
      expect(result).toBe('');
    });

    it('should generate appropriate response from text input', async () => {
      const testInput = 'Hello, how are you today?';
      const response = await pipeline.generateResponse(testInput);
      
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(response).not.toBe(testInput); // Should be different from input
    });

    it('should synthesize speech from text', async () => {
      const testText = 'This is a test message for speech synthesis';
      const audioBuffer = await pipeline.synthesizeSpeech(testText);
      
      expect(Buffer.isBuffer(audioBuffer)).toBe(true);
      expect(audioBuffer.length).toBeGreaterThan(0);
    });

    it('should handle synthesis of empty text', async () => {
      const emptyText = '';
      const audioBuffer = await pipeline.synthesizeSpeech(emptyText);
      
      expect(Buffer.isBuffer(audioBuffer)).toBe(true);
    });
  });

  describe('End-to-End Pipeline', () => {
    it('should complete full STT->LLM->TTS pipeline within latency requirements', async () => {
      const startTime = Date.now();
      
      const mockAudioBuffer = Buffer.from('mock-audio-data');
      const transcribedText = await pipeline.processAudio(mockAudioBuffer);
      const response = await pipeline.generateResponse(transcribedText);
      const synthesizedAudio = await pipeline.synthesizeSpeech(response);
      
      const endTime = Date.now();
      const totalLatency = endTime - startTime;
      
      expect(totalLatency).toBeLessThan(2000); // 2 second requirement
      expect(Buffer.isBuffer(synthesizedAudio)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle STT service errors gracefully', async () => {
      // Mock corrupted audio data
      const corruptedBuffer = Buffer.from('corrupted-data');
      
      await expect(pipeline.processAudio(corruptedBuffer)).resolves.not.toThrow();
    });

    it('should handle LLM service errors gracefully', async () => {
      const testInput = 'This might cause an LLM error';
      
      await expect(pipeline.generateResponse(testInput)).resolves.not.toThrow();
    });

    it('should handle TTS service errors gracefully', async () => {
      const problematicText = 'Text that might cause TTS issues';
      
      await expect(pipeline.synthesizeSpeech(problematicText)).resolves.not.toThrow();
    });
  });
});