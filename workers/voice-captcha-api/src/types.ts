/**
 * Worker + Durable Object bindings (Hackathon: edge state on Cloudflare).
 */
export interface WorkerEnv {
  GROQ_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
  CHALLENGE_COORDINATOR: DurableObjectNamespace;
}
