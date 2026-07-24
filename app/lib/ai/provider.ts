export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface AIToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface AIOptions {
  temperature?: number
  maxTokens?: number
  model?: string
  tools?: AIToolDefinition[]
  toolChoice?: 'auto' | 'none'
}

export interface AIResponse {
  content: string
  model: string
  toolCalls?: AIToolCall[]
  finishReason?: 'stop' | 'tool_calls' | 'length'
}

export interface AIAssistantConfig {
  assistantName?: string
  systemPrompt?: string
  responseStyle?: string
  allowedActions?: string[]
}

export interface AIProvider {
  chat(messages: AIMessage[], options?: AIOptions): Promise<AIResponse>
  stream(messages: AIMessage[], options?: AIOptions): Promise<ReadableStream<string>>
  healthCheck(): Promise<{ reachable: boolean; modelExists: boolean; error?: string }>
  supportsTools(): boolean
}
