import { Component, signal } from '@angular/core';
import { DocPage } from '../shared/doc-page';
import { CodeBlock } from '../shared/code-block';

interface Step { id: string; label: string; }

@Component({
  selector: 'example-lms-page',
  standalone: true,
  imports: [DocPage, CodeBlock],
  template: `
    <doc-page
      eyebrow="Example / Feedzony"
      title="A Feedzony-style SaaS on Supabase"
      lead="A complete, copy-pasteable recipe to bootstrap a Feedzony-style SaaS / LMS — schema → migration → auth → checkout → webhook → gated routes. No backend code except a single Lemon Squeezy webhook.">

      <h2>What you get</h2>
      <table>
        <thead><tr><th>Table</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td><code>users</code></td><td>App users (linked to <code>auth.users.id</code>)</td></tr>
          <tr><td><code>subscriptions</code></td><td>One row per user — Lemon Squeezy plan, status, renewal date</td></tr>
          <tr><td><code>projects</code></td><td>A user's projects (LMS courses / Feedzony products)</td></tr>
          <tr><td><code>feedback</code></td><td>Feedback items linked to a project</td></tr>
        </tbody>
      </table>

      <div class="step-tabs" role="tablist">
        @for (step of steps; track step.id) {
          <button
            role="tab"
            class="step-tab"
            [class.active]="active() === step.id"
            (click)="active.set(step.id)">
            {{ step.label }}
          </button>
        }
      </div>

      <section class="step-panel">
        @switch (active()) {
          @case ('user') {
            <h3>1. <code>schema/user.ts</code></h3>
            <p>Mirrors <code>auth.users</code> via a shared UUID and adds profile fields. Each user can read and update only their own row.</p>
            <code-block lang="ts" filename="schema/user.ts" [code]="userCode" />
          }
          @case ('subscription') {
            <h3>2. <code>schema/subscription.ts</code></h3>
            <p>One row per user. Written by the Lemon Squeezy webhook with the service-role key (bypasses RLS). The user can only <strong>read</strong> their own subscription.</p>
            <code-block lang="ts" filename="schema/subscription.ts" [code]="subCode" />
          }
          @case ('project') {
            <h3>3. <code>schema/project.ts</code></h3>
            <p>The user's LMS courses / Feedzony products. Strict per-owner CRUD via RLS.</p>
            <code-block lang="ts" filename="schema/project.ts" [code]="projCode" />
          }
          @case ('feedback') {
            <h3>4. <code>schema/feedback.ts</code></h3>
            <p>Public widget — <strong>anyone</strong> can insert; only the project owner can read.</p>
            <code-block lang="ts" filename="schema/feedback.ts" [code]="fbCode" />
          }
          @case ('migration') {
            <h3>5. <code>schema/migrations.ts</code> — one definition</h3>
            <p>Group everything into a single <code>MigrationDefinition</code> so the generated SQL is fully deduplicated.</p>
            <code-block lang="ts" filename="schema/migrations.ts" [code]="migCode" />

            <p>Register it once:</p>
            <code-block lang="ts" filename="app.config.ts" [code]="regCode" />
          }
          @case ('lemon') {
            <h3>6. Lemon Squeezy — payment &amp; subscription sync</h3>
            <p>Lemon Squeezy handles checkout, billing, taxes, and invoices. Your job is:</p>
            <ol>
              <li>Send the user to the Lemon Squeezy checkout with their <code>user_id</code> as <code>custom_data</code>.</li>
              <li>Receive webhooks for <code>subscription_created</code> / <code>_updated</code> / <code>_cancelled</code>.</li>
              <li>Upsert the matching row in <code>subscriptions</code> using the service-role key.</li>
            </ol>

            <h4>6.1 Send the user to checkout</h4>
            <code-block lang="ts" filename="pricing.component.ts" [code]="pricingCode" />

            <h4>6.2 Webhook handler — Supabase Edge Function</h4>
            <code-block lang="ts" filename="supabase/functions/lemonsqueezy-webhook/index.ts" [code]="webhookCode" />

            <p>Deploy it and configure the URL in the Lemon Squeezy dashboard → Settings → Webhooks.</p>
            <code-block lang="bash" [code]="deployCode" />

            <h4>6.3 Read the subscription in the app</h4>
            <code-block lang="ts" filename="subscription-status.component.ts" [code]="subStatusCode" />

            <h4>6.4 Gate a route by subscription</h4>
            <code-block lang="ts" filename="guards/pro.guard.ts" [code]="guardCode" />

            <code-block lang="ts" filename="app.routes.ts" [code]="routeCode" />
          }
          @case ('structure') {
            <h3>7. Folder structure for the LMS / Feedzony SaaS</h3>
            <code-block lang="text" [code]="tree" />
            <p>That's the entire stack: <strong>schema → migration → auth → checkout → webhook → gated routes</strong> — no backend code other than the single Lemon Squeezy webhook function.</p>

            <div class="callout">
              <strong>Ship-ready checklist</strong>
              <ul>
                <li>Run the migration once via <code>AdminMigrationComponent</code> or auto-apply on startup.</li>
                <li>Configure email/password (or OAuth) in your Supabase Auth settings.</li>
                <li>Create a variant in Lemon Squeezy and paste its URL into <code>pricing.component.ts</code>.</li>
                <li>Deploy the webhook function and set <code>LEMON_SQUEEZY_WEBHOOK_SECRET</code>.</li>
                <li>Wire the <code>proGuard</code> on any route that requires an active subscription.</li>
              </ul>
            </div>
          }
        }
      </section>
    </doc-page>
  `,
  styles: [`
    .step-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin: 1.25rem 0 0;
      padding: 4px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    .step-tab {
      flex: 1 1 auto;
      min-width: 110px;
      padding: 0.55rem 0.85rem;
      background: transparent;
      border: 0;
      color: var(--text-dim);
      cursor: pointer;
      font: inherit;
      font-size: 0.84rem;
      font-weight: 500;
      border-radius: 8px;
      transition: background .12s, color .12s;
    }
    .step-tab:hover { color: var(--text); background: rgba(255,255,255,0.03); }
    .step-tab.active {
      background: rgba(62, 207, 142, 0.12);
      color: var(--green);
      box-shadow: inset 0 0 0 1px rgba(62, 207, 142, 0.3);
    }
    .step-panel {
      margin-top: 1.5rem;
      animation: fadeIn .25s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    h3 { margin-top: 0; }
    h4 { color: var(--green); margin-top: 1.5rem; }
  `],
})
export class ExampleLmsPage {
  readonly steps: Step[] = [
    { id: 'user',         label: '1 · Users' },
    { id: 'subscription', label: '2 · Subscriptions' },
    { id: 'project',      label: '3 · Projects' },
    { id: 'feedback',     label: '4 · Feedback' },
    { id: 'migration',    label: '5 · Migration' },
    { id: 'lemon',        label: '6 · Lemon Squeezy' },
    { id: 'structure',    label: '7 · Structure' },
  ];

  active = signal<string>('user');

  readonly userCode = `import { defineSchema, defineModel, field, policy, InferModel } from 'ngx-saqly-supabase';

export const UsersTable = defineSchema('users', {
  id:          field.uuid().primary(),               // matches auth.users.id
  email:       field.string().required().unique(),
  full_name:   field.string(),
  avatar_url:  field.string(),
  created_at:  field.timestamp().defaultNow(),
});

export type User = InferModel<typeof UsersTable>;
export const UserModel = defineModel(UsersTable);

export const ReadOwnUserPolicy = policy.select('users read own row')
  .on(UsersTable).to('authenticated').using('auth.uid() = id').build();

export const InsertOwnUserPolicy = policy.insert('users insert own row')
  .on(UsersTable).to('authenticated').withCheck('auth.uid() = id').build();

export const UpdateOwnUserPolicy = policy.update('users update own row')
  .on(UsersTable).to('authenticated')
  .using('auth.uid() = id').withCheck('auth.uid() = id').build();`;

  readonly subCode = `import { defineSchema, defineModel, field, policy, relation, InferModel } from 'ngx-saqly-supabase';
import { UsersTable } from './user';

export const SubscriptionsTable = defineSchema('subscriptions', {
  id:                    field.bigint().primaryGenerated(),
  user_id:               field.uuid().required().unique(),
  lemon_customer_id:     field.string(),
  lemon_subscription_id: field.string().unique(),
  variant_id:            field.string(),
  status:                field.string().default(\`'inactive'\`),
  renews_at:             field.timestamp(),
  ends_at:               field.timestamp(),
  trial_ends_at:         field.timestamp(),
  created_at:            field.timestamp().defaultNow(),
  updated_at:            field.timestamp().defaultNow(),
});

export type Subscription = InferModel<typeof SubscriptionsTable>;
export const SubscriptionModel = defineModel(SubscriptionsTable);

export const SubscriptionUserRelation = relation.manyToOne(SubscriptionsTable, UsersTable, {
  localKey: 'user_id', foreignKey: 'id', onDelete: 'cascade', onUpdate: 'cascade',
});

export const ReadOwnSubscriptionPolicy = policy.select('subs read own')
  .on(SubscriptionsTable).to('authenticated').using('auth.uid() = user_id').build();`;

  readonly projCode = `import { defineSchema, defineModel, field, policy, relation, InferModel } from 'ngx-saqly-supabase';
import { UsersTable } from './user';

export const ProjectsTable = defineSchema('projects', {
  id:          field.bigint().primaryGenerated(),
  user_id:     field.uuid().required(),
  name:        field.string().required(),
  slug:        field.string().required().unique(),
  description: field.string(),
  created_at:  field.timestamp().defaultNow(),
});

export type Project = InferModel<typeof ProjectsTable>;
export const ProjectModel = defineModel(ProjectsTable);

export const ProjectUserRelation = relation.manyToOne(ProjectsTable, UsersTable, {
  localKey: 'user_id', foreignKey: 'id', onDelete: 'cascade', onUpdate: 'cascade',
});

export const ReadOwnProjectsPolicy = policy.select('projects read own')
  .on(ProjectsTable).to('authenticated').using('auth.uid() = user_id').build();

export const InsertOwnProjectsPolicy = policy.insert('projects insert own')
  .on(ProjectsTable).to('authenticated').withCheck('auth.uid() = user_id').build();

export const UpdateOwnProjectsPolicy = policy.update('projects update own')
  .on(ProjectsTable).to('authenticated')
  .using('auth.uid() = user_id').withCheck('auth.uid() = user_id').build();

export const DeleteOwnProjectsPolicy = policy.delete('projects delete own')
  .on(ProjectsTable).to('authenticated').using('auth.uid() = user_id').build();`;

  readonly fbCode = `import { defineSchema, defineModel, field, policy, relation, InferModel } from 'ngx-saqly-supabase';
import { ProjectsTable } from './project';

export const FeedbackTable = defineSchema('feedback', {
  id:         field.bigint().primaryGenerated(),
  project_id: field.bigint().required(),
  author:     field.string(),       // optional — may be anonymous
  message:    field.string().required(),
  rating:     field.integer(),      // 1..5
  created_at: field.timestamp().defaultNow(),
});

export type Feedback = InferModel<typeof FeedbackTable>;
export const FeedbackModel = defineModel(FeedbackTable);

export const FeedbackProjectRelation = relation.manyToOne(FeedbackTable, ProjectsTable, {
  localKey: 'project_id', foreignKey: 'id', onDelete: 'cascade', onUpdate: 'cascade',
});

// Anyone can submit feedback for any project (public widget)
export const InsertFeedbackPolicy = policy.insert('feedback insert anyone')
  .on(FeedbackTable).to('anon', 'authenticated').withCheck('true').build();

// Only the project owner can read feedback for their projects
export const ReadOwnFeedbackPolicy = policy.select('feedback read by project owner')
  .on(FeedbackTable).to('authenticated')
  .using('exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())')
  .build();`;

  readonly migCode = `import { MigrationDefinition } from 'ngx-saqly-supabase';

import { UsersTable, ReadOwnUserPolicy, InsertOwnUserPolicy, UpdateOwnUserPolicy } from './user';
import { SubscriptionsTable, SubscriptionUserRelation, ReadOwnSubscriptionPolicy } from './subscription';
import {
  ProjectsTable, ProjectUserRelation,
  ReadOwnProjectsPolicy, InsertOwnProjectsPolicy,
  UpdateOwnProjectsPolicy, DeleteOwnProjectsPolicy,
} from './project';
import {
  FeedbackTable, FeedbackProjectRelation,
  InsertFeedbackPolicy, ReadOwnFeedbackPolicy,
} from './feedback';

export const saasMigration: MigrationDefinition = {
  name: 'lms-saas-initial-schema',
  tables: [UsersTable, SubscriptionsTable, ProjectsTable, FeedbackTable],
  relations: [SubscriptionUserRelation, ProjectUserRelation, FeedbackProjectRelation],
  rls: [UsersTable, SubscriptionsTable, ProjectsTable, FeedbackTable],
  policies: [
    ReadOwnUserPolicy, InsertOwnUserPolicy, UpdateOwnUserPolicy,
    ReadOwnSubscriptionPolicy,
    ReadOwnProjectsPolicy, InsertOwnProjectsPolicy, UpdateOwnProjectsPolicy, DeleteOwnProjectsPolicy,
    InsertFeedbackPolicy, ReadOwnFeedbackPolicy,
  ],
};`;

  readonly regCode = `provideSaqlySupabase({
  url: environment.supabaseUrl,
  key: environment.supabaseAnonKey,
  migrations: [saasMigration],
});`;

  readonly pricingCode = `import { Component } from '@angular/core';
import { injectAuth } from 'ngx-saqly-supabase';

@Component({
  selector: 'app-pricing',
  standalone: true,
  template: \`<button (click)="subscribe()">Upgrade — $9 / month</button>\`,
})
export class PricingComponent {
  private readonly auth = injectAuth();

  // Replace with your variant URL from the Lemon Squeezy dashboard
  private readonly checkoutUrl = 'https://yourstore.lemonsqueezy.com/buy/abc-123-variant';

  subscribe(): void {
    const user = this.auth.user();
    if (!user) return;

    const url = new URL(this.checkoutUrl);
    url.searchParams.set('checkout[email]', user.email ?? '');
    url.searchParams.set('checkout[custom][user_id]', user.id);
    window.location.href = url.toString();
  }
}`;

  readonly webhookCode = `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LEMON_WEBHOOK_SECRET = Deno.env.get('LEMON_SQUEEZY_WEBHOOK_SECRET')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  const raw = await req.text();
  const signature = req.headers.get('x-signature') ?? '';

  const expected = createHmac('sha256', LEMON_WEBHOOK_SECRET).update(raw).digest('hex');
  if (signature !== expected) return new Response('Invalid signature', { status: 401 });

  const payload = JSON.parse(raw);
  const userId  = payload.meta.custom_data?.user_id as string | undefined;
  const sub     = payload.data.attributes;

  if (!userId) return new Response('Missing user_id', { status: 400 });

  await admin.from('subscriptions').upsert({
    user_id:               userId,
    lemon_customer_id:     String(sub.customer_id),
    lemon_subscription_id: String(payload.data.id),
    variant_id:            String(sub.variant_id),
    status:                sub.status,
    renews_at:             sub.renews_at,
    ends_at:               sub.ends_at,
    trial_ends_at:         sub.trial_ends_at,
    updated_at:            new Date().toISOString(),
  }, { onConflict: 'user_id' });

  return new Response('ok', { status: 200 });
});`;

  readonly deployCode = `supabase functions deploy lemonsqueezy-webhook --no-verify-jwt
supabase secrets set LEMON_SQUEEZY_WEBHOOK_SECRET=whsec_xxxxxxxxxx`;

  readonly subStatusCode = `import { Component, OnInit, computed, signal } from '@angular/core';
import { injectAuth, injectModel } from 'ngx-saqly-supabase';
import { Subscription, SubscriptionModel } from '../schema/subscription';

@Component({
  selector: 'app-subscription-status',
  standalone: true,
  template: \`
    @if (loading()) { <p>Loading subscription…</p> }
    @else if (isActive()) { <p>✓ Pro — renews on {{ sub()?.renews_at | date }}</p> }
    @else { <p>Free plan — <a routerLink="/pricing">upgrade</a></p> }
  \`,
})
export class SubscriptionStatusComponent implements OnInit {
  private readonly auth = injectAuth();
  private readonly repo = injectModel(SubscriptionModel);

  sub     = signal<Subscription | null>(null);
  loading = signal(true);

  readonly isActive = computed(() => {
    const s = this.sub();
    return !!s && (s.status === 'active' || s.status === 'on_trial');
  });

  async ngOnInit(): Promise<void> {
    const user = this.auth.user();
    if (!user) { this.loading.set(false); return; }
    this.sub.set(await this.repo.findFirst({ where: { user_id: user.id } }));
    this.loading.set(false);
  }
}`;

  readonly guardCode = `import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { injectAuth, injectModel } from 'ngx-saqly-supabase';
import { SubscriptionModel } from '../schema/subscription';

export const proGuard: CanActivateFn = async () => {
  const auth   = injectAuth();
  const repo   = injectModel(SubscriptionModel);
  const router = inject(Router);

  const user = auth.user();
  if (!user) return router.parseUrl('/login');

  const sub = await repo.findFirst({ where: { user_id: user.id } });
  const active = sub && (sub.status === 'active' || sub.status === 'on_trial');
  return active ? true : router.parseUrl('/pricing');
};`;

  readonly routeCode = `// app.routes.ts
{ path: 'lms', loadComponent: () => import('./lms/lms.component'), canActivate: [proGuard] },`;

  readonly tree = `src/
├── environments/environment.ts
├── app.config.ts
├── app.component.ts
├── app.routes.ts
├── schema/
│   ├── user.ts
│   ├── subscription.ts
│   ├── project.ts
│   ├── feedback.ts
│   └── migrations.ts          ← single MigrationDefinition
├── auth/
│   ├── login.component.ts
│   └── signup.component.ts
├── pricing/
│   └── pricing.component.ts   ← Lemon Squeezy checkout
├── dashboard/
│   ├── projects.component.ts
│   ├── feedback.component.ts
│   └── subscription-status.component.ts
├── guards/
│   └── pro.guard.ts
└── admin/
    └── admin-migration.component.ts`;
}
