import type { SpeechFormat } from "@kontekst/dtos";

interface FormatToggleProps {
  value: SpeechFormat;
  onChange: (value: SpeechFormat) => void;
}

const OPTIONS: SpeechFormat[] = ["mp3", "pcm"];

export default function FormatToggle({ value, onChange }: FormatToggleProps) {
  return (
    <div className="inline-flex items-center border border-border rounded-full p-0.5 h-6">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`h-[18px] px-2 rounded-full font-mono text-[0.7rem] font-medium transition-colors cursor-pointer ${
            value === opt
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
