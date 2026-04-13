export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LlmChatResult {
  content: string;
  usage?: TokenUsage;
}

export interface ChatResponseDto {
  conversationId: string;
  content: string;
  usage?: TokenUsage;
}
