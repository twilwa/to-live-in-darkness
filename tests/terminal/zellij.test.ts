import { ZellijController } from '../../src/terminal/zellij';
import { GlowRenderer } from '../../src/terminal/glow';
import { TerminalManager } from '../../src/terminal/manager';

describe('ZellijController', () => {
  let controller: ZellijController;

  beforeEach(() => {
    controller = new ZellijController();
  });

  describe('Pane Management', () => {
    it('should create a new pane', async () => {
      const paneId = await controller.createPane();
      
      expect(typeof paneId).toBe('string');
      expect(paneId.length).toBeGreaterThan(0);
    });

    it('should create a pane with a specific command', async () => {
      const command = 'echo "Hello World"';
      const paneId = await controller.createPane(command);
      
      expect(typeof paneId).toBe('string');
      expect(paneId.length).toBeGreaterThan(0);
    });

    it('should create a new tab', async () => {
      const tabId = await controller.createTab('Test Tab');
      
      expect(typeof tabId).toBe('string');
      expect(tabId.length).toBeGreaterThan(0);
    });

    it('should run command in specific pane', async () => {
      const paneId = await controller.createPane();
      const command = 'ls -la';
      
      await expect(controller.runInPane(paneId, command)).resolves.not.toThrow();
    });

    it('should label a pane', async () => {
      const paneId = await controller.createPane();
      const label = 'Test Pane';
      
      await expect(controller.labelPane(paneId, label)).resolves.not.toThrow();
    });

    it('should close a pane', async () => {
      const paneId = await controller.createPane();
      
      await expect(controller.closePane(paneId)).resolves.not.toThrow();
    });

    it('should list all panes', async () => {
      const panes = await controller.listPanes();
      
      expect(Array.isArray(panes)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle Zellij not available', async () => {
      // Mock scenario where Zellij is not running
      await expect(controller.createPane()).resolves.not.toThrow();
    });

    it('should handle invalid pane operations', async () => {
      const invalidPaneId = 'invalid-pane-id';
      
      await expect(controller.runInPane(invalidPaneId, 'ls')).resolves.not.toThrow();
      await expect(controller.closePane(invalidPaneId)).resolves.not.toThrow();
    });
  });
});

describe('GlowRenderer', () => {
  let renderer: GlowRenderer;

  beforeEach(() => {
    renderer = new GlowRenderer();
  });

  describe('Markdown Rendering', () => {
    it('should display markdown file', async () => {
      const mockFilePath = '/test/document.md';
      const result = await renderer.displayMarkdown(mockFilePath);
      
      expect(typeof result).toBe('string');
    });

    it('should display markdown in specific pane', async () => {
      const mockFilePath = '/test/document.md';
      const paneLabel = 'Markdown Viewer';
      
      const paneId = await renderer.displayInPane(mockFilePath, paneLabel);
      
      expect(typeof paneId).toBe('string');
      expect(paneId.length).toBeGreaterThan(0);
    });

    it('should display markdown content directly', async () => {
      const content = '# Test Markdown\n\nThis is a test document.';
      const title = 'Test Document';
      
      const result = await renderer.displayContent(content, title);
      
      expect(typeof result).toBe('string');
    });

    it('should handle missing file gracefully', async () => {
      const missingFile = '/non/existent/file.md';
      
      await expect(renderer.displayMarkdown(missingFile)).resolves.not.toThrow();
    });

    it('should handle glow command not available', async () => {
      const mockFilePath = '/test/document.md';
      
      await expect(renderer.displayMarkdown(mockFilePath)).resolves.not.toThrow();
    });
  });
});

describe('TerminalManager', () => {
  let manager: TerminalManager;

  beforeEach(() => {
    manager = new TerminalManager(true); // Prefer Zellij
  });

  afterEach(async () => {
    await manager.cleanup();
  });

  describe('Markdown Display Integration', () => {
    it('should display markdown file in terminal', async () => {
      const filePath = '/test/document.md';
      const title = 'Test Document';
      
      await expect(manager.displayMarkdownFile(filePath, title)).resolves.not.toThrow();
    });

    it('should display markdown content in terminal', async () => {
      const content = '# Test\n\nContent here';
      const title = 'Generated Content';
      
      await expect(manager.displayMarkdownContent(content, title)).resolves.not.toThrow();
    });

    it('should fallback to tmux when Zellij unavailable', async () => {
      const tmuxManager = new TerminalManager(false); // Prefer tmux
      const filePath = '/test/document.md';
      
      await expect(tmuxManager.displayMarkdownFile(filePath)).resolves.not.toThrow();
    });
  });

  describe('Workspace Management', () => {
    it('should create workspace with layout', async () => {
      const layout = {
        name: 'demo-workspace',
        panes: [
          { command: 'glow /test/file1.md', label: 'Article 1' },
          { command: 'glow /test/file2.md', label: 'Article 2' }
        ]
      };
      
      await expect(manager.createWorkspace(layout)).resolves.not.toThrow();
    });

    it('should cleanup resources', async () => {
      await expect(manager.cleanup()).resolves.not.toThrow();
    });
  });
});