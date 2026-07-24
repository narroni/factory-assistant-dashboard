import { OllamaProvider } from './providers/ollama'

export function getAIProvider(): import('./provider').AIProvider {
  const provider = process.env.AI_PROVIDER ?? 'ollama'
  switch (provider) {
    case 'ollama':
    default:
      return new OllamaProvider({
        baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
        model: process.env.OLLAMA_MODEL ?? 'qwen2.5:7b',
      })
  }
}

export type { AIProvider, AIMessage, AIOptions, AIResponse, AIAssistantConfig, AIToolDefinition, AIToolCall } from './provider'
