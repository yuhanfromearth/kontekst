import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Kbd } from "#/components/ui/kbd";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useIsMac } from "#/lib/platform";

export const Route = createFileRoute("/shortcuts")({
  component: ShortcutsPage,
});

interface ShortcutRowProps {
  title: string;
  description: string;
  keys: React.ReactNode;
}

function ShortcutRow({ title, description, keys }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 not-last:border-b border-border">
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="ml-8 flex items-center gap-1 shrink-0">{keys}</div>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
        {title}
      </p>
      <div className="border border-border rounded-xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ShortcutsPage() {
  const router = useRouter();
  const goBack = () => {
    if (router.history.length > 1) router.history.back();
    else router.navigate({ to: "/" });
  };
  const isMac = useIsMac();
  const modGlyph = isMac ? "⌘" : "ctrl";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") goBack();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto px-1">
      <button
        type="button"
        onClick={goBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 -ml-0.5"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>
      <h1 className="font-bold text-3xl mb-1">shortcuts</h1>
      <p className="text-muted-foreground mb-8">
        keyboard shortcuts available throughout kontekst.
      </p>

      <div className="flex flex-col gap-6" hidden={isMac === null}>
        <Section title="Prompt">
          <ShortcutRow
            title="Focus prompt"
            description="From anywhere on the page, jump the cursor into the input."
            keys={<Kbd>/</Kbd>}
          />
          <ShortcutRow
            title="Blur prompt"
            description="Release focus from the textarea without submitting."
            keys={<Kbd>Esc</Kbd>}
          />
          <ShortcutRow
            title="Send message"
            description="Submit your prompt without reaching for the mouse."
            keys={<Kbd>Enter</Kbd>}
          />
          <ShortcutRow
            title="Newline in prompt"
            description="Insert a line break without submitting."
            keys={
              <>
                <Kbd>Shift</Kbd>
                <span className="text-muted-foreground text-sm">+</span>
                <Kbd>Enter</Kbd>
              </>
            }
          />
          <ShortcutRow
            title="New chat"
            description="Cancel any in-flight stream and clear the current conversation."
            keys={
              <>
                <Kbd>{modGlyph}</Kbd>
                <span className="text-muted-foreground text-sm">+</span>
                <Kbd>Shift</Kbd>
                <span className="text-muted-foreground text-sm">+</span>
                <Kbd>K</Kbd>
              </>
            }
          />
        </Section>

        <Section title="Konteksts">
          <ShortcutRow
            title="Switch kontekst"
            description={`Activate a kontekst by its assigned shortcut key. Set these in the editor. Supports letters, numbers, combos (a+b), or ${isMac ? "Cmd" : "Ctrl"}+key (${modGlyph}+a).`}
            keys={
              <>
                <Kbd>a</Kbd>
                <span className="text-muted-foreground text-sm">/</span>
                <Kbd>a</Kbd>
                <span className="text-muted-foreground text-sm">+</span>
                <Kbd>b</Kbd>
                <span className="text-muted-foreground text-sm">/</span>
                <Kbd>{modGlyph}</Kbd>
                <span className="text-muted-foreground text-sm">+</span>
                <Kbd>a</Kbd>
              </>
            }
          />
          <ShortcutRow
            title="Edit kontekst"
            description={`Hold ${modGlyph} and click any kontekst badge to open its editor.`}
            keys={
              <>
                <Kbd>{modGlyph}</Kbd>
                <span className="text-muted-foreground text-sm">+</span>
                <Kbd>click</Kbd>
              </>
            }
          />
          <ShortcutRow
            title="Save kontekst"
            description="Create or update a kontekst from the editor."
            keys={
              <>
                <Kbd>{modGlyph}</Kbd>
                <span className="text-muted-foreground text-sm">+</span>
                <Kbd>Enter</Kbd>
              </>
            }
          />
        </Section>

        <Section title="Speech">
          <ShortcutRow
            title="Switch voice"
            description="Activate a voice by its assigned shortcut on the speech page. Set per voice in the voice editor."
            keys={
              <>
                <Kbd>a</Kbd>
                <span className="text-muted-foreground text-sm">/</span>
                <Kbd>a</Kbd>
                <span className="text-muted-foreground text-sm">+</span>
                <Kbd>b</Kbd>
                <span className="text-muted-foreground text-sm">/</span>
                <Kbd>{modGlyph}</Kbd>
                <span className="text-muted-foreground text-sm">+</span>
                <Kbd>a</Kbd>
              </>
            }
          />
          <ShortcutRow
            title="Edit voice"
            description={`Hold ${modGlyph} and click any voice badge to open its editor (name, shortcut, default).`}
            keys={
              <>
                <Kbd>{modGlyph}</Kbd>
                <span className="text-muted-foreground text-sm">+</span>
                <Kbd>click</Kbd>
              </>
            }
          />
        </Section>

        <Section title="Navigation">
          <ShortcutRow
            title="Go back"
            description="Close the kontekst editor and return to the main chat."
            keys={<Kbd>Esc</Kbd>}
          />
        </Section>
      </div>

      <p className="text-sm text-muted-foreground mt-10 mb-4">
        Kontekst shortcuts are inactive while a text field is focused.
      </p>
    </div>
  );
}
