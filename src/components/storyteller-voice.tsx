"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MicIcon, SquareIcon, UploadIcon, AudioLinesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { FormField } from "@/components/private/form-field";
import { Feedback } from "@/components/private/content-primitives";
import { useConfirmation } from "@/components/private/confirmation-provider";
import { LiveWave } from "@/components/motion/live-wave";
import { VOICE_MIN_SECONDS, VOICE_MAX_SECONDS, VOICE_MAX_BYTES, voiceReadingText, voicePreviewText } from "@/lib/voices/shared";
import "./storyteller-voice.css";
type Profile = { id: string; name: string; voiceStatus: string; voiceLanguage: string | null; voicePreviewKey: string | null };
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
export function StorytellerVoice({ familyId, profile, onClose }: { familyId: string; profile: Profile; onClose: () => void }) {
  const router = useRouter();
  const confirm = useConfirmation();
  const [language, setLanguage] = useState<"es" | "en">(profile.voiceLanguage === "en" ? "en" : "es");
  const [phase, setPhase] = useState<"idle" | "permission" | "recording" | "saving">("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [recordedSeconds, setRecordedSeconds] = useState<number | null>(null);
  const [sampleUrl, setSampleUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLanguages, setPreviewLanguages] = useState<string[]>(profile.voicePreviewKey ? [profile.voiceLanguage || "es"] : []);
  const recorder = useRef<MediaRecorder | null>(null);
  const activeStream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const objectUrl = useRef("");
  const endpoint = `/api/families/${familyId}/profiles/${profile.id}/voice`;
  const saved = ["READY", "VERIFICATION_REQUIRED", "REMOVAL_FAILED", "REMOVING"].includes(profile.voiceStatus);
  const recording = phase === "recording";
  const busy = phase === "saving" || phase === "permission";
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearInterval(timer.current);
      if (deadline.current) clearTimeout(deadline.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      activeStream.current?.getTracks().forEach(track => track.stop());
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);
  function chooseFile(next: File | null) {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = next ? URL.createObjectURL(next) : "";
    setSampleUrl(objectUrl.current); setFile(next);
  }
  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }
  async function start() {
    if (phase !== "idle") return;
    setError(""); setNotice(""); setPhase("permission");
    let microphone: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
        throw new Error("Recording is unavailable in this browser. Upload an audio sample instead.");
      microphone = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      if (!mounted.current) { microphone.getTracks().forEach(t => t.stop()); return; }
      activeStream.current = microphone;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(t => MediaRecorder.isTypeSupported(t));
      const device = new MediaRecorder(microphone, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 128000 });
      const chunks: BlobPart[] = [];
      const started = Date.now();
      recorder.current = device;
      device.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      device.onstop = () => {
        if (timer.current) clearInterval(timer.current);
        if (deadline.current) clearTimeout(deadline.current);
        microphone?.getTracks().forEach(t => t.stop());
        activeStream.current = null;
        if (!mounted.current) return;
        const elapsed = Math.min(VOICE_MAX_SECONDS, (Date.now() - started) / 1000);
        const type = device.mimeType || mime || "audio/webm";
        chooseFile(new File(chunks, type.includes("mp4") ? "voice.m4a" : type.includes("ogg") ? "voice.ogg" : "voice.webm", { type }));
        setRecordedSeconds(elapsed); setSeconds(Math.floor(elapsed)); setStream(null); setPhase("idle");
        if (elapsed < VOICE_MIN_SECONDS) setError("This take is too short. Read for at least one minute, then record again.");
      };
      device.onerror = () => { setError("Recording was interrupted. Please record a new take."); stop(); };
      device.start(1000);
      chooseFile(null); setConsent(false); setRecordedSeconds(null); setSeconds(0); setStream(microphone); setPhase("recording");
      timer.current = setInterval(() => setSeconds(Math.min(VOICE_MAX_SECONDS, Math.floor((Date.now() - started) / 1000))), 500);
      deadline.current = setTimeout(() => device.state === "recording" && device.stop(), VOICE_MAX_SECONDS * 1000);
    } catch (e) {
      microphone?.getTracks().forEach(t => t.stop());
      activeStream.current = null;
      if (!mounted.current) return;
      setPhase("idle");
      setError(e instanceof Error && e.name === "NotAllowedError" ? "Allow microphone access to record, or upload an audio sample." : e instanceof Error ? e.message : "The microphone could not start.");
    }
  }
  async function create() {
    if (!file || !consent || phase !== "idle") return;
    setPhase("saving"); setError(""); setNotice("");
    const data = new FormData();
    data.set("file", file); data.set("consent", "true"); data.set("language", language);
    try {
      const response = await fetch(endpoint, { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Voice creation could not finish.");
      setNotice(result.status === "VERIFICATION_REQUIRED" ? "ElevenLabs requires verification before this voice can narrate stories. Complete verification in your ElevenLabs account."
        : result.previewAvailable ? "Your voice is ready. New stories from this storyteller's memories will use it." : "Your voice is saved. The listening preview could not be generated, but the voice is available for new stories.");
      chooseFile(null); setConsent(false); setPreviewLanguages(result.previewAvailable ? [language] : []); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Voice creation could not finish."); }
    finally { if (mounted.current) setPhase("idle"); }
  }
  async function remove() {
    if (!await confirm("Remove this storyteller's cloned voice and its sample? Existing story audio will be preserved.")) return;
    setPhase("saving"); setError(""); setNotice("");
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Voice removal could not finish.");
      setNotice("Voice removed. You can record a new sample."); setPreviewLanguages([]); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Voice removal could not finish."); router.refresh(); }
    finally { if (mounted.current) setPhase("idle"); }
  }
  async function checkVerification() {
    setPhase("saving"); setError("");
    try {
      const response = await fetch(endpoint, { method: "PATCH" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Verification could not be checked.");
      setNotice("Your verified voice is ready for new stories."); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Verification could not be checked."); }
    finally { if (mounted.current) setPhase("idle"); }
  }
  async function changePreviewLanguage(next: "es" | "en") {
    setLanguage(next); setError("");
    if (previewLanguages.includes(next)) return;
    setPreviewLoading(true);
    try {
      const response = await fetch(endpoint + "/preview", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: next }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "We could not generate this listening sample.");
      if (mounted.current) setPreviewLanguages(current => [...current, next]);
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : "We could not generate this listening sample."); }
    finally { if (mounted.current) setPreviewLoading(false); }
  }
  return <section className="storyteller-voice" aria-label={`Voice for ${profile.name}`}>
    <div className="voice-heading"><div><span className="eyebrow">A VOICE TO KEEP</span><h4>{saved ? `${profile.name}'s voice` : `Preserve ${profile.name}'s voice`}</h4></div>
      <Button type="button" variant="ghost" disabled={busy || previewLoading} onClick={onClose}>Close</Button></div>
    {error ? <Feedback role="alert" className="feedback error">{error}</Feedback> : null}
    {notice ? <Feedback role="status" className="feedback">{notice}</Feedback> : null}
    {saved ? <div className="voice-saved">
      <Badge variant="secondary">{profile.voiceStatus === "READY" ? "Ready for narration" : profile.voiceStatus === "VERIFICATION_REQUIRED" ? "Verification required" : "Voice disabled"}</Badge>
      <p className="muted">{profile.voiceStatus === "READY" ? "New story versions from this storyteller's memories use this voice automatically. Existing stories keep their original audio." : profile.voiceStatus === "VERIFICATION_REQUIRED" ? "Complete the verification requested by ElevenLabs. This voice cannot narrate stories yet." : "Voice removal has not finished. Try removing it again."}</p>
      {profile.voiceStatus === "READY" ? <>
        <p className="form-hint">Listen to a short narration with your saved voice</p>
        <FormField control={<NativeSelect value={language} disabled={busy || previewLoading} onChange={e => void changePreviewLanguage(e.target.value as "es" | "en")}>
          <NativeSelectOption value="es">Español</NativeSelectOption><NativeSelectOption value="en">English</NativeSelectOption>
        </NativeSelect>}>Sample language</FormField>
        <p className="voice-preview-text" lang={language}>{voicePreviewText[language]}</p>
        {previewLoading ? <p role="status" className="form-hint">Generating your {language === "en" ? "English" : "Spanish"} sample…</p>
          : previewLanguages.includes(language) || (profile.voicePreviewKey && profile.voiceLanguage === language)
            ? <audio key={language} controls preload="none" src={endpoint + "?language=" + language} aria-label={language === "en" ? "English voice preview" : "Spanish voice preview"} />
            : <Button type="button" variant="outline" disabled={busy} onClick={() => void changePreviewLanguage(language)}>Generate listening sample</Button>}
        <p className="form-hint">Your first sample in each language uses your ElevenLabs allowance. Saved samples can be replayed.</p>
      </> : null}
      {profile.voiceStatus === "VERIFICATION_REQUIRED" ? <Button type="button" variant="outline" disabled={busy} onClick={() => void checkVerification()}>Check verification</Button> : null}
      <Button type="button" variant="destructive" disabled={busy || previewLoading} onClick={() => void remove()}>{busy ? "Removing…" : "Remove voice"}</Button>
    </div> : <>
      <p className="muted">Read naturally for one to three minutes. Find a quiet room, keep the microphone at a steady distance, and use your usual voice.</p>
      <FieldGroup>
        <FormField control={<NativeSelect value={language} disabled={recording || busy || !!file} onChange={e => setLanguage(e.target.value as "es" | "en")}><NativeSelectOption value="es">Español</NativeSelectOption><NativeSelectOption value="en">English</NativeSelectOption></NativeSelect>}>Reading language</FormField>
        <div className="voice-reading" lang={language} tabIndex={0} aria-label="Sample text to read aloud">
          <span className="eyebrow">READ ALOUD AT YOUR OWN PACE</span>
          {voiceReadingText[language].split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <p className="form-hint">This is a fictional reading exercise, not a family memory. If you finish early, read the beginning again. Recording stops at three minutes.</p>
        <div className="voice-recording-bar">
          <div className="voice-clock"><AudioLinesIcon aria-hidden="true" /><span>{time(seconds)} / 3:00</span>{recording ? <Badge variant="secondary">Recording</Badge> : null}</div>
          {stream ? <LiveWave stream={stream} /> : null}
          {recording ? <Button type="button" variant="outline" onClick={stop}><SquareIcon data-icon="inline-start" />Stop recording</Button> : <Button type="button" disabled={busy} onClick={() => void start()}><MicIcon data-icon="inline-start" />{phase === "permission" ? "Waiting for microphone…" : file ? "Record another take" : "Start recording"}</Button>}
        </div>
        <FormField control={<Input type="file" accept="audio/*,.webm" disabled={busy || recording} onChange={e => {
          const selected = e.target.files?.[0]; e.target.value = "";
          if (!selected) return;
          setError(""); setNotice("");
          if (selected.size > VOICE_MAX_BYTES) { setError("Choose an audio sample up to 15 MB."); return; }
          chooseFile(selected); setRecordedSeconds(null); setSeconds(0); setConsent(false);
        }} />}><UploadIcon aria-hidden="true" /> Or upload an existing audio sample (1–3 minutes, up to 15 MB)</FormField>
        {sampleUrl ? <div className="voice-review"><h5>Listen before creating your voice</h5><audio src={sampleUrl} controls aria-label="Recorded voice sample" /><p className="form-hint">{file?.name} · Listen for background noise, distortion, and other speakers.</p></div> : null}
        <Field orientation="horizontal"><Checkbox id={`voice-consent-${profile.id}`} checked={consent} disabled={busy || recording} onCheckedChange={v => setConsent(v === true)} /><FieldLabel htmlFor={`voice-consent-${profile.id}`}>This is my voice, or I have the speaker&apos;s explicit permission to send this sample to ElevenLabs, clone their voice, and use it to narrate family stories.</FieldLabel></Field>
        <p className="form-hint">Creating the voice sends your sample to ElevenLabs and may use your account&apos;s allowance. The reading exercise is kept separately from family memories.</p>
        <Button type="button" disabled={!file || !consent || busy || recording || (recordedSeconds !== null && recordedSeconds < VOICE_MIN_SECONDS)} onClick={() => void create()}>{phase === "saving" ? "Creating your voice…" : "Create storyteller voice"}</Button>
      </FieldGroup>
    </>}
  </section>;
}
