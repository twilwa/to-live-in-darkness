import { CLIGenerator } from '../../src/cli/generator';
import { CLICompiler } from '../../src/cli/compiler';
import { CarapaceSpec } from '../../src/cli/carapace';

describe('CLIGenerator', () => {
  let generator: CLIGenerator;

  beforeEach(() => {
    generator = new CLIGenerator();
  });

  describe('CLI Code Generation', () => {
    it('should generate Cobra CLI from description', async () => {
      const description = 'Create a CLI tool that prints inspirational quotes';
      const cli = await generator.generateCLI(description);
      
      expect(cli.name).toBeDefined();
      expect(cli.sourceCode).toContain('package main');
      expect(cli.sourceCode).toContain('cobra');
      expect(cli.helpText).toContain(cli.name);
      expect(Array.isArray(cli.commands)).toBe(true);
    });

    it('should generate CLI with multiple commands', async () => {
      const description = 'File utility CLI with list, copy, and move commands';
      const cli = await generator.generateCLI(description);
      
      expect(cli.commands.length).toBeGreaterThan(1);
      expect(cli.commands.some(cmd => cmd.name.includes('list'))).toBe(true);
      expect(cli.commands.some(cmd => cmd.name.includes('copy'))).toBe(true);
    });

    it('should generate CLI with flags and arguments', async () => {
      const description = 'Weather CLI that shows weather for a city with format options';
      const cli = await generator.generateCLI(description);
      
      const hasFlags = cli.commands.some(cmd => cmd.flags.length > 0);
      expect(hasFlags).toBe(true);
    });

    it('should compile generated CLI successfully', async () => {
      const description = 'Simple hello world CLI';
      const cli = await generator.generateCLI(description);
      
      const binaryPath = await generator.compileCLI(cli.sourceCode, cli.name);
      
      expect(binaryPath).toBeDefined();
      expect(binaryPath).toContain(cli.name);
    });

    it('should test generated CLI functionality', async () => {
      const description = 'CLI that echoes input with timestamp';
      const cli = await generator.generateCLI(description);
      const binaryPath = await generator.compileCLI(cli.sourceCode, cli.name);
      
      const testResult = await generator.testCLI(binaryPath);
      
      expect(testResult.success).toBe(true);
      expect(testResult.helpOutput).toBeDefined();
    });

    it('should generate proper Cobra boilerplate', async () => {
      const cliName = 'testcli';
      const boilerplate = await generator.generateCobraBoilerplate(cliName);
      
      expect(boilerplate).toContain('package main');
      expect(boilerplate).toContain('import');
      expect(boilerplate).toContain('"github.com/spf13/cobra"');
      expect(boilerplate).toContain('rootCmd');
      expect(boilerplate).toContain('func main()');
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM generation failures', async () => {
      const description = ''; // Empty description
      
      await expect(generator.generateCLI(description)).resolves.not.toThrow();
    });

    it('should handle invalid Go code generation', async () => {
      const invalidCode = 'invalid go syntax here';
      const cliName = 'testcli';
      
      await expect(generator.compileCLI(invalidCode, cliName)).rejects.toThrow();
    });

    it('should handle compilation failures gracefully', async () => {
      const description = 'Very complex CLI that might fail to generate properly';
      
      await expect(generator.generateCLI(description)).resolves.not.toThrow();
    });
  });
});

describe('CLICompiler', () => {
  let compiler: CLICompiler;

  beforeEach(() => {
    compiler = new CLICompiler();
  });

  describe('Go Module Management', () => {
    it('should setup Go module in directory', async () => {
      const projectPath = '/tmp/test-cli-project';
      const moduleName = 'github.com/test/testcli';
      
      await expect(compiler.setupGoModule(projectPath, moduleName)).resolves.not.toThrow();
    });

    it('should build binary from source', async () => {
      const validGoCode = `
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`;
      
      // This will likely fail until Go toolchain is properly set up
      await expect(compiler.buildBinary('/tmp/test.go')).resolves.toBeDefined();
    });

    it('should validate binary exists and is executable', async () => {
      const binaryPath = '/usr/bin/ls'; // Use existing binary for test
      const isValid = await compiler.validateBinary(binaryPath);
      
      expect(isValid).toBe(true);
    });

    it('should run binary with arguments', async () => {
      const binaryPath = '/bin/echo';
      const args = ['Hello', 'World'];
      
      const output = await compiler.runWithArgs(binaryPath, args);
      
      expect(output).toContain('Hello World');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing Go toolchain', async () => {
      const projectPath = '/tmp/no-go-here';
      
      await expect(compiler.setupGoModule(projectPath, 'test')).resolves.not.toThrow();
    });

    it('should handle build failures', async () => {
      const invalidSource = '/tmp/invalid-source.go';
      
      await expect(compiler.buildBinary(invalidSource)).rejects.toThrow();
    });

    it('should handle invalid binary paths', async () => {
      const nonExistentBinary = '/tmp/does-not-exist';
      const isValid = await compiler.validateBinary(nonExistentBinary);
      
      expect(isValid).toBe(false);
    });
  });
});

describe('CarapaceSpec', () => {
  let carapace: CarapaceSpec;

  beforeEach(() => {
    carapace = new CarapaceSpec();
  });

  const mockCLI = {
    name: 'testcli',
    sourceCode: 'mock code',
    binaryPath: '/tmp/testcli',
    helpText: 'A test CLI',
    commands: [
      {
        name: 'hello',
        description: 'Say hello',
        flags: [
          {
            name: '--name',
            shorthand: '-n',
            description: 'Name to greet',
            type: 'string'
          }
        ]
      }
    ]
  };

  describe('Spec Generation', () => {
    it('should generate valid YAML spec from CLI metadata', async () => {
      const yamlSpec = await carapace.generateSpec(mockCLI);
      
      expect(yamlSpec).toContain('name: testcli');
      expect(yamlSpec).toContain('description: A test CLI');
      expect(yamlSpec).toContain('- name: hello');
      expect(yamlSpec).toContain('- name: --name');
    });

    it('should handle CLI with no commands', async () => {
      const simpleCLI = { ...mockCLI, commands: [] };
      const yamlSpec = await carapace.generateSpec(simpleCLI);
      
      expect(yamlSpec).toContain('name: testcli');
      expect(yamlSpec).toBeDefined();
    });

    it('should write spec to correct directory', async () => {
      const yamlContent = 'name: testcli\ndescription: test';
      const specPath = await carapace.writeSpec('testcli', yamlContent);
      
      expect(specPath).toContain('testcli');
      expect(specPath).toContain('.yaml');
    });

    it('should list existing specs', async () => {
      const specs = await carapace.listSpecs();
      
      expect(Array.isArray(specs)).toBe(true);
    });

    it('should delete spec file', async () => {
      await carapace.writeSpec('temp-cli', 'name: temp-cli');
      await expect(carapace.deleteSpec('temp-cli')).resolves.not.toThrow();
    });
  });

  describe('Complex CLI Structures', () => {
    it('should handle nested commands', async () => {
      const nestedCLI = {
        ...mockCLI,
        commands: [
          {
            name: 'database',
            description: 'Database operations',
            flags: [],
            subcommands: [
              {
                name: 'migrate',
                description: 'Run migrations',
                flags: [
                  {
                    name: '--dry-run',
                    description: 'Show what would be done',
                    type: 'boolean'
                  }
                ]
              }
            ]
          }
        ]
      };
      
      const yamlSpec = await carapace.generateSpec(nestedCLI);
      
      expect(yamlSpec).toContain('- name: database');
      expect(yamlSpec).toContain('- name: migrate');
      expect(yamlSpec).toContain('- name: --dry-run');
    });

    it('should handle flag completions', async () => {
      const cliWithCompletions = {
        ...mockCLI,
        commands: [
          {
            name: 'config',
            description: 'Configuration management',
            flags: [
              {
                name: '--env',
                description: 'Environment',
                type: 'string',
                completion: {
                  flag: {
                    env: ['development', 'staging', 'production']
                  }
                }
              }
            ]
          }
        ]
      };
      
      const yamlSpec = await carapace.generateSpec(cliWithCompletions);
      
      expect(yamlSpec).toContain('completion:');
      expect(yamlSpec).toContain('flag:');
      expect(yamlSpec).toContain('development');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing carapace config directory', async () => {
      const yamlContent = 'name: test';
      
      await expect(carapace.writeSpec('test', yamlContent)).resolves.not.toThrow();
    });

    it('should handle permission errors', async () => {
      const yamlContent = 'name: restricted';
      
      await expect(carapace.writeSpec('restricted', yamlContent)).resolves.not.toThrow();
    });
  });
});