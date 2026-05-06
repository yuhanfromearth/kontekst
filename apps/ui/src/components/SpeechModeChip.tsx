export default function SpeechModeChip() {
  return (
    <span
      className="inline-flex items-center gap-1.5 h-5 px-2 text-[0.7rem] font-medium font-mono text-muted-foreground border border-border rounded-full select-none"
      title="Speech mode"
    >
      <span className="inline-flex items-end gap-px">
        <span className="w-0.5 h-[5px] bg-current rounded-sm" />
        <span className="w-0.5 h-[8px] bg-current rounded-sm" />
        <span className="w-0.5 h-[4px] bg-current rounded-sm" />
        <span className="w-0.5 h-[7px] bg-current rounded-sm" />
      </span>
      speech
    </span>
  );
}
