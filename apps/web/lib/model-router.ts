/**
 * AEGIS Model Router
 * 
 * Orchestrates AI model requests by trying Anthropic (Claude) first 
 * and falling back to a local Ollama instance if the API key is missing 
 * or the request fails. Designed for server-side execution within 
 * Next.js API routes.
 */

import Anthropic from "@anthropic-ai/sdk";

// --- Types ---

/** Represents a single message in a model conversation. */
export interface ModelMessage {
  role: "user" | "assistant";
  content: string;
}

/** Configuration for a model inference request. */
export interface ModelRequest {
  /** The system prompt to guide agent behavior. */
  system: string;
  /** Conversation history. */
  messages: ModelMessage[];
  /** Maximum number of tokens to generate. */
  maxTokens?: number;
  /** Whether to stream the response. */
  stream?: boolean;
}

/** Unified response format across different providers. */
export interface ModelResponse {
  /** The generated text content. */
  text: string;
  /** The specific model name used. */
  model: string;
  /** The provider that handled the request. */
  provider: "anthropic" | "ollama";
  /** Number of tokens in the input prompt. */
  inputTokens: number;
  /** Number of tokens in the output response. */
  outputTokens: number;
  /** Whether the request hit a provider-side cache. */
  cached: boolean;
}

// --- Configuration ---

const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY ?? "";
const OLLAMA_BASE     = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL ?? "llama3.2";
const DEFAULT_MODEL   = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-5";

const anthropicClient = ANTHROPIC_KEY ? new Anthropic({ apiKey: ANTHROPIC_KEY }) : null;

// --- Anthropic Provider ---

/**
 * Internal helper to call the Anthropic Messages API.
 */
async function callAnthropic(req: ModelRequest): Promise<ModelResponse> {
  if (!anthropicClient) throw new Error("ANTHROPIC_API_KEY not set");

  const response = await anthropicClient.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: req.maxTokens ?? 2048,
    system: [
      {
        type: "text",
        text: req.system,
        // Cache the system prompt across requests for the same agent role
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: req.messages,
  });

  const block = response.content[0];
  const text  = block.type === "text" ? block.text : "";
  const usage = response.usage as Anthropic.Usage & { cache_read_input_tokens?: number };

  return {
    text,
    model: response.model,
    provider: "anthropic",
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cached: (usage.cache_read_input_tokens ?? 0) > 0,
  };
}

/**
 * Streams a response from Anthropic.
 */
export async function streamAnthropic(
  req: ModelRequest,
  onChunk: (text: string) => void,
  onDone: (response: Omit<ModelResponse, "text">) => void,
): Promise<void> {
  if (!anthropicClient) throw new Error("ANTHROPIC_API_KEY not set");

  const stream = anthropicClient.messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: req.maxTokens ?? 2048,
    system: [
      {
        type: "text",
        text: req.system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: req.messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      onChunk(event.delta.text);
    }
  }

  const final = await stream.finalMessage();
  const usage = final.usage as Anthropic.Usage & { cache_read_input_tokens?: number };
  onDone({
    model: final.model,
    provider: "anthropic",
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cached: (usage.cache_read_input_tokens ?? 0) > 0,
  });
}

// --- Ollama Provider ---

/**
 * Internal helper to call a local Ollama instance via its REST API.
 */
async function callOllama(req: ModelRequest): Promise<ModelResponse> {
  const payload = {
    model: OLLAMA_MODEL,
    messages: [
      { role: "system", content: req.system },
      ...req.messages,
    ],
    stream: false,
    options: { num_predict: req.maxTokens ?? 2048 },
  };

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    message: { content: string };
    model: string;
    prompt_eval_count?: number;
    eval_count?: number;
  };

  return {
    text: data.message.content,
    model: data.model,
    provider: "ollama",
    inputTokens: data.prompt_eval_count ?? 0,
    outputTokens: data.eval_count ?? 0,
    cached: false,
  };
}

/**
 * Streams a response from a local Ollama instance.
 */
export async function streamOllama(
  req: ModelRequest,
  onChunk: (text: string) => void,
  onDone: (response: Omit<ModelResponse, "text">) => void,
): Promise<void> {
  const payload = {
    model: OLLAMA_MODEL,
    messages: [
      { role: "system", content: req.system },
      ...req.messages,
    ],
    stream: true,
  };

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok || !res.body) throw new Error(`Ollama stream failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let inputTokens = 0;
  let outputTokens = 0;
  let model = OLLAMA_MODEL;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const obj = JSON.parse(line) as {
          message?: { content: string };
          model?: string;
          done?: boolean;
          prompt_eval_count?: number;
          eval_count?: number;
        };
        if (obj.message?.content) onChunk(obj.message.content);
        if (obj.model) model = obj.model;
        if (obj.done) {
          inputTokens  = obj.prompt_eval_count ?? 0;
          outputTokens = obj.eval_count ?? 0;
        }
      } catch { /* partial JSON */ }
    }
  }

  onDone({ model, provider: "ollama", inputTokens, outputTokens, cached: false });
}

// --- Router Functions ---

/**
 * Smart router: attempts to fulfill the request via Anthropic, 
 * falling back to Ollama on failure or if the key is missing.
 */
export async function routedComplete(req: ModelRequest): Promise<ModelResponse> {
  if (ANTHROPIC_KEY) {
    try {
      const result = await callAnthropic(req);
      console.log(
        `[router] anthropic/${result.model} — in:${result.inputTokens} out:${result.outputTokens} cached:${result.cached}`,
      );
      return result;
    } catch (err) {
      console.warn("[router] Anthropic failed, falling back to Ollama:", err);
    }
  }

  console.log(`[router] ollama/${OLLAMA_MODEL} (Anthropic key ${ANTHROPIC_KEY ? "failed" : "not set"})`);
  return callOllama(req);
}

/**
 * Streaming router: initiates a stream from the best available provider.
 * Returns the name of the active provider.
 */
export async function routedStream(
  req: ModelRequest,
  onChunk: (text: string) => void,
  onDone: (response: Omit<ModelResponse, "text">) => void,
): Promise<"anthropic" | "ollama"> {
  if (ANTHROPIC_KEY) {
    try {
      await streamAnthropic(req, onChunk, onDone);
      return "anthropic";
    } catch (err) {
      console.warn("[router] Anthropic stream failed, falling back to Ollama:", err);
    }
  }
  await streamOllama(req, onChunk, onDone);
  return "ollama";
}

/**
 * Returns the current availability status of supported model providers.
 */
export function availableProviders(): { anthropic: boolean; ollama: string } {
  return {
    anthropic: Boolean(ANTHROPIC_KEY),
    ollama: `${OLLAMA_BASE} (model: ${OLLAMA_MODEL})`,
  };
}
