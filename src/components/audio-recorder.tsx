"use client";
import { useEffect, useRef, useState } from "react";
export function AudioRecorder({
  disabled,
  onSave,
}: {
  disabled: boolean;
  onSave: (file: File) => Promise<boolean>;
}) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const previewUrl = useRef("");
  const recordingStarted = useRef(0);
  function preview(blob: Blob | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = blob ? URL.createObjectURL(blob) : "";
    setAudio(blob);
    setUrl(previewUrl.current);
  }
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      const elapsed = Math.min(
        1800,
        Math.floor((Date.now() - recordingStarted.current) / 1000),
      );
      setSeconds(elapsed);
      if (elapsed >= 1800 && recorder.current?.state === "recording")
        recorder.current.stop();
    }, 1000);
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      stream.current?.getTracks().forEach((track) => track.stop());
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );
  async function start() {
    setError("");
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Este navegador no puede grabar. Puedes subir un audio desde tu dispositivo.",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mime = ["audio/webm;codecs=opus", "audio/mp4"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const next = new MediaRecorder(
        stream.current,
        mime ? { mimeType: mime } : undefined,
      );
      const chunks: BlobPart[] = [];
      next.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      next.onstop = () => {
        preview(new Blob(chunks, { type: next.mimeType }));
        setRecording(false);
        stream.current?.getTracks().forEach((track) => track.stop());
      };
      recorder.current = next;
      preview(null);
      setSeconds(0);
      recordingStarted.current = Date.now();
      next.start();
      setRecording(true);
    } catch (error) {
      stream.current?.getTracks().forEach((track) => track.stop());
      setError(
        error instanceof Error && error.message.includes("navegador")
          ? error.message
          : "No pudimos acceder al micrófono. Permite su uso o sube un audio guardado.",
      );
    }
  }
  return (
    <div className="recording-panel">
      <h3>Grabar un recuerdo</h3>
      <p className="form-hint">
        Puedes escuchar tu grabación antes de guardarla. Hasta 30 minutos.
      </p>
      <div className="row-actions">
        {recording ? (
          <button
            type="button"
            className="button secondary"
            onClick={() => recorder.current?.stop()}
          >
            Detener grabación · {Math.floor(seconds / 60)}:
            {String(seconds % 60).padStart(2, "0")}
          </button>
        ) : (
          <button
            type="button"
            className="button secondary"
            disabled={disabled}
            onClick={() => void start()}
          >
            {audio ? "Volver a grabar" : "Empezar a grabar"}
          </button>
        )}
      </div>
      {url ? (
        <>
          <audio src={url} controls />
          <button
            type="button"
            className="button primary"
            disabled={disabled}
            onClick={async () => {
              const extension = audio!.type.includes("mp4") ? "m4a" : "webm";
              if (
                await onSave(
                  new File(
                    [audio!],
                    "Grabación-" + Date.now() + "." + extension,
                    { type: audio!.type },
                  ),
                )
              ) {
                preview(null);
              }
            }}
          >
            Guardar grabación
          </button>
        </>
      ) : null}
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
