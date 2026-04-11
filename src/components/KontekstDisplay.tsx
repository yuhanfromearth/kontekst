import { Badge } from "./ui/badge";
import { Kbd } from "./ui/kbd";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

interface KontekstDisplayProps {
  selected?: string;
  onSelect: (kontekst: string | undefined) => void;
  shortcuts?: Record<string, string>;
}

async function fetchKonteksts(): Promise<string[]> {
  const res = await fetch("/api/konteksts");
  if (!res.ok) throw new Error("Failed to fetch konteksts");
  return res.json();
}

function parseShortcut(shortcut: string) {
  const tokens = shortcut.toLowerCase().split("+");
  return {
    meta: tokens.includes("cmd"),
    ctrl: tokens.includes("ctrl"),
    shift: tokens.includes("shift"),
    alt: tokens.includes("alt"),
    key: tokens.find((t) => !["cmd", "ctrl", "shift", "alt"].includes(t)),
  };
}

function matchesShortcut(e: KeyboardEvent, shortcut: string) {
  const parsed = parseShortcut(shortcut);
  return (
    e.metaKey === parsed.meta &&
    e.ctrlKey === parsed.ctrl &&
    e.shiftKey === parsed.shift &&
    e.altKey === parsed.alt &&
    e.key.toLowerCase() === parsed.key
  );
}

function ShortcutDisplay({ shortcut }: { shortcut: string }) {
  const keys = shortcut.split("+");
  return (
    <>
      {keys.map((key, i) => (
        <span key={i}>
          {i > 0 && "+"}
          <Kbd>{key}</Kbd>
        </span>
      ))}
    </>
  );
}

export default function KontekstDisplay({
  selected,
  onSelect,
  shortcuts,
}: KontekstDisplayProps) {
  const navigate = useNavigate();
  const { data: kontekstList = [], isError } = useQuery({
    queryKey: ["konteksts"],
    queryFn: fetchKonteksts,
  });

  useEffect(() => {
    if (selected === undefined && kontekstList.length > 0) {
      onSelect(kontekstList[0]);
    }
  }, [kontekstList, selected, onSelect]);

  useEffect(() => {
    if (!shortcuts) return;

    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "TEXTAREA") return;

      for (const [kontekst, shortcut] of Object.entries(shortcuts)) {
        if (matchesShortcut(e, shortcut)) {
          e.preventDefault();
          onSelect(kontekst);
          return;
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [shortcuts, onSelect, selected]);

  if (isError) return <p>Something went wrong.</p>;

  return (
    <div className="flex w-full mt-8 flex-wrap justify-center gap-2">
      {kontekstList.map((kontekst) => (
        <Badge
          key={kontekst}
          onClick={(e) => {
            if (e.metaKey) {
              e.preventDefault();
              navigate({ to: "/kontekst/$name", params: { name: kontekst } });
            } else {
              onSelect(kontekst);
            }
          }}
          variant={selected === kontekst ? "default" : "outline"}
          className="cursor-pointer gap-1"
        >
          {kontekst}
          {shortcuts?.[kontekst] && selected !== kontekst && (
            <ShortcutDisplay shortcut={shortcuts[kontekst]} />
          )}
        </Badge>
      ))}
    </div>
  );
}
