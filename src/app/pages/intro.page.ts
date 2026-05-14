import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocPage } from '../shared/doc-page';
import { CodeBlock } from '../shared/code-block';

@Component({
  selector: 'intro-page',
  standalone: true,
  imports: [DocPage, CodeBlock, RouterLink],
  template: `
    <doc-page
      eyebrow="ngx-saqly-supabase"
      title="Full-stack Angular with Supabase — no backend required"
      lead="Define your database schema in TypeScript, run migrations with one click, and perform full CRUD operations directly from Angular using a type-safe, signal-friendly API.">

      <div class="hero-grid">
        <div class="hero-card">
          <div class="hero-card-icon">⚡</div>
          <h3>Zero backend</h3>
          <p>Schema, migrations, RLS, auth and CRUD — all from your Angular app.</p>
        </div>
        <div class="hero-card">
          <div class="hero-card-icon">🔒</div>
          <h3>Type-safe</h3>
          <p>Row types are inferred from your schema. No interfaces to maintain.</p>
        </div>
        <div class="hero-card">
          <div class="hero-card-icon">📦</div>
          <h3>Idempotent</h3>
          <p>Re-running migrations is always safe. <code>IF NOT EXISTS</code> everywhere.</p>
        </div>
        <div class="hero-card">
          <div class="hero-card-icon">🚀</div>
          <h3>One install</h3>
          <p>Install, provide, ship. SaaS-ready including Lemon Squeezy billing.</p>
        </div>
      </div>

      <h2>Try it in 30 seconds</h2>
      <code-block lang="bash" code="npm install ngx-saqly-supabase &#64;supabase/supabase-js" />

      <code-block lang="ts" filename="app.config.ts" [code]="cfgCode" />

      <div class="callout">
        <strong>Where to next?</strong>
        <p>Walk through the step-by-step guide, or jump straight to a working example.</p>
        <div class="next-grid">
          <a routerLink="/installation" class="next-card">
            <strong>Step 1 — Installation</strong>
            <span>Install the package and configure your environment.</span>
          </a>
          <a routerLink="/example-lms" class="next-card">
            <strong>Example — LMS / Feedzony</strong>
            <span>A complete SaaS recipe with auth, billing, and feedback.</span>
          </a>
        </div>
      </div>
    </doc-page>
  `,
  styles: [`
    .hero-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.9rem;
      margin: 1.5rem 0 2rem;
    }
    .hero-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.1rem;
      transition: transform .15s, border-color .15s, box-shadow .15s;
    }
    .hero-card:hover {
      transform: translateY(-2px);
      border-color: rgba(62, 207, 142, 0.4);
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }
    .hero-card-icon { font-size: 1.4rem; margin-bottom: 0.35rem; }
    .hero-card h3 { margin: 0 0 0.2rem; font-size: 0.98rem; color: #fff; }
    .hero-card p { margin: 0; font-size: 0.85rem; color: var(--text-dim); }

    .next-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-top: 0.75rem;
    }
    @media (max-width: 700px) { .next-grid { grid-template-columns: 1fr; } }
    .next-card {
      display: flex; flex-direction: column;
      padding: 0.85rem 1rem;
      background: var(--bg-elev);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      text-decoration: none !important;
      transition: border-color .15s, transform .15s;
    }
    .next-card:hover { border-color: var(--green); transform: translateX(3px); }
    .next-card strong { color: var(--green); margin-bottom: 0.2rem; }
    .next-card span { font-size: 0.85rem; color: var(--text-dim); }
  `],
})
export class IntroPage {
  readonly cfgCode = `import { ApplicationConfig } from '@angular/core';
import { provideSaqlySupabase } from 'ngx-saqly-supabase';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideSaqlySupabase({
      url: environment.supabaseUrl,
      key: environment.supabaseAnonKey,
    }),
  ],
};`;
}
