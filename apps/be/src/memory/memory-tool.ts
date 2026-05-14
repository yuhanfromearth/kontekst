export const MEMORY_UPDATE_TOOL = {
  type: 'function',
  function: {
    name: 'memory_update',
    description:
      "Save something to the user's persistent global memory. The memory is shared across every conversation and survives across sessions, so anything stored here will be available in all future chats.\n\nCall this proactively — without waiting to be asked — whenever the user reveals durable information about THEMSELVES in their messages, including:\n- Their name, role, location, language, or other personal facts (e.g. \"I am Tom\", \"I'm a backend engineer\", \"I live in Berlin\").\n- Stable preferences they state (favorite tools, frameworks, communication style, formatting preferences).\n- Ongoing projects, goals, constraints, or context they tell you about.\n- Explicit instructions they give about how you should behave with them in future sessions.\n\nSTRICT RULES about what NOT to store:\n- Do NOT mirror, paraphrase, or infer content from the system prompt / kontekst / your own role description into memory. The kontekst is configured separately and is already injected into every chat — duplicating it wastes tokens and confuses future sessions.\n- Do NOT invent attributes about the user that they have not explicitly stated (e.g. don't write \"Role: Learner\" just because the active kontekst is a tutor).\n- Do NOT store throwaway details about the current task, secrets/credentials, or temporary state.\n- Memory is about the USER, not about you or your current configuration.\n\nThe `content` argument must be the COMPLETE new contents of the memory file — this is a full overwrite, not an append. Always preserve every existing entry that is still relevant, then add or update the new information. Use clear markdown (e.g. bullet lists under headings) so the memory stays readable as it grows. When the user shares only one fact, the memory should typically grow by only one line.",
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description:
            'The complete new contents of the memory.md file. Markdown is supported.',
        },
      },
      required: ['content'],
    },
  },
} as const;
