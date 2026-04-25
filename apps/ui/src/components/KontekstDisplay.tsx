import { Badge } from "./ui/badge";
import { Kbd } from "./ui/kbd";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useIsMac } from "#/lib/platform";

interface KontekstDisplayProps {
  kontekstList: string[];
  isError?: boolean;
  selected?: string;
  onSelect: (kontekst: string | undefined) => void;
  shortcuts?: Record<string, string>;
}

const MODIFIER_KEYS = new Set(["meta", "control", "shift", "alt"]);

function parseShortcut(shortcut: string) {
  const tokens = shortcut.toLowerCase().split("+");
  return {
    mod: tokens.includes("cmd") || tokens.includes("ctrl"),
    shift: tokens.includes("shift"),
    alt: tokens.includes("alt"),
    letters: tokens.filter((t) => !["cmd", "ctrl", "shift", "alt"].includes(t)),
  };
}

function ShortcutDisplay({
  shortcut,
  isMac,
}: {
  shortcut: string;
  isMac: boolean;
}) {
  const keys = shortcut.split("+").map((k) => {
    const lower = k.toLowerCase();
    if (lower === "cmd" || lower === "ctrl") return isMac ? "⌘" : "ctrl";
    return k;
  });
  return (
    <>
      <Kbd className="w-fit h-fit">{keys.join(" + ")}</Kbd>
    </>
  );
}

export default function KontekstDisplay({
  kontekstList,
  isError,
  selected,
  onSelect,
  shortcuts,
}: KontekstDisplayProps) {
  const navigate = useNavigate();
  const isMac = useIsMac();
  const [isModHeld, setIsModHeld] = useState(false);
  const [hoveredKontekst, setHoveredKontekst] = useState<string | null>(null);

  // Auto-select the default kontekst (first in list) only when there is no
  // existing selection — i.e. on first load. After that, the user's explicit
  // selection takes precedence and should not be overwritten on refetch.
  const firstKontekst = kontekstList[0];
  useEffect(() => {
    if (firstKontekst !== undefined && selected === undefined) {
      onSelect(firstKontekst);
    }
  }, [firstKontekst]);

  useEffect(() => {
    const modKeyName = isMac ? "Meta" : "Control";
    const down = (e: KeyboardEvent) => {
      if (e.key === modKeyName) setIsModHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === modKeyName) setIsModHeld(false);
    };
    const blur = () => setIsModHeld(false);
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    window.addEventListener("blur", blur);

    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [isMac]);

  useEffect(() => {
    if (!shortcuts) return;

    const pressedKeys = new Set<string>();

    const isModEvent = (e: KeyboardEvent) => (isMac ? e.metaKey : e.ctrlKey);

    const keydownHandler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "TEXTAREA") return;
      if (document.activeElement?.tagName === "INPUT") return;

      const key = e.key.toLowerCase();
      if (MODIFIER_KEYS.has(key)) return;

      pressedKeys.add(key);

      // Mod+key: fire immediately on keydown so we can suppress browser defaults
      if (isModEvent(e)) {
        for (const [kontekst, shortcut] of Object.entries(shortcuts)) {
          const parsed = parseShortcut(shortcut);
          if (
            parsed.mod &&
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

      // Non-mod shortcuts: fire on keyup so the full pressed-key set is known.
      // pressedKeys still contains the releasing key at this point.
      if (!isModEvent(e)) {
        for (const [kontekst, shortcut] of Object.entries(shortcuts)) {
          const parsed = parseShortcut(shortcut);
          if (parsed.mod) continue;
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
  }, [shortcuts, onSelect, selected, isMac]);

  if (isError) return <p>Something went wrong.</p>;

  return (
    <div className="flex w-full mt-8 flex-wrap justify-center gap-2">
      {kontekstList.map((kontekst) => (
        <Badge
          key={kontekst}
          onClick={(e) => {
            const modClick = isMac ? e.metaKey : e.ctrlKey;
            if (modClick) {
              e.preventDefault();
              navigate({ to: "/kontekst/$name", params: { name: kontekst } });
            } else {
              onSelect(kontekst);
            }
          }}
          onMouseEnter={() => setHoveredKontekst(kontekst)}
          onMouseLeave={() => setHoveredKontekst(null)}
          variant={selected === kontekst ? "default" : "outline"}
          className={`gap-1 font-mono ${isModHeld && hoveredKontekst === kontekst ? "cursor-alias opacity-70 ring-2 ring-ring/50" : "cursor-pointer"} ${selected === kontekst ? "transition-opacity" : "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-95"}`}
        >
          {kontekst}
          {shortcuts?.[kontekst] && selected !== kontekst && (
            <ShortcutDisplay shortcut={shortcuts[kontekst]} isMac={isMac} />
          )}
        </Badge>
      ))}
      <Badge
        title="Create new Kontekst"
        variant="outline"
        className="cursor-pointer font-mono hover:bg-accent transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 active:scale-95"
        onClick={() =>
          navigate({ to: "/kontekst/$name", params: { name: "new" } })
        }
      >
        +
      </Badge>
    </div>
  );
}
