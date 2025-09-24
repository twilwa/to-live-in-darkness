import { logger } from '../utils/logger';
import fetch from 'cross-fetch';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

export class OpenRouterClient {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
    
    this.apiKey = apiKey;
    this.model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-sonnet';
  }

  async chat(messages: OpenRouterMessage[], temperature = 0.7): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/redbot', // Optional, for tracking
        'X-Title': 'Redbot Voice Assistant', // Optional, for tracking
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature,
        max_tokens: 500, // Keep responses concise for voice
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      logger.error(`OpenRouter error: ${resp.status} ${resp.statusText} - ${errText}`);
      throw new Error(`OpenRouter failed: ${resp.status}`);
    }

    const data = await resp.json() as OpenRouterResponse;
    const content = data.choices[0]?.message?.content || '';
    
    logger.info(`OpenRouter response: ${content.substring(0, 100)}...`);
    return content;
  }

  async generateResponse(userInput: string, context?: string[]): Promise<string> {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful voice assistant in a Discord voice channel. Keep responses concise and conversational, suitable for text-to-speech. Avoid using markdown or special formatting.',
      },
    ];

    // Add context from previous messages if available
    if (context && context.length > 0) {
      context.slice(-5).forEach((msg, i) => {
        messages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: msg,
        });
      });
    }

    messages.push({
      role: 'user',
      content: userInput,
    });

    return this.chat(messages);
  }
}