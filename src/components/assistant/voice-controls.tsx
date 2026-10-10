"use client";
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
  useConversationInput,
  useConversationMode,
} from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pauseForAssistant } from "./provider";
type Props = {
  familyId: string;
  contextKey: string;
  reset: number;
  language: "es" | "en";
  ensureConversation: () => Promise<{ id: string; contextRevision: number }>;
  onRefresh: () => Promise<void>;
  onError: (value: string) => void;
  onActive: (value: boolean) => void;
};
type Session = { id: string; conversationId: string; familyId: string };
function Controls(props: Props) {
  const { startSession, endSession } = useConversationControls();
  const { status } = useConversationStatus();
  const { isMuted, setMuted } = useConversationInput();
  const { isSpeaking } = useConversationMode();
  const [starting, setStarting] = useState(false);
  const [connected, setConnected] = useState(false);
  const session = useRef<Session | null>(null);
  const generation = useRef(0);
  const lastActivity = useRef(0);
  const startedAt = useRef(0);
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  }, [props]);
  const end = useCallback(() => {
    generation.current++;
    endSession();
    setConnected(false);
    setStarting(false);
    propsRef.current.onActive(false);
    const current = session.current;
    session.current = null;
    if (current)
      void fetch(
        `/api/families/${current.familyId}/assistant/conversations/${current.conversationId}/voice/${current.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      ).catch(() => {});
  }, [endSession]);
  useEffect(
    () => () => end(),
    [props.reset, props.contextKey, props.familyId, end],
  );
  useEffect(() => {
    const sync = () => {
      if (status === "connected") {
        setConnected(true);
        setStarting(false);
        props.onActive(true);
      } else if (status === "disconnected" && session.current) end();
    };
    const timer = setTimeout(sync, 0);
    return () => clearTimeout(timer);
  }, [status, end, props]);
  useEffect(() => {
    const activity = () => {
      lastActivity.current = Date.now();
      void propsRef.current.onRefresh();
    };
    window.addEventListener("livingmemories:voice-message", activity);
    window.addEventListener("livingmemories:voice-error", end);
    const timer = setInterval(() => {
      if (
        session.current &&
        (Date.now() - startedAt.current > 300000 ||
          Date.now() - lastActivity.current > 60000)
      )
        end();
    }, 1000);
    const hidden = () => {
      if (document.hidden) end();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("livingmemories:voice-message", activity);
      window.removeEventListener("livingmemories:voice-error", end);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [end]);
  async function start() {
    if (starting || connected) return;
    setStarting(true);
    props.onActive(true);
    props.onError("");
    pauseForAssistant();
    const revision = ++generation.current;
    try {
      // Ask for the microphone before reserving provider spend.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      if (revision !== generation.current) return;
      const conversation = await props.ensureConversation();
      const response = await fetch(
        `/api/families/${props.familyId}/assistant/conversations/${conversation.id}/voice`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      );
      const value = await response.json();
      if (!response.ok) throw new Error(value.message || "Voice unavailable.");
      session.current = {
        id: value.id,
        conversationId: conversation.id,
        familyId: props.familyId,
      };
      if (revision !== generation.current) {
        end();
        return;
      }
      startedAt.current = Date.now();
      lastActivity.current = Date.now();
      await startSession({
        signedUrl: value.signedUrl,
        connectionType: "websocket",
        customLlmExtraBody: { assistant_session: value.token },
        overrides: { agent: { language: props.language } },
      });
    } catch (e) {
      if (revision === generation.current) {
        end();
        props.onError(
          (e as Error).name === "NotAllowedError"
            ? props.language === "es"
              ? "Micrófono no autorizado. Puedes escribir tu pregunta."
              : "Microphone access was denied. You can write your question."
            : (e as Error).message,
        );
      }
    }
  }
  const es = props.language === "es";
  return (
    <div className="assistant-voice">
      {connected ? (
        <>
          <span role="status">
            {isMuted
              ? es
                ? "Silenciado"
                : "Muted"
              : isSpeaking
                ? es
                  ? "Respondiendo"
                  : "Speaking"
                : es
                  ? "Escuchando"
                  : "Listening"}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label={
              isMuted
                ? es
                  ? "Activar micrófono"
                  : "Unmute microphone"
                : es
                  ? "Silenciar micrófono"
                  : "Mute microphone"
            }
            onClick={() => setMuted(!isMuted)}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={
              es ? "Finalizar conversación de voz" : "End voice conversation"
            }
            onClick={end}
          >
            <PhoneOff />
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          disabled={starting}
          onClick={() => void start()}
        >
          <Mic aria-hidden="true" />
          {starting
            ? es
              ? "Conectando…"
              : "Connecting…"
            : es
              ? "Conversar"
              : "Talk"}
        </Button>
      )}
    </div>
  );
}
export default function VoiceControls(props: Props) {
  return (
    <ConversationProvider
      onMessage={() =>
        window.dispatchEvent(new Event("livingmemories:voice-message"))
      }
      onError={() => {
        window.dispatchEvent(new Event("livingmemories:voice-error"));
        props.onError(
          props.language === "es"
            ? "La voz se desconectó. Puedes continuar por texto."
            : "Voice disconnected. You can continue by text.",
        );
        props.onActive(false);
      }}
    >
      <Controls {...props} />
    </ConversationProvider>
  );
}
