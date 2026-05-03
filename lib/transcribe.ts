import { env } from "./env";

export async function transcribeAudio(audioBuffer: ArrayBuffer, mimeType: string): Promise<string> {
  const blob = new Blob([audioBuffer], { type: mimeType });

  const form = new FormData();
  form.append("file", blob, "audio.ogg");
  form.append("model", "whisper-large-v3");
  form.append("language", "ru");
  form.append("response_format", "text");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq Whisper error: ${err}`);
  }

  const text = await res.text();
  return text.trim();
}
