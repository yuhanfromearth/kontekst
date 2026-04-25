import { useEffect, useState } from "react";

export function detectIsMac(): boolean {
  if (typeof navigator === "undefined") return true;

  // userAgentData still experimental, not part of lib.dom.d.ts yet
  const uaData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData;
  const platform =
    uaData?.platform ?? navigator.platform ?? navigator.userAgent ?? "";

  return /mac|iphone|ipad|ipod/i.test(platform);
}

export function useIsMac(): boolean {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => setIsMac(detectIsMac()), []);
  return isMac;
}

export function isModifierEvent(e: {
  metaKey: boolean;
  ctrlKey: boolean;
}): boolean {
  return detectIsMac() ? e.metaKey : e.ctrlKey;
}

export function isModifierKeyName(key: string): boolean {
  return detectIsMac() ? key === "Meta" : key === "Control";
}
