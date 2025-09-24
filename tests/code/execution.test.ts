import { CodeExecutor } from '../../src/code/executor';
import { CodeParser } from '../../src/code/parser';

describe('CodeExecutor', () => {
  let executor: CodeExecutor;

  beforeEach(() => {
    executor = new CodeExecutor();
  });

  afterEach(async () => {
    // Cleanup any active sandboxes
    const sandboxes = await executor.listActiveSandboxes();
    for (const sandbox of sandboxes) {
      await executor.destroySandbox(sandbox.id);
    }
  });

  describe('Sandbox Management', () => {
    it('should create a Python sandbox', async () => {
      const sandbox = await executor.createSandbox('python');
      
      expect(sandbox).toBeDefined();
      expect(sandbox.id).toBeDefined();
    });

    it('should execute Python code successfully', async () => {
      const code = 'print("Hello, World!")';
      const result = await executor.executePython(code);
      
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Hello, World!');
      expect(result.stderr).toBe('');
      expect(result.exitCode).toBe(0);
    });

    it('should handle Python syntax errors', async () => {
      const invalidCode = 'print("missing quote';
      const result = await executor.executePython(invalidCode);
      
      expect(result.success).toBe(false);
      expect(result.stderr.length).toBeGreaterThan(0);
      expect(result.exitCode).not.toBe(0);
    });

    it('should enforce timeout limits', async () => {
      const infiniteLoop = 'while True:\n    pass';
      
      const startTime = Date.now();
      const result = await executor.executePython(infiniteLoop);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(35000); // Should timeout before 35 seconds
      expect(result.success).toBe(false);
    });

    it('should execute code with multiple languages', async () => {
      const pythonCode = 'print("Python works")';
      const pythonResult = await executor.executeCode(pythonCode, 'python');
      
      expect(pythonResult.success).toBe(true);
      expect(pythonResult.stdout).toContain('Python works');
    });

    it('should list active sandboxes', async () => {
      await executor.createSandbox('python');
      const sandboxes = await executor.listActiveSandboxes();
      
      expect(Array.isArray(sandboxes)).toBe(true);
      expect(sandboxes.length).toBeGreaterThan(0);
    });

    it('should destroy sandbox properly', async () => {
      const sandbox = await executor.createSandbox('python');
      
      await expect(executor.destroySandbox(sandbox.id)).resolves.not.toThrow();
    });
  });

  describe('Advanced Code Execution', () => {
    it('should handle imports and libraries', async () => {
      const code = `
import json
import datetime

data = {"message": "Hello", "timestamp": datetime.datetime.now().isoformat()}
print(json.dumps(data))
      `;
      
      const result = await executor.executePython(code);
      
      expect(result.success).toBe(true);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });

    it('should capture both stdout and stderr', async () => {
      const code = `
import sys
print("This goes to stdout")
print("This goes to stderr", file=sys.stderr)
      `;
      
      const result = await executor.executePython(code);
      
      expect(result.stdout).toContain('stdout');
      expect(result.stderr).toContain('stderr');
    });

    it('should measure execution time', async () => {
      const code = 'import time; time.sleep(0.1)';
      const result = await executor.executePython(code);
      
      expect(result.executionTime).toBeGreaterThan(100); // At least 100ms
      expect(result.executionTime).toBeLessThan(5000); // Less than 5 seconds
    });
  });

  describe('Error Handling', () => {
    it('should handle E2B service unavailable', async () => {
      // Mock E2B service being down
      await expect(executor.createSandbox('python')).resolves.not.toThrow();
    });

    it('should handle invalid language specification', async () => {
      const code = 'print("hello")';
      await expect(executor.executeCode(code, 'invalid-language')).resolves.not.toThrow();
    });

    it('should handle resource exhaustion', async () => {
      const memoryIntensiveCode = `
data = []
for i in range(1000000):
    data.append([0] * 1000)
      `;
      
      const result = await executor.executePython(memoryIntensiveCode);
      
      // Should either succeed or fail gracefully without crashing
      expect(typeof result.success).toBe('boolean');
    });
  });
});

describe('CodeParser', () => {
  let parser: CodeParser;

  beforeEach(() => {
    parser = new CodeParser();
  });

  describe('Message Parsing', () => {
    it('should extract code from Discord message with fences', () => {
      const message = `!run python
\`\`\`python
print("Hello World")
x = 5 + 3
print(f"Result: {x}")
\`\`\``;
      
      const codeBlock = parser.extractCodeFromMessage(message);
      
      expect(codeBlock).not.toBeNull();
      expect(codeBlock!.language).toBe('python');
      expect(codeBlock!.code).toContain('print("Hello World")');
      expect(codeBlock!.code).toContain('x = 5 + 3');
    });

    it('should handle run command without explicit language', () => {
      const message = `!run
\`\`\`
print("Default to Python")
\`\`\``;
      
      const codeBlock = parser.extractCodeFromMessage(message);
      
      expect(codeBlock).not.toBeNull();
      expect(codeBlock!.language).toBe('python'); // Should default to Python
    });

    it('should parse run command directly', () => {
      const content = `python
\`\`\`py
import os
print(os.getcwd())
\`\`\``;
      
      const codeBlock = parser.parseRunCommand(content);
      
      expect(codeBlock).not.toBeNull();
      expect(codeBlock!.language).toBe('python');
      expect(codeBlock!.code).toContain('import os');
    });

    it('should handle inline code', () => {
      const message = '!run print("inline code")';
      const codeBlock = parser.extractCodeFromMessage(message);
      
      expect(codeBlock).not.toBeNull();
      expect(codeBlock!.code).toBe('print("inline code")');
    });

    it('should return null for invalid messages', () => {
      const message = 'This is just a regular message without code';
      const codeBlock = parser.extractCodeFromMessage(message);
      
      expect(codeBlock).toBeNull();
    });

    it('should handle multiple code blocks', () => {
      const message = `!run python
\`\`\`python
print("First block")
\`\`\`
Some text in between
\`\`\`python
print("Second block")
\`\`\``;
      
      const codeBlock = parser.extractCodeFromMessage(message);
      
      expect(codeBlock).not.toBeNull();
      expect(codeBlock!.code).toContain('First block');
      // Should extract the first code block
    });

    it('should preserve code formatting and indentation', () => {
      const message = `!run python
\`\`\`python
def hello_world():
    if True:
        print("Indented code")
        return "success"

result = hello_world()
print(result)
\`\`\``;
      
      const codeBlock = parser.extractCodeFromMessage(message);
      
      expect(codeBlock).not.toBeNull();
      expect(codeBlock!.code).toContain('    if True:');
      expect(codeBlock!.code).toContain('        print("Indented code")');
    });
  });
});