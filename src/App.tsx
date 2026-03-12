import { SignIn, UserButton, useAuth } from "@clerk/react";
import { useEffect, useState } from "react";

import { apiUrl } from "./lib/api";
import type { ApiFetch } from "./types";
import WorkshopPage from "./WorkshopPage";

type AccessState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "forbidden"; email: string | null }
  | { status: "ready"; email: string | null }
  | { status: "error"; message: string };

type SessionResponse = {
  authenticated?: boolean;
  allowed?: boolean;
  email?: string | null;
  error?: string;
};

export default function App() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [accessState, setAccessState] = useState<AccessState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function loadSession(): Promise<void> {
      if (!isLoaded) {
        return;
      }

      if (!isSignedIn) {
        if (active) {
          setAccessState({ status: "signed-out" });
        }
        return;
      }

      if (active) {
        setAccessState({ status: "loading" });
      }

      try {
        const token = await getToken();
        const headers = new Headers();

        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }

        const response = await fetch(apiUrl("/api/session"), {
          headers,
          cache: "no-store",
        });
        const data = (await response.json().catch(() => ({}))) as SessionResponse;

        if (!active) {
          return;
        }

        if (response.status === 401) {
          setAccessState({ status: "signed-out" });
          return;
        }

        if (response.status === 403) {
          setAccessState({ status: "forbidden", email: data.email ?? null });
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || "Failed to load session");
        }

        setAccessState({ status: "ready", email: data.email ?? null });
      } catch (error) {
        if (!active) {
          return;
        }

        setAccessState({
          status: "error",
          message:
            error instanceof Error ? error.message : "Failed to load session",
        });
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [getToken, isLoaded, isSignedIn]);

  const apiFetch: ApiFetch = async (path, init = {}) => {
    const token = await getToken();
    const headers = new Headers(init.headers);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(apiUrl(path), {
      ...init,
      headers,
      cache: init.cache ?? "no-store",
    });

    if (response.status === 401) {
      setAccessState({ status: "signed-out" });
    } else if (response.status === 403) {
      const data = (await response.clone().json().catch(() => ({}))) as SessionResponse;
      setAccessState({ status: "forbidden", email: data.email ?? null });
    }

    return response;
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-black/10 bg-white/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-950">Nano Banana</h1>
            <p className="text-sm text-gray-500">Private workshop playground</p>
          </div>
          <div className="flex items-center gap-3">
            {!isSignedIn && (
              <p className="text-sm text-gray-500">Authorized access only</p>
            )}
            {isSignedIn && (
              <UserButton />
            )}
          </div>
        </div>
      </header>

      {accessState.status === "loading" && <LoadingState />}
      {accessState.status === "signed-out" && <SignInState />}
      {accessState.status === "forbidden" && (
        <UnauthorizedState email={accessState.email} />
      )}
      {accessState.status === "error" && (
        <MessageState
          title="Unable to Load Session"
          body={accessState.message}
          tone="error"
        />
      )}
      {accessState.status === "ready" && (
        <WorkshopPage apiFetch={apiFetch} />
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <MessageState
      title="Loading Workshop"
      body="Checking your session and permissions."
      tone="neutral"
    />
  );
}

function SignInState() {
  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-10">
      <div className="panel-surface w-full max-w-md rounded-3xl p-6">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-amber-700">
          Private Workshop
        </p>
        <h2 className="mb-3 text-3xl font-semibold text-gray-950">
          Sign in to Nano Banana
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          Access is limited to the internal allowlist for this workshop.
        </p>
        <SignIn fallbackRedirectUrl="/" />
      </div>
    </div>
  );
}

function UnauthorizedState({ email }: { email: string | null }) {
  return (
    <MessageState
      title="Access Denied"
      body={
        email
          ? `${email} is not authorized to access this application.`
          : "Your email address is not authorized to access this application."
      }
      tone="error"
    />
  );
}

function MessageState(props: {
  title: string;
  body: string;
  tone: "error" | "neutral";
}) {
  const titleClass =
    props.tone === "error" ? "text-red-600" : "text-gray-950";

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-10">
      <div className="panel-surface w-full max-w-md rounded-3xl p-8">
        <h2 className={`mb-4 text-2xl font-semibold ${titleClass}`}>
          {props.title}
        </h2>
        <p className="text-gray-700">{props.body}</p>
      </div>
    </div>
  );
}
