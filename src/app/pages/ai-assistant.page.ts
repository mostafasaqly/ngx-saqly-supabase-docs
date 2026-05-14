import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DocPage } from '../shared/doc-page';
import { ChatMessage, FREE_MODELS, OpenRouterService, ValidationResult } from '../shared/openrouter.service';
import { highlight } from '../shared/highlight';

const SYSTEM_PROMPT = `You generate a SINGLE TypeScript schema file for the ngx-saqly-supabase library. Nothing else.

STRICT OUTPUT RULES — follow exactly every time:
1. Output ONLY one fenced TypeScript code block. No prose before or after. No headings. No tables.
2. The first line of the code MUST be:  // schema.ts
3. Use ONLY these ngx-saqly-supabase APIs (do NOT invent others):
   - defineSchema(tableName, fields)
   - defineModel(table)
   - field.string() / .text() / .uuid() / .integer() / .bigint() / .boolean() / .timestamp() / .jsonb()
   - modifiers: .required() .nullable() .primary() .primaryGenerated() .unique() .default('expr') .defaultNow()
   - relation.oneToOne / .oneToMany / .manyToOne  with { localKey, foreignKey, onDelete, onUpdate }
   - policy.select|insert|update|delete|all('name').on(Table).to('anon'|'authenticated').using(sql).withCheck(sql).build()
   - MigrationDefinition: { name, tables, relations, rls, policies }
   - InferModel<typeof Table>
4. Structure of the file, in this order:
   a. One import line from 'ngx-saqly-supabase'.
   b. For each table: defineSchema → InferModel type → defineModel.
   c. relation.* constants for every foreign key.
   d. policy.* constants for RLS (use auth.uid() for ownership).
   e. ONE MigrationDefinition export at the end named appMigration, with name in kebab-case.
5. Use Postgres-friendly column names: snake_case, plurals for tables.
6. Add  user_id: field.uuid().required()  whenever the row belongs to a user.
7. Keep it concise — only the tables the user asked for.

Here is the exact format. Match it precisely for every answer:

\`\`\`ts
// schema.ts
import {
  defineSchema, defineModel, field, policy, relation,
  InferModel, MigrationDefinition,
} from 'ngx-saqly-supabase';

// ── posts ──────────────────────────────────────────────
export const PostsTable = defineSchema('posts', {
  id:         field.bigint().primaryGenerated(),
  user_id:    field.uuid().required(),
  title:      field.string().required(),
  body:       field.text().required(),
  published:  field.boolean().default('false'),
  created_at: field.timestamp().defaultNow(),
});
export type Post = InferModel<typeof PostsTable>;
export const PostModel = defineModel(PostsTable);

// ── comments ───────────────────────────────────────────
export const CommentsTable = defineSchema('comments', {
  id:         field.bigint().primaryGenerated(),
  post_id:    field.bigint().required(),
  user_id:    field.uuid().required(),
  message:    field.text().required(),
  created_at: field.timestamp().defaultNow(),
});
export type Comment = InferModel<typeof CommentsTable>;
export const CommentModel = defineModel(CommentsTable);

// ── relations ──────────────────────────────────────────
export const CommentPostRelation = relation.manyToOne(CommentsTable, PostsTable, {
  localKey: 'post_id', foreignKey: 'id', onDelete: 'cascade',
});

// ── policies ───────────────────────────────────────────
export const ReadPublishedPostsPolicy = policy
  .select('read published posts').on(PostsTable)
  .to('anon', 'authenticated').using('published = true').build();

export const InsertOwnPostPolicy = policy
  .insert('insert own post').on(PostsTable)
  .to('authenticated').withCheck('auth.uid() = user_id').build();

export const UpdateOwnPostPolicy = policy
  .update('update own post').on(PostsTable)
  .to('authenticated')
  .using('auth.uid() = user_id').withCheck('auth.uid() = user_id').build();

export const DeleteOwnPostPolicy = policy
  .delete('delete own post').on(PostsTable)
  .to('authenticated').using('auth.uid() = user_id').build();

export const ReadCommentsPolicy = policy
  .select('read comments').on(CommentsTable)
  .to('anon', 'authenticated').using('true').build();

export const InsertCommentPolicy = policy
  .insert('insert own comment').on(CommentsTable)
  .to('authenticated').withCheck('auth.uid() = user_id').build();

// ── migration ──────────────────────────────────────────
export const appMigration: MigrationDefinition = {
  name: 'blog-initial-schema',
  tables:    [PostsTable, CommentsTable],
  relations: [CommentPostRelation],
  rls:       [PostsTable, CommentsTable],
  policies: [
    ReadPublishedPostsPolicy, InsertOwnPostPolicy, UpdateOwnPostPolicy, DeleteOwnPostPolicy,
    ReadCommentsPolicy, InsertCommentPolicy,
  ],
};
\`\`\``;

interface UiMessage {
  role: 'user' | 'assistant';
  content: string;
  html: SafeHtml;
}

const PRESETS = [
  { label: 'Task tracker',     prompt: 'Schema for a team task tracker: projects, tasks, assignees, comments, due dates. Each user only sees projects they are a member of.' },
  { label: 'Mini Twitter',     prompt: 'Schema for a Twitter-like app: users, posts, likes, follows. Public read, write only own rows.' },
  { label: 'E-commerce',       prompt: 'Schema for a small store: products, categories, orders, order_items. Customers see their own orders, products are public.' },
  { label: 'Polls & voting',   prompt: 'Schema for a polls app: polls, options, votes. One vote per user per poll (unique constraint).' },
  { label: 'Job board',        prompt: 'Schema for a job board: companies, jobs, applications. Anyone can read jobs; only authenticated users can apply.' },
  { label: 'Recipe sharing',   prompt: 'Schema for a recipe sharing app: users, recipes, ingredients (junction), likes. Public read, owner-only write.' },
];

@Component({
  selector: 'ai-assistant-page',
  standalone: true,
  imports: [DocPage, FormsModule],
  template: `
    <doc-page
      eyebrow="AI Assistant · Free"
      title="Generate your schema.ts with AI"
      lead="Describe any app idea — the assistant returns a single, copy-pasteable schema.ts file using ngx-saqly-supabase. Always the same format. One file. Ready to drop into your project.">

      <div class="controls">
        <label class="select-wrap">
          <span>Model</span>
          <select [(ngModel)]="model">
            @for (m of models; track m.id) {
              <option [value]="m.id">{{ m.label }}</option>
            }
          </select>
        </label>
        <button class="reset-btn" (click)="reset()" [disabled]="streaming()">↺ Reset</button>
      </div>

      @if (messages().length === 0) {
        <div class="presets">
          <p class="presets-title">Try a preset idea:</p>
          <div class="preset-grid">
            @for (p of presets; track p.label) {
              <button class="preset" (click)="usePreset(p.prompt)">
                <strong>{{ p.label }}</strong>
                <span>{{ p.prompt }}</span>
              </button>
            }
          </div>
        </div>
      }

      <div class="chat" #chatBox (scroll)="onChatScroll()" (click)="onChatClick($event)">
        @for (msg of messages(); track $index) {
          <div class="msg" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
            <div class="avatar">{{ msg.role === 'user' ? 'You' : 'AI' }}</div>
            <div class="bubble" [innerHTML]="msg.html"></div>
          </div>
        }
        @if (streaming() && pending()) {
          <div class="msg assistant">
            <div class="avatar">AI</div>
            <div class="bubble" [innerHTML]="pendingHtml()"></div>
          </div>
        }
        @if (streaming() && fallbackNote()) {
          <div class="fallback-note">↻ {{ fallbackNote() }}</div>
        }
        @if (showJump()) {
          <button class="jump-btn" (click)="jumpToBottom()">↓ Jump to latest</button>
        }
        @if (error()) {
          <div class="error">
            <div class="error-title">⚠ {{ error() }}</div>
            @if (error().includes('rate-limited') || error().includes('429') || error().includes('Rate limited')) {
              <ul class="error-help">
                <li><strong>Wait ~60 seconds</strong> — the per-minute window resets quickly.</li>
                <li><strong>Pick another model</strong> in the dropdown above — each provider has its own quota.</li>
                <li><strong>Add $10 credit</strong> at <a href="https://openrouter.ai/credits" target="_blank" rel="noopener">openrouter.ai/credits</a> — this unlocks 1,000 free requests/day across all <code>:free</code> models without ever charging you.</li>
              </ul>
            }
          </div>
        }
      </div>

      @if (latestSchema()) {
        <div class="schema-bar">
          <div class="schema-bar-head">
            <span class="schema-bar-file">📄 schema.ts</span>
            <span class="schema-bar-meta">{{ schemaLines() }} lines · {{ schemaBytes() }}</span>
          </div>
          <div class="schema-bar-actions">
            <button type="button" class="schema-btn primary" (click)="copyLatestSchema()" [class.copied]="schemaCopied()">
              @if (schemaCopied()) { ✓ Copied to clipboard } @else { 📋 Copy schema.ts }
            </button>
            <button type="button" class="schema-btn" (click)="downloadLatestSchema()">⬇ Download schema.ts</button>
          </div>
        </div>
      }

      <form class="composer" (ngSubmit)="send()">
        <textarea
          [(ngModel)]="input"
          name="input"
          rows="3"
          placeholder="Describe the schema you need — e.g. 'a recipe sharing app with users, recipes, ingredients, and likes'"
          (keydown.enter)="onEnter($event)"
          [disabled]="streaming()"></textarea>
        @if (streaming()) {
          <button type="button" class="send stop" (click)="stop()">■ Stop</button>
        } @else {
          <button type="submit" class="send" [disabled]="!input.trim()">Send →</button>
        }
      </form>

      <div class="hint">
        Powered by free models on <a href="https://openrouter.ai" target="_blank" rel="noopener">OpenRouter</a>.
        Press <kbd>Enter</kbd> to send, <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line.
      </div>
    </doc-page>
  `,
  styles: [`
    .controls {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      margin: 1.25rem 0 1rem;
    }
    .select-wrap {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 4px 4px 4px 10px;
      font-size: 0.82rem;
      color: var(--text-dim);
    }
    .select-wrap select {
      background: transparent;
      border: 0;
      color: var(--text);
      font: inherit;
      padding: 5px 8px;
      cursor: pointer;
      outline: none;
    }
    .select-wrap select option { background: #11181b; color: var(--text); }
    .reset-btn {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-dim);
      padding: 7px 12px;
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
      font-size: 0.82rem;
      transition: all .12s;
    }
    .reset-btn:hover:not(:disabled) { color: var(--green); border-color: var(--green); }
    .reset-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .presets { margin: 1rem 0 1.25rem; }
    .presets-title { margin: 0 0 0.6rem; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-mute); font-weight: 700; }
    .preset-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 0.6rem;
    }
    .preset {
      text-align: left;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0.7rem 0.85rem;
      cursor: pointer;
      color: var(--text);
      font: inherit;
      transition: border-color .12s, transform .12s, background .12s;
      display: flex; flex-direction: column; gap: 4px;
    }
    .preset:hover {
      border-color: var(--green);
      transform: translateY(-1px);
      background: rgba(62, 207, 142, 0.04);
    }
    .preset strong { color: var(--green); font-size: 0.88rem; }
    .preset span { color: var(--text-dim); font-size: 0.78rem; line-height: 1.4; }

    .chat {
      position: relative;
      display: flex; flex-direction: column; gap: 1rem;
      margin: 1rem 0 1.25rem;
      max-height: 60vh;
      min-height: 240px;
      overflow-y: auto;
      padding: 0.5rem 0.75rem 0.5rem 0.25rem;
      scroll-behavior: smooth;
      background: linear-gradient(180deg, rgba(255,255,255,0.01), transparent);
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    .chat:empty { display: none; }
    .jump-btn {
      position: sticky;
      bottom: 8px;
      align-self: center;
      margin-top: auto;
      background: var(--green);
      color: #06120c;
      border: 0;
      padding: 6px 14px;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 700;
      border-radius: 999px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,0,0,0.4);
      opacity: 0.95;
      z-index: 2;
      transition: transform .12s;
    }
    .jump-btn:hover { transform: translateY(-1px); }
    .msg { display: flex; gap: 0.7rem; align-items: flex-start; }
    .msg.user { flex-direction: row-reverse; }
    .avatar {
      flex-shrink: 0;
      width: 32px; height: 32px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 8px;
      font-size: 0.7rem; font-weight: 700;
      letter-spacing: 0.04em;
    }
    .msg.user .avatar { background: rgba(90, 176, 246, 0.15); color: var(--info); }
    .msg.assistant .avatar { background: rgba(62, 207, 142, 0.15); color: var(--green); }
    .bubble {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 0.85rem 1rem;
      max-width: 100%;
      overflow-x: auto;
      line-height: 1.6;
    }
    .msg.user .bubble {
      background: rgba(90, 176, 246, 0.06);
      border-color: rgba(90, 176, 246, 0.2);
    }
    .bubble :global(p), .bubble :global(ul), .bubble :global(ol), .bubble :global(h1), .bubble :global(h2), .bubble :global(h3) {
      margin: 0.4rem 0;
    }
    .error {
      background: rgba(255, 107, 107, 0.08);
      border: 1px solid rgba(255, 107, 107, 0.3);
      color: var(--danger);
      padding: 0.85rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
    }
    .error-title { font-weight: 600; }
    .error-help {
      margin: 0.55rem 0 0;
      padding-left: 1.2rem;
      color: var(--text-dim);
      font-size: 0.82rem;
    }
    .error-help li { margin: 3px 0; }
    .error-help strong { color: var(--text); }
    .error-help a { color: var(--green); }

    .fallback-note {
      background: rgba(246, 196, 83, 0.08);
      border: 1px solid rgba(246, 196, 83, 0.25);
      color: var(--warn);
      padding: 0.5rem 0.85rem;
      border-radius: 8px;
      font-size: 0.8rem;
    }

    /* Markdown rendering inside bubble */
    .bubble ::ng-deep h1, .bubble ::ng-deep h2, .bubble ::ng-deep h3, .bubble ::ng-deep h4 {
      color: var(--text); margin: 0.9rem 0 0.4rem; border: 0; padding: 0;
      -webkit-text-fill-color: var(--text); background: none;
    }
    .bubble ::ng-deep h2 { font-size: 1.05rem; color: var(--green); }
    .bubble ::ng-deep h3 { font-size: 0.95rem; }
    .bubble ::ng-deep p { margin: 0.45rem 0; color: var(--text); }
    .bubble ::ng-deep ul, .bubble ::ng-deep ol { padding-left: 1.2rem; margin: 0.4rem 0; color: var(--text); }
    .bubble ::ng-deep li { margin: 0.15rem 0; }
    .bubble ::ng-deep strong { color: #fff; }
    .bubble ::ng-deep code:not(pre code) {
      background: rgba(62, 207, 142, 0.1);
      color: #b8f5d4;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.85em;
      border: 1px solid rgba(62, 207, 142, 0.18);
    }
    .bubble ::ng-deep pre {
      background: var(--code-bg);
      border: 1px solid var(--code-border);
      border-radius: 8px;
      padding: 0.85rem 1rem;
      overflow-x: auto;
      margin: 0.6rem 0;
      font-size: 0.82rem;
      line-height: 1.55;
    }
    /* Code card with header + copy button (inside the AI bubble) */
    .bubble ::ng-deep .code-card {
      margin: 0.7rem 0;
      background: var(--code-bg);
      border: 1px solid var(--code-border);
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    }
    .bubble ::ng-deep .code-card-head {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.4rem 0.7rem;
      background: linear-gradient(180deg, #121a1c, #0e1416);
      border-bottom: 1px solid var(--code-border);
      font-size: 0.72rem;
    }
    .bubble ::ng-deep .code-card-head .code-lang {
      color: var(--green);
      font-family: var(--mono);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .bubble ::ng-deep .code-card-head .code-file {
      color: var(--text-mute);
      font-family: var(--mono);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .bubble ::ng-deep .code-card-head .code-file:before { content: ''; }
    .bubble ::ng-deep .code-card .code-copy {
      margin-left: auto;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-dim);
      padding: 3px 9px;
      border-radius: 6px;
      cursor: pointer;
      font: inherit;
      font-size: 0.7rem;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: color .12s, border-color .12s, background .12s;
    }
    .bubble ::ng-deep .code-card .code-copy:hover {
      color: var(--green);
      border-color: var(--green);
      background: rgba(62, 207, 142, 0.06);
    }
    .bubble ::ng-deep .code-card .code-copy.copied {
      color: var(--green);
      border-color: var(--green);
      background: rgba(62, 207, 142, 0.1);
    }
    .bubble ::ng-deep .code-card pre {
      margin: 0;
      border: 0;
      border-radius: 0;
      box-shadow: none;
    }
    .bubble ::ng-deep pre code { background: none; border: 0; padding: 0; color: #d3e4dc; font-family: var(--mono); }
    .bubble ::ng-deep .hl-cmt   { color: #5d7570; font-style: italic; }
    .bubble ::ng-deep .hl-str   { color: #b8f5d4; }
    .bubble ::ng-deep .hl-num   { color: #f6c453; }
    .bubble ::ng-deep .hl-kw    { color: #ff7eb6; font-weight: 600; }
    .bubble ::ng-deep .hl-bi    { color: #5ab0f6; }
    .bubble ::ng-deep .hl-fn    { color: #c7e8d8; }
    .bubble ::ng-deep .hl-cls   { color: #ffd479; }
    .bubble ::ng-deep .hl-deco  { color: #ff9ed1; }

    .schema-bar {
      margin: 0.5rem 0 1rem;
      padding: 0.9rem 1rem;
      background: linear-gradient(135deg, rgba(62, 207, 142, 0.10), rgba(62, 207, 142, 0.03));
      border: 1px solid rgba(62, 207, 142, 0.3);
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .schema-bar-head {
      display: flex; flex-direction: column; gap: 2px;
      flex: 1; min-width: 180px;
    }
    .schema-bar-file {
      font-family: var(--mono);
      font-weight: 700;
      color: var(--green);
      font-size: 0.92rem;
    }
    .schema-bar-meta {
      font-size: 0.75rem;
      color: var(--text-mute);
    }
    .schema-bar-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .schema-btn {
      background: transparent;
      border: 1px solid var(--border-strong);
      color: var(--text);
      padding: 0.5rem 0.95rem;
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
      font-size: 0.84rem;
      font-weight: 600;
      transition: all .12s;
    }
    .schema-btn:hover { border-color: var(--green); color: var(--green); background: rgba(62, 207, 142, 0.05); }
    .schema-btn.primary {
      background: var(--green);
      color: #06120c;
      border-color: var(--green);
    }
    .schema-btn.primary:hover { filter: brightness(1.08); color: #06120c; }
    .schema-btn.primary.copied { background: #2db478; }

    .composer {
      display: flex; gap: 0.5rem;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 0.5rem;
      align-items: flex-end;
    }
    .composer textarea {
      flex: 1;
      resize: vertical;
      background: transparent;
      border: 0;
      color: var(--text);
      font: inherit;
      padding: 0.45rem 0.55rem;
      outline: none;
      min-height: 60px;
      max-height: 220px;
    }
    .composer textarea::placeholder { color: var(--text-mute); }
    .send {
      background: var(--green);
      color: #06120c;
      border: 0;
      padding: 0.55rem 1.05rem;
      border-radius: 8px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      transition: filter .12s;
    }
    .send:hover:not(:disabled) { filter: brightness(1.08); }
    .send:disabled { opacity: 0.4; cursor: not-allowed; }
    .send.stop {
      background: rgba(255, 107, 107, 0.15);
      color: var(--danger);
      border: 1px solid rgba(255, 107, 107, 0.3);
    }

    .hint {
      margin-top: 0.7rem;
      font-size: 0.78rem;
      color: var(--text-mute);
    }
    .hint kbd {
      background: var(--bg-elev);
      border: 1px solid var(--border);
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--text-dim);
    }
  `],
})
export class AiAssistantPage {
  private readonly api = inject(OpenRouterService);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('chatBox') chatBox?: ElementRef<HTMLDivElement>;

  models = FREE_MODELS;
  presets = PRESETS;
  model = FREE_MODELS[0].id;

  input = '';
  messages = signal<UiMessage[]>([]);
  pending = signal('');
  streaming = signal(false);
  error = signal('');
  fallbackNote = signal('');
  showJump = signal(false);
  schemaCopied = signal(false);
  private stickToBottom = true;

  // Extract the first/largest ```ts ... ``` block from the most recent assistant message.
  latestSchema = computed<string>(() => {
    for (let i = this.messages().length - 1; i >= 0; i--) {
      const m = this.messages()[i];
      if (m.role !== 'assistant') continue;
      const code = extractFirstTsBlock(m.content);
      if (code) return code;
    }
    return '';
  });
  schemaLines = computed<number>(() => {
    const s = this.latestSchema();
    return s ? s.split('\n').length : 0;
  });
  schemaBytes = computed<string>(() => {
    const n = new Blob([this.latestSchema()]).size;
    return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
  });

  pendingHtml = computed<SafeHtml>(() => this.renderMarkdown(this.pending()));

  private aborter: AbortController | null = null;

  onEnter(ev: Event): void {
    const e = ev as KeyboardEvent;
    if (e.shiftKey) return;
    e.preventDefault();
    this.send();
  }

  usePreset(prompt: string): void {
    this.input = prompt;
  }

  async send(): Promise<void> {
    const text = this.input.trim();
    if (!text || this.streaming()) return;
    this.input = '';
    this.error.set('');

    const userMsg: UiMessage = { role: 'user', content: text, html: this.renderMarkdown(text) };
    this.messages.update(m => [...m, userMsg]);
    this.pending.set('');
    this.fallbackNote.set('');
    this.streaming.set(true);
    this.stickToBottom = true;
    this.showJump.set(false);
    this.scroll();

    const history: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...this.messages().map(m => ({ role: m.role, content: m.content }) as ChatMessage),
    ];

    this.aborter = new AbortController();
    const fallbackIds = this.models.map(m => m.id);

    await this.api.streamChatWithFallback(this.model, fallbackIds, history, {
      onToken: (t) => { this.pending.update(s => s + t); this.scroll(); },
      onFallback: (modelId, reason) => {
        const label = this.models.find(m => m.id === modelId)?.label ?? modelId;
        const isHallucination = reason.toLowerCase().includes('hallucination') || reason.toLowerCase().includes('invalid');
        this.fallbackNote.set(
          isHallucination
            ? `${label} returned garbled output — trying another model…`
            : `${label} was rate-limited — trying the next free model…`,
        );
        this.scroll();
      },
      onReset: () => { this.pending.set(''); this.scroll(); },
      validator: validateSchemaOutput,
      onDone: () => {
        const content = this.pending();
        if (content) {
          this.messages.update(m => [...m, { role: 'assistant', content, html: this.renderMarkdown(content) }]);
        }
        this.pending.set('');
        this.streaming.set(false);
        this.aborter = null;
      },
      onError: (err) => {
        this.error.set(err);
        this.pending.set('');
        this.streaming.set(false);
        this.aborter = null;
      },
    }, this.aborter.signal);
  }

  stop(): void {
    this.aborter?.abort();
  }

  reset(): void {
    this.messages.set([]);
    this.pending.set('');
    this.error.set('');
    this.fallbackNote.set('');
    this.showJump.set(false);
    this.stickToBottom = true;
  }

  onChatScroll(): void {
    const el = this.chatBox?.nativeElement;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 40;
    this.stickToBottom = atBottom;
    this.showJump.set(!atBottom && (this.streaming() || this.messages().length > 0));
  }

  copyLatestSchema(): void {
    const code = this.latestSchema();
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.schemaCopied.set(true);
      setTimeout(() => this.schemaCopied.set(false), 1800);
    });
  }

  downloadLatestSchema(): void {
    const code = this.latestSchema();
    if (!code) return;
    const blob = new Blob([code], { type: 'text/typescript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.ts';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  onChatClick(ev: MouseEvent): void {
    const target = ev.target as HTMLElement | null;
    const btn = target?.closest('.code-copy') as HTMLButtonElement | null;
    if (!btn) return;
    ev.preventDefault();
    const encoded = btn.getAttribute('data-code') ?? '';
    let text = '';
    try { text = decodeURIComponent(escape(atob(encoded))); } catch { text = atob(encoded); }
    navigator.clipboard.writeText(text).then(() => {
      const label = btn.querySelector('.code-copy-label');
      const prev = label?.textContent ?? 'Copy';
      if (label) label.textContent = '✓ Copied';
      btn.classList.add('copied');
      setTimeout(() => {
        if (label) label.textContent = prev;
        btn.classList.remove('copied');
      }, 1500);
    });
  }

  jumpToBottom(): void {
    const el = this.chatBox?.nativeElement;
    if (!el) return;
    this.stickToBottom = true;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    this.showJump.set(false);
  }

  private scroll(): void {
    if (!this.stickToBottom) return;
    queueMicrotask(() => {
      const el = this.chatBox?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  private renderMarkdown(src: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(mdToHtml(src));
  }
}

// ── Minimal Markdown renderer (no dependencies) ──────────────────────────────
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Pull a filename hint out of the first line of a code block, e.g.
//   // schema/user.ts        →  schema/user.ts
//   # supabase/functions/x   →  supabase/functions/x
//   -- migrations/init.sql   →  migrations/init.sql
function extractFilename(body: string): { filename: string; body: string } {
  const firstLine = body.split('\n', 1)[0] ?? '';
  const m = /^\s*(?:\/\/|#|--)\s*([A-Za-z0-9_./\-]+\.[A-Za-z0-9]+)\s*$/.exec(firstLine);
  if (!m) return { filename: '', body };
  return { filename: m[1], body: body.slice(firstLine.length + 1) };
}

function b64encode(s: string): string {
  // unicode-safe base64
  return btoa(unescape(encodeURIComponent(s)));
}

// Detect hallucinated output. Called with the accumulated text as tokens stream in.
// Returns 'reject' to abort the stream so the next model is tried.
//
// What counts as garbage:
//   - 200+ chars produced and STILL no fenced code block opener
//   - CJK / Hangul / other writing systems showing up before the fence opens
//   - Obvious off-task markers ("I need!!!", "Bloom", random eBay/HTTP babble)
//   - A code fence opens then mid-stream switches to non-source-code text
export function validateSchemaOutput(out: string): ValidationResult {
  if (out.length < 30) return 'wait';

  const fenceStart = out.indexOf('```');
  const head = fenceStart < 0 ? out : out.slice(0, fenceStart);

  // CJK / Hangul / Hebrew / Arabic in the lead-in = hallucination on an English prompt.
  if (/[぀-ヿ㐀-䶿一-鿿가-힯֐-׿؀-ۿ]/.test(head)) {
    return 'reject';
  }

  // Obvious off-topic markers seen from broken DeepSeek output.
  if (/\b(eBay|stackHTTP|business-icons|InternationalStudents|DRESSBrows|WildlySuccessful|Davidighton)\b/i.test(out.slice(0, 600))) {
    return 'reject';
  }

  // No fence opened after a fair amount of output → it's writing prose or worse.
  if (fenceStart < 0 && out.length > 200) {
    return 'reject';
  }

  // Mostly non-ASCII characters in the prefix before any fence.
  if (fenceStart < 0 && head.length > 80) {
    const nonAscii = (head.match(/[^\x00-\x7f]/g) ?? []).length;
    if (nonAscii / head.length > 0.15) return 'reject';
  }

  return 'ok';
}

// Extract the first ```ts / ```typescript fenced block (or the first fenced block
// of any language if no ts block is found). Returns trimmed code without the fences.
function extractFirstTsBlock(src: string): string {
  const tsRe = /```(?:ts|typescript)\n([\s\S]*?)```/i;
  const tsMatch = tsRe.exec(src);
  if (tsMatch) return tsMatch[1].replace(/\n$/, '');
  const anyRe = /```\w*\n([\s\S]*?)```/;
  const anyMatch = anyRe.exec(src);
  return anyMatch ? anyMatch[1].replace(/\n$/, '') : '';
}

function mdToHtml(src: string): string {
  // Extract fenced code blocks first to protect them
  const codes: string[] = [];
  let work = src.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, body) => {
    const langKey = (lang || 'ts').toLowerCase();
    const trimmed = body.replace(/\n$/, '');
    const { filename, body: stripped } = extractFilename(trimmed);
    const codeForCopy = filename ? stripped.replace(/^\n/, '') : trimmed;
    const html = highlight(codeForCopy, langKey);
    const encoded = b64encode(codeForCopy);
    const fileLabel = filename ? `<span class="code-file">${escapeHtml(filename)}</span>` : '';
    codes.push(
      `<div class="code-card">` +
        `<div class="code-card-head">` +
          `<span class="code-lang">${escapeHtml(langKey)}</span>` +
          fileLabel +
          `<button type="button" class="code-copy" data-code="${encoded}" aria-label="Copy code">` +
            `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>` +
            `<span class="code-copy-label">Copy</span>` +
          `</button>` +
        `</div>` +
        `<pre><code class="lang-${langKey}">${html}</code></pre>` +
      `</div>`
    );
    return ` CODE${codes.length - 1} `;
  });

  // Inline code
  work = work.replace(/`([^`\n]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`);

  // Headings
  work = work.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  work = work.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  work = work.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Bold + italics
  work = work.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  work = work.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');

  // Lists
  const lines = work.split('\n');
  const out: string[] = [];
  let inUl = false, inOl = false;
  for (const line of lines) {
    const ulM = /^\s*[-*]\s+(.*)$/.exec(line);
    const olM = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ulM) {
      if (!inUl) { if (inOl) { out.push('</ol>'); inOl = false; } out.push('<ul>'); inUl = true; }
      out.push(`<li>${ulM[1]}</li>`);
    } else if (olM) {
      if (!inOl) { if (inUl) { out.push('</ul>'); inUl = false; } out.push('<ol>'); inOl = true; }
      out.push(`<li>${olM[1]}</li>`);
    } else {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      out.push(line);
    }
  }
  if (inUl) out.push('</ul>');
  if (inOl) out.push('</ol>');
  work = out.join('\n');

  // Paragraphs — group consecutive non-empty, non-block lines
  work = work
    .split(/\n{2,}/)
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^<(h\d|ul|ol|pre|li|blockquote)/.test(trimmed)) return trimmed;
      if (/^ CODE\d+ $/.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  // Restore code blocks
  work = work.replace(/ CODE(\d+) /g, (_, i) => codes[Number(i)]);

  return work;
}
