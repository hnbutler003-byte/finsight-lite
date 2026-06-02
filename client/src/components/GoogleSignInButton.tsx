import { useEffect, useRef, useState } from "react";

interface Props {
  onSuccess: (idToken: string) => void;
  onError?: (msg?: string) => void;
  onUnavailable?: () => void;
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  theme?: "outline" | "filled_blue" | "filled_black";
}

interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      width?: number;
      logo_alignment?: "left" | "center";
    }
  ) => void;
}

interface GoogleWindow extends Window {
  google?: {
    accounts?: {
      id?: GoogleAccountsId;
    };
  };
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  onUnavailable,
  text = "signin_with",
  theme = "outline",
}: Props) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId) {
      setUnavailable(true);
      onUnavailable?.();
      return;
    }

    const initialize = () => {
      const g = (window as GoogleWindow).google?.accounts?.id;
      if (!g) {
        setUnavailable(true);
        onUnavailable?.();
        return;
      }
      g.initialize({
        client_id: clientId,
        callback: (response: GoogleCredentialResponse) => {
          if (response?.credential) {
            onSuccess(response.credential);
          } else {
            onError?.("Google returned no credential.");
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      if (btnRef.current) {
        g.renderButton(btnRef.current, {
          type: "standard",
          theme,
          size: "large",
          text,
          width: btnRef.current.offsetWidth || 320,
          logo_alignment: "left",
        });
        setLoaded(true);
      }
    };

    if ((window as GoogleWindow).google?.accounts?.id) {
      initialize();
    } else {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        existing.addEventListener("load", initialize);
        return () => existing.removeEventListener("load", initialize);
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initialize;
      script.onerror = () => {
        setUnavailable(true);
        onUnavailable?.();
      };
      document.head.appendChild(script);
    }
  }, [clientId]);

  if (unavailable || !clientId) return null;

  return (
    <div className="w-full flex justify-center">
      {!loaded && (
        <div className="w-full h-11 rounded-md bg-white/10 animate-pulse flex items-center justify-center gap-2">
          <div className="w-5 h-5 rounded-full bg-white/20" />
          <div className="w-32 h-3 rounded bg-white/20" />
        </div>
      )}
      <div
        ref={btnRef}
        className="w-full"
        style={{ display: loaded ? "block" : "none" }}
        data-testid="button-google-signin"
      />
    </div>
  );
}
