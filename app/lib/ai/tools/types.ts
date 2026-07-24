export interface FactoryToolContext {
  userId: string
  userRole: string
}

export interface FactoryToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export interface FactoryTool {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute(args: Record<string, unknown>, context: FactoryToolContext): Promise<FactoryToolResult>
}

// Tool registry — add tools here when implementing tool calling
export const REGISTERED_TOOLS: FactoryTool[] = []
