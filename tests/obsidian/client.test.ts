import { ObsidianClient } from '../../src/obsidian/client';
import { ClippingProcessor } from '../../src/obsidian/clippings';

describe('ObsidianClient', () => {
  let client: ObsidianClient;
  const mockApiKey = 'test-api-key';
  const mockBaseUrl = 'http://127.0.0.1:27124';

  beforeEach(() => {
    client = new ObsidianClient(mockApiKey, mockBaseUrl);
  });

  describe('Connection Management', () => {
    it('should test connection successfully', async () => {
      const isConnected = await client.testConnection();
      expect(typeof isConnected).toBe('boolean');
    });

    it('should handle connection failure gracefully', async () => {
      // Mock unavailable API
      const invalidClient = new ObsidianClient('invalid', 'http://localhost:99999');
      const isConnected = await invalidClient.testConnection();
      expect(isConnected).toBe(false);
    });
  });

  describe('File Search', () => {
    it('should search for files with query', async () => {
      const query = 'path:Clippings';
      const results = await client.searchFiles(query);
      
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return recent clippings', async () => {
      const days = 7;
      const clippings = await client.getRecentClippings(days);
      
      expect(Array.isArray(clippings)).toBe(true);
      clippings.forEach(clipping => {
        expect(clipping).toHaveProperty('title');
        expect(clipping).toHaveProperty('content');
        expect(clipping).toHaveProperty('date');
        expect(clipping).toHaveProperty('filePath');
      });
    });

    it('should filter clippings by date correctly', async () => {
      const clippings = await client.getRecentClippings(7);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      clippings.forEach(clipping => {
        expect(clipping.date.getTime()).toBeGreaterThanOrEqual(weekAgo.getTime());
      });
    });
  });

  describe('File Content Retrieval', () => {
    it('should get file content by path', async () => {
      const mockFilePath = '/test/file.md';
      const content = await client.getFileContent(mockFilePath);
      
      expect(typeof content).toBe('string');
    });

    it('should handle missing file gracefully', async () => {
      const missingFilePath = '/non/existent/file.md';
      
      await expect(client.getFileContent(missingFilePath)).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle API unavailable', async () => {
      const offlineClient = new ObsidianClient('key', 'http://localhost:99999');
      
      await expect(offlineClient.searchFiles('test')).resolves.not.toThrow();
      await expect(offlineClient.getRecentClippings(7)).resolves.not.toThrow();
    });

    it('should handle invalid credentials', async () => {
      const invalidClient = new ObsidianClient('invalid-key', mockBaseUrl);
      
      await expect(invalidClient.testConnection()).resolves.toBe(false);
    });
  });
});

describe('ClippingProcessor', () => {
  let processor: ClippingProcessor;

  beforeEach(() => {
    processor = new ClippingProcessor();
  });

  const mockClippings = [
    {
      title: 'Test Article 1',
      content: 'This is test content for article 1',
      date: new Date('2024-01-01'),
      filePath: '/clippings/article1.md'
    },
    {
      title: 'Test Article 2',
      content: 'This is test content for article 2',
      date: new Date('2024-01-02'),
      filePath: '/clippings/article2.md'
    }
  ];

  describe('Content Formatting', () => {
    it('should format clippings for Discord display', async () => {
      const formatted = await processor.formatForDiscord(mockClippings);
      
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('Test Article 1');
      expect(formatted).toContain('Test Article 2');
    });

    it('should format clippings for voice output', async () => {
      const formatted = await processor.formatForVoice(mockClippings);
      
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeLessThan(500); // Should be concise for voice
    });

    it('should handle empty clippings array', async () => {
      const emptyFormatted = await processor.formatForDiscord([]);
      const emptyVoice = await processor.formatForVoice([]);
      
      expect(typeof emptyFormatted).toBe('string');
      expect(typeof emptyVoice).toBe('string');
    });
  });

  describe('Content Processing', () => {
    it('should extract summary from long content', async () => {
      const longContent = 'This is a very long article content that should be summarized because it contains too much text for a brief overview and we need to make it concise.';
      
      const summary = await processor.extractSummary(longContent);
      
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeLessThan(longContent.length);
    });

    it('should handle empty content', async () => {
      const summary = await processor.extractSummary('');
      
      expect(typeof summary).toBe('string');
    });
  });
});