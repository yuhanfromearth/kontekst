import { Badge } from "./ui/badge";
import { Kbd } from "./ui/kbd";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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

const MODIFIER_KEYS = new Set(["meta", "control", "shift", "alt"]);

function parseShortcut(shortcut: string) {
  const tokens = shortcut.toLowerCase().split("+");
  return {
    meta: tokens.includes("cmd"),
    ctrl: tokens.includes("ctrl"),
    shift: tokens.includes("shift"),
    alt: tokens.includes("alt"),
    letters: tokens.filter((t) => !["cmd", "ctrl", "shift", "alt"].includes(t)),
  };
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
  const [isCmdHeld, setIsCmdHeld] = useState(false);
  const [hoveredKontekst, setHoveredKontekst] = useState<string | null>(null);
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
    const down = (e: KeyboardEvent) => {
      if (e.key === "Meta") setIsCmdHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Meta") setIsCmdHeld(false);
    };
    const blur = () => setIsCmdHeld(false);
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    window.addEventListener("blur", blur);

    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useEffect(() => {
    if (!shortcuts) return;

    const pressedKeys = new Set<string>();

    const keydownHandler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "TEXTAREA") return;
      if (document.activeElement?.tagName === "INPUT") return;

      const key = e.key.toLowerCase();
      if (MODIFIER_KEYS.has(key)) return;

      pressedKeys.add(key);

      // Cmd+key: fire immediately on keydown so we can suppress browser defaults
      if (e.metaKey) {
        for (const [kontekst, shortcut] of Object.entries(shortcuts)) {
          const parsed = parseShortcut(shortcut);
          if (
            parsed.meta &&
            parsed.letters.length === 1 &&
            parsed.letters[0] === key
          ) {
            e.preventDefault();
            onSelect(kontekst);
            pressedKeys.clear();
            return;
          }
        }
      }
    };

    const keyupHandler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "TEXTAREA") return;
      if (document.activeElement?.tagName === "INPUT") return;

      const key = e.key.toLowerCase();
      if (MODIFIER_KEYS.has(key)) return;

      // Non-cmd shortcuts: fire on keyup so the full pressed-key set is known.
      // pressedKeys still contains the releasing key at this point.
      if (!e.metaKey) {
        for (const [kontekst, shortcut] of Object.entries(shortcuts)) {
          const parsed = parseShortcut(shortcut);
          if (parsed.meta) continue;
          if (
            parsed.letters.length === pressedKeys.size &&
            parsed.letters.every((l) => pressedKeys.has(l))
          ) {
            onSelect(kontekst);
            pressedKeys.clear();
            return;
          }
        }
      }

      pressedKeys.delete(key);
    };

    document.addEventListener("keydown", keydownHandler);
    document.addEventListener("keyup", keyupHandler);
    return () => {
      document.removeEventListener("keydown", keydownHandler);
      document.removeEventListener("keyup", keyupHandler);
    };
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
          onMouseEnter={() => setHoveredKontekst(kontekst)}
          onMouseLeave={() => setHoveredKontekst(null)}
          variant={selected === kontekst ? "default" : "outline"}
          className={`gap-1 font-mono transition-opacity ${isCmdHeld && hoveredKontekst === kontekst ? "cursor-alias opacity-70 ring-2 ring-ring/50" : "cursor-pointer"}`}
        >
          {kontekst}
          {shortcuts?.[kontekst] && selected !== kontekst && (
            <ShortcutDisplay shortcut={shortcuts[kontekst]} />
          )}
        </Badge>
      ))}
      <Badge
        title="Create new Kontekst"
        variant="outline"
        className="cursor-pointer font-mono"
        onClick={() =>
          navigate({ to: "/kontekst/$name", params: { name: "new" } })
        }
      >
        +
      </Badge>
    </div>
  );
}
