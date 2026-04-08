import KontekstDisplay from "#/components/KontekstDisplay";
import { Button } from "#/components/ui/button";
import { Kbd } from "#/components/ui/kbd";
import { Spinner } from "#/components/ui/spinner";
import { Textarea } from "#/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const [input, setInput] = useState("");
  const [selectedKontekst, setSelectedKontekst] = useState<
    string | undefined
  >();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        textareaRef.current?.blur();
      }

      // skip if already typing in an input
      if (document.activeElement === textareaRef.current) return;

      if (e.key === "/") {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const { mutate, data, isPending } = useMutation({
    mutationFn: (payload: { input: string; kontekstName?: string }) =>
      fetch("/api/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((response) => response.text()),
  });

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate({ input, kontekstName: selectedKontekst });
  };

  return (
    <div className="flex flex-col">
      <form onSubmit={handleSubmit}>
        <Textarea
          ref={textareaRef}
          placeholder="How can I help you?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.metaKey && e.key === "Enter" && input.trim() !== "") {
              e.preventDefault();
              mutate({ input, kontekstName: selectedKontekst });
              setInput("");
            }
          }}
        />
        <Button
          className="mt-5 w-full"
          variant="outline"
          type="submit"
          disabled={isPending}
        >
          {isPending ? (
            <Spinner />
          ) : (
            <>
              Send <Kbd>⌘ + Enter</Kbd>
            </>
          )}
        </Button>
      </form>

      <KontekstDisplay
        selected={selectedKontekst}
        onSelect={setSelectedKontekst}
      />

      {data && (
        <div className="prose max-w-none max-h-96 overflow-y-auto text-justify w-full mt-16">
          <ReactMarkdown>{data}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
