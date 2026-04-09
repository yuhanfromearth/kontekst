import { Badge } from "./ui/badge";
import { Kbd } from "./ui/kbd";
import { useQuery } from "@tanstack/react-query";

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
  const { data: kontekstList = [], isError } = useQuery({
    queryKey: ["konteksts"],
    queryFn: fetchKonteksts,
  });

  if (isError) return <p>Something went wrong.</p>;

  return (
    <div className="flex w-full mt-8 flex-wrap justify-center gap-2">
      <Badge
        onClick={() => onSelect(undefined)}
        variant={selected === undefined ? "default" : "outline"}
        className="cursor-pointer"
      >
        Bob (default)
      </Badge>
      {kontekstList.map((kontekst) => (
        <Badge
          key={kontekst}
          onClick={() => onSelect(kontekst)}
          variant={selected === kontekst ? "default" : "outline"}
          className="cursor-pointer gap-1"
        >
          {kontekst}
          {shortcuts?.[kontekst] && (
            <ShortcutDisplay shortcut={shortcuts[kontekst]} />
          )}
        </Badge>
      ))}
    </div>
  );
}
