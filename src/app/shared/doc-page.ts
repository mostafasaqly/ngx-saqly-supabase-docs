import { Component, input } from '@angular/core';

@Component({
  selector: 'doc-page',
  standalone: true,
  template: `
    <article class="doc">
      <header class="doc-hero">
        @if (eyebrow()) { <div class="eyebrow">{{ eyebrow() }}</div> }
        <h1>{{ title() }}</h1>
        @if (lead()) { <p class="lead">{{ lead() }}</p> }
      </header>
      <ng-content />
    </article>
  `,
  styles: [`
    .doc { max-width: 820px; }
    .doc-hero { margin-bottom: 1.5rem; }
    .eyebrow {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--green);
      padding: 3px 10px;
      border: 1px solid rgba(62, 207, 142, 0.3);
      background: rgba(62, 207, 142, 0.06);
      border-radius: 999px;
      margin-bottom: 0.75rem;
    }
    .lead {
      font-size: 1.1rem;
      color: var(--text-dim);
      margin-top: 0.4rem;
      max-width: 65ch;
    }
  `],
})
export class DocPage {
  title = input.required<string>();
  eyebrow = input<string>('');
  lead = input<string>('');
}
