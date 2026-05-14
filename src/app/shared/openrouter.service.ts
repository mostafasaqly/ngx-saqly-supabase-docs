import { Injectable } from '@angular/core';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamHandlers {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (err: string, status?: number) => void;
}

export type ValidationResult = 'ok' | 'wait' | 'reject';

/** Called periodically with the accumulated output. Return 'reject' to abort
 *  and trigger a fallback to the next model. */
export type Validator = (accumulated: string) => ValidationResult;

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const STORAGE_KEY = 'openrouter_api_key';

export function getStoredApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) ?? '';
}

export function saveApiKey(key: string): void {
  if (key.trim()) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Free models on OpenRouter — ordered by code-output reliability.
// Smaller/fast models like DeepSeek V4 Flash are NOT first because they hallucinate
// random multilingual text on long structured prompts. Qwen3 Coder is the most
// dependable free model for TypeScript output right now.
export const FREE_MODELS = [
  { id: 'qwen/qwen3-coder:free',                       label: 'Qwen3 Coder (free) — recommended' },
  { id: 'openai/gpt-oss-120b:free',                    label: 'GPT-OSS 120B (free)' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free',      label: 'Llama 3.3 70B (free)' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct:free',       label: 'Qwen3 Next 80B (free)' },
  { id: 'z-ai/glm-4.5-air:free',                       label: 'GLM 4.5 Air (free)' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free',      label: 'Nemotron 3 Super 120B (free)' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free',   label: 'Hermes 3 405B (free)' },
  { id: 'deepseek/deepseek-v4-flash:free',             label: 'DeepSeek V4 Flash (free) — may hallucinate' },
];

@Injectable({ providedIn: 'root' })
export class OpenRouterService {
  /**
   * Stream a single chat completion. Returns true if any tokens were produced.
   * If the request fails before streaming begins, returns false and calls onError.
   */
  async streamChat(
    model: string,
    messages: ChatMessage[],
    handlers: StreamHandlers,
    signal?: AbortSignal,
    validator?: Validator,
  ): Promise<{ produced: boolean; rejected: boolean }> {
    let res: Response;
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getStoredApiKey()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': location.origin,
          'X-Title': 'ngx-saqly-supabase docs',
        },
        body: JSON.stringify({ model, messages, stream: true, temperature: 0.2, top_p: 0.9 }),
        signal,
      });
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') return { produced: false, rejected: false };
      handlers.onError(e instanceof Error ? e.message : String(e));
      return { produced: false, rejected: false };
    }

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      let msg = text || res.statusText;
      try {
        const j = JSON.parse(text);
        if (j?.error?.message) msg = j.error.message;
      } catch { /* keep raw text */ }
      if (res.status === 404) {
        msg = `Model unavailable: ${msg}. Try picking another model from the dropdown.`;
      } else if (res.status === 429) {
        msg = `Rate limited — free quota exhausted. Try again in ~60s, switch models, or add credit at openrouter.ai.`;
      } else if (res.status === 401) {
        msg = `Auth failed — the API key was rejected. ${msg}`;
      }
      handlers.onError(`HTTP ${res.status} — ${msg}`, res.status);
      return { produced: false, rejected: false };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let producedToken = false;
    let accumulated = '';
    let rejected = false;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') { handlers.onDone(); return { produced: producedToken, rejected }; }
          try {
            const json = JSON.parse(data);
            // Mid-stream provider errors come back as a JSON object inside the SSE event
            if (json?.error?.message) {
              handlers.onError(`Provider error — ${json.error.message}`, json.error.code);
              return { produced: producedToken, rejected };
            }
            const token = json.choices?.[0]?.delta?.content ?? '';
            if (token) {
              producedToken = true;
              accumulated += token;
              if (validator) {
                const verdict = validator(accumulated);
                if (verdict === 'reject') {
                  rejected = true;
                  await reader.cancel().catch(() => {});
                  return { produced: producedToken, rejected };
                }
              }
              handlers.onToken(token);
            }
          } catch { /* ignore keep-alive chunks */ }
        }
      }
      handlers.onDone();
      return { produced: producedToken, rejected };
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') { handlers.onDone(); return { produced: producedToken, rejected }; }
      handlers.onError(e instanceof Error ? e.message : String(e));
      return { produced: producedToken, rejected };
    }
  }

  /**
   * Try the preferred model, then fall back through `fallbacks` on 429 / 503.
   * Reports which model actually answered via `onFallback`.
   */
  async streamChatWithFallback(
    preferred: string,
    fallbacks: string[],
    messages: ChatMessage[],
    handlers: StreamHandlers & {
      onFallback?: (modelId: string, reason: string) => void;
      onReset?: () => void;          // called before re-trying with a new model (clear pending UI)
      validator?: Validator;
    },
    signal?: AbortSignal,
  ): Promise<void> {
    const tried = new Set<string>();
    const order = [preferred, ...fallbacks.filter(f => f !== preferred)];

    for (const model of order) {
      if (tried.has(model)) continue;
      tried.add(model);
      if (signal?.aborted) return;

      let lastStatus: number | undefined;
      let lastError = '';
      const result = await this.streamChat(
        model,
        messages,
        {
          onToken: handlers.onToken,
          onDone: handlers.onDone,
          onError: (err, status) => { lastStatus = status; lastError = err; },
        },
        signal,
        handlers.validator,
      );

      // Hallucination detected — discard, reset UI, try next model.
      if (result.rejected) {
        handlers.onFallback?.(model, 'Output looked invalid (hallucination) — trying another model…');
        handlers.onReset?.();
        continue;
      }

      if (result.produced) return; // success — onDone already called
      if (lastStatus === undefined) {
        // No HTTP error captured (likely abort or success-with-no-tokens) — stop.
        if (lastError) handlers.onError(lastError);
        return;
      }
      // Retriable: rate limit (429), bad gateway (502), service unavailable (503), provider timeout
      const retriable = lastStatus === 429 || lastStatus === 502 || lastStatus === 503 || lastStatus === 504;
      if (!retriable) {
        handlers.onError(lastError, lastStatus);
        return;
      }
      handlers.onFallback?.(model, lastError);
    }

    handlers.onError('Tried every free model — none produced valid output. Wait ~60s and try again, or pick a specific model from the dropdown.');
  }
}
