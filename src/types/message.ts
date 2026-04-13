export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatResponseDto {
  content: string;
  usage?: TokenUsage;
}
