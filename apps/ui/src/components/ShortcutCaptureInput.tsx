import { useRef, useState } from "react";
import { Input } from "#/components/ui/input";
import { shortcutValidationError } from "#/lib/shortcut";
import { useIsMac } from "#/lib/platform";

interface ShortcutCaptureInputProps {
  value: string;
  onChange: (v: string) => void;
  onError: (e: string | null) => void;
}

export function ShortcutCaptureInput({
  value,
  onChange,
  onError,
}: ShortcutCaptureInputProps) {
  const isMac = useIsMac();
  const modKeyName = isMac ? "Meta" : "Control";
  const modToken = isMac ? "cmd" : "ctrl";
  const otherModKeys = isMac ? ["Control", "Shift", "Alt"] : ["Meta", "Shift", "Alt"];

  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState("");
  const pressedLetters = useRef<Set<string>>(new Set());
  const modHeld = useRef(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    if (e.key === "Escape") {
      pressedLetters.current.clear();
      modHeld.current = false;
      setPreview("");
      return;
    }

    if (e.key === "Backspace" || e.key === "Delete") {
      onChange("");
      onError(null);
      pressedLetters.current.clear();
      setPreview("");
      return;
    }

    if (e.key === modKeyName) {
      // Sticky toggle: press+release the modifier first, then the letter, so the
      // browser never sees Mod+letter as a chord (prevents new-tab, etc.)
      modHeld.current = !modHeld.current;
      setPreview(modHeld.current ? `${modToken}+...` : "");
      return;
    }

    if (otherModKeys.includes(e.key)) {
      onError(shortcutValidationError());
      return;
    }

    const key = e.key.toLowerCase();
    if (!/^[a-z0-9]$/.test(key)) {
      onError(shortcutValidationError());
      return;
    }

    if (modHeld.current) {
      onChange(`${modToken}+${key}`);
      onError(null);
      modHeld.current = false;
      pressedLetters.current.clear();
      setPreview("");
    } else {
      pressedLetters.current.add(key);
      setPreview(Array.from(pressedLetters.current).sort().join("+"));
      onError(null);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // The modifier is sticky (handled on keydown); ignore modifier releases.
    if (["Meta", "Control", "Shift", "Alt"].includes(e.key)) return;

    const key = e.key.toLowerCase();
    if (pressedLetters.current.has(key) && pressedLetters.current.size > 0) {
      const sc = Array.from(pressedLetters.current).sort().join("+");
      onChange(sc);
      pressedLetters.current.clear();
      setPreview("");
    }
  };

  const handleBlur = () => {
    setCapturing(false);
    pressedLetters.current.clear();
    if (modHeld.current) {
      modHeld.current = false;
      setPreview("");
    }
  };

  const displayValue = capturing && preview ? preview : value;

  return (
    <Input
      id="shortcut"
      value={displayValue}
      readOnly
      placeholder="Click and press shortcut…"
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onFocus={() => setCapturing(true)}
      onBlur={handleBlur}
      className={capturing ? "ring-2 ring-ring" : ""}
    />
  );
}
