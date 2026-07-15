import { useState, useEffect } from "react";
import { X, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "finsight_a2hs_dismissed";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isMobileBrowser(): boolean {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const { dismissedAt } = JSON.parse(raw);
    return typeof dismissedAt === "number" && Date.now() - dismissedAt < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function InstallPromptBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    if (isInStandaloneMode() || !isMobileBrowser() || isDismissed()) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const t = setTimeout(() => setVisible(true), 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearTimeout(t);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify({ dismissedAt: Date.now() }));
    } catch {}
  }

  async function handleNativeInstall() {
    if (!deferredPrompt) return;
    (deferredPrompt as any).prompt();
    const { outcome } = await (deferredPrompt as any).userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  }

  if (!visible) return null;

  const ios = isIOS();
  const canNativeInstall = !ios && !!deferredPrompt;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 animate-bounce-in sm:max-w-sm sm:left-auto sm:right-4"
      data-testid="banner-install-prompt"
    >
      <div className="glass-card rounded-glass p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <img
            src="/icon-192.png"
            alt="FinSight Lite"
            className="w-9 h-9 rounded-xl shrink-0 mt-0.5"
            data-testid="img-install-icon"
          />
          <div className="flex-1 min-w-0">
            <p
              className="font-display text-sm font-bold text-foreground leading-snug"
              data-testid="text-install-heading"
            >
              Add FinSight Lite to your home screen
            </p>

            {ios ? (
              <p
                className="font-sans text-xs text-muted-foreground mt-1 leading-relaxed"
                data-testid="text-install-ios"
              >
                Tap{" "}
                <ArrowUpFromLine
                  className="w-3 h-3 inline-block align-middle"
                  aria-hidden="true"
                />{" "}
                Share, then choose "Add to Home Screen"
              </p>
            ) : canNativeInstall ? (
              <p
                className="font-sans text-xs text-muted-foreground mt-1"
                data-testid="text-install-android"
              >
                Get quick access from your home screen.
              </p>
            ) : (
              <p
                className="font-sans text-xs text-muted-foreground mt-1 leading-relaxed"
                data-testid="text-install-android-manual"
              >
                Open your browser menu and tap "Add to Home Screen"
              </p>
            )}

            {canNativeInstall && (
              <Button
                size="sm"
                className="mt-2 h-7 rounded-xl text-xs px-3"
                onClick={handleNativeInstall}
                data-testid="button-install-android"
              >
                Add to Home Screen
              </Button>
            )}
          </div>

          <button
            onClick={dismiss}
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors mt-0.5"
            aria-label="Dismiss install prompt"
            data-testid="button-dismiss-install"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
