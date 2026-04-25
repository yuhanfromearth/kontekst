export default function KontekstLogo({ className }: { className?: string }) {
  return (
    <span
      className={`font-sans font-medium leading-none text-2xl ${className ?? ""}`}
    >
      <span style={{ color: "oklch(0.6 0.18 265)" }}>k</span>
      <span className="text-foreground">ontekst</span>
      <span className="text-muted-foreground">.</span>
    </span>
  );
}
