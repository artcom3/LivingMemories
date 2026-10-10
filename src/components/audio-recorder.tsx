"use client";
import { Button } from "@/components/ui/button";
import { Feedback } from "@/components/private/content-primitives";
import { useEffect, useRef, useState } from "react";
import { useCelebrate } from "@/components/motion/celebrate";
import { LiveWave } from "@/components/motion/live-wave";
export function AudioRecorder({
  disabled,
  onSave,
}: {
  disabled: boolean;
  onSave: (file: File) => Promise<boolean>;
}) {
  const celebrate = useCelebrate();
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  // The open microphone, for the live wave while recording.
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
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
          "This browser cannot record audio. You can upload a recording from your device.",
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
        setLiveStream(null);
        stream.current?.getTracks().forEach((track) => track.stop());
      };
      recorder.current = next;
      preview(null);
      setSeconds(0);
      recordingStarted.current = Date.now();
      next.start();
      setRecording(true);
      setLiveStream(stream.current);
    } catch (error) {
      stream.current?.getTracks().forEach((track) => track.stop());
      setError(
        error instanceof Error && error.message.includes("navegador")
          ? error.message
          : "We could not access your microphone. Allow access or upload a saved recording.",
      );
    }
  }
  return (
    <div className="recording-panel">
      <h3>Record a memory</h3>
      <p className="form-hint">
        You can listen to your recording before saving it. Up to 30 minutes.
      </p>
      <div className="row-actions">
        {recording ? (
          <Button
            type="button"
            onClick={() => recorder.current?.stop()}
            variant="outline"
          >
            Stop recording · {Math.floor(seconds / 60)}:
            {String(seconds % 60).padStart(2, "0")}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={disabled}
            onClick={() => void start()}
            variant="outline"
          >
            {audio ? "Record again" : "Start recording"}
          </Button>
        )}
      </div>
      {recording && liveStream ? <LiveWave stream={liveStream} /> : null}
      {url ? (
        <>
          <audio src={url} controls />
          <Button
            type="button"
            disabled={disabled}
            onClick={async (event) => {
              const button = event.currentTarget;
              const extension = audio!.type.includes("mp4") ? "m4a" : "webm";
              if (
                await onSave(
                  new File(
                    [audio!],
                    "Recording-" + Date.now() + "." + extension,
                    { type: audio!.type },
                  ),
                )
              ) {
                celebrate(button);
                preview(null);
              }
            }}
            variant="default"
          >
            Save recording
          </Button>
        </>
      ) : null}
      {error ? (
        <Feedback role="alert" className="error">
          {error}
        </Feedback>
      ) : null}
    </div>
  );
}
