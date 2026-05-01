import { createContext, useCallback, useContext, useRef, useState } from "react";
import type {
  ConversationDto,
  Message,
  ModelDto,
  TokenUsage,
} from "@kontekst/dtos";

interface ConversationState {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  conversationId: string | undefined;
  setConversationId: (id: string | undefined) => void;
  tokenUsage: TokenUsage | undefined;
  setTokenUsage: (usage: TokenUsage | undefined) => void;
  conversationCost: number;
  setConversationCost: React.Dispatch<React.SetStateAction<number>>;
  selectedKontekst: string | undefined;
  setSelectedKontekst: (name: string | undefined) => void;
  selectedModel: string;
  setSelectedModel: (id: string) => void;
  selectedModelDto: ModelDto | undefined;
  setSelectedModelDto: (dto: ModelDto | undefined) => void;
  modelContextLength: number;
  setModelContextLength: (len: number) => void;
  loadConversation: (dto: ConversationDto) => void;
  registerStreamCanceller: (cancel: (() => void) | null) => void;
}

const ConversationContext = createContext<ConversationState | undefined>(
  undefined,
);

export function ConversationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | undefined>();
  const [conversationCost, setConversationCost] = useState(0);
  const [selectedKontekst, setSelectedKontekst] = useState<
    string | undefined
  >();
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedModelDto, setSelectedModelDto] = useState<
    ModelDto | undefined
  >();
  const [modelContextLength, setModelContextLength] = useState(0);
  const streamCancellerRef = useRef<(() => void) | null>(null);

  const registerStreamCanceller = useCallback(
    (cancel: (() => void) | null) => {
      streamCancellerRef.current = cancel;
    },
    [],
  );

  const loadConversation = (dto: ConversationDto) => {
    streamCancellerRef.current?.();
    setMessages(dto.messages);
    setConversationId(dto.id);
    setSelectedKontekst(dto.kontekstName);
    setSelectedModel(dto.model);
    setSelectedModelDto(undefined);
    setTokenUsage(undefined);
    setConversationCost(dto.totalCost);
  };

  return (
    <ConversationContext.Provider
      value={{
        messages,
        setMessages,
        conversationId,
        setConversationId,
        tokenUsage,
        setTokenUsage,
        conversationCost,
        setConversationCost,
        selectedKontekst,
        setSelectedKontekst,
        selectedModel,
        setSelectedModel,
        selectedModelDto,
        setSelectedModelDto,
        modelContextLength,
        setModelContextLength,
        loadConversation,
        registerStreamCanceller,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const ctx = useContext(ConversationContext);
  if (!ctx)
    throw new Error("useConversation must be used within ConversationProvider");

  return ctx;
}
