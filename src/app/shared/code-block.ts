import { Component, computed, input, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { highlight } from './highlight';

@Component({
  selector: 'code-block',
  standalone: true,
  template: `
    <div class="code-wrap">
      <div class="code-head">
        <span class="lang">{{ lang() }}</span>
        @if (filename()) { <span class="file">{{ filename() }}</span> }
        <button class="copy" (click)="copy()" [class.copied]="copied()">
          @if (copied()) { ✓ Copied } @else {
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          }
        </button>
      </div>
      <pre class="code"><code [innerHTML]="html()"></code></pre>
    </div>
  `,
  styles: [`
    .code-wrap {
      background: var(--code-bg);
      border: 1px solid var(--code-border);
      border-radius: 10px;
      margin: 1rem 0 1.25rem;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    }
    .code-head {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.85rem;
      background: linear-gradient(180deg, #121a1c 0%, #0e1416 100%);
      border-bottom: 1px solid var(--code-border);
      font-size: 0.74rem;
    }
    .lang {
      color: var(--green);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      font-family: var(--mono);
    }
    .file {
      color: var(--text-mute);
      font-family: var(--mono);
      flex: 1;
    }
    .copy {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-dim);
      padding: 3px 9px;
      border-radius: 6px;
      cursor: pointer;
      font: inherit;
      font-size: 0.72rem;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all .12s;
    }
    .copy:hover { color: var(--green); border-color: var(--green); background: rgba(62, 207, 142, 0.06); }
    .copy.copied { color: var(--green); border-color: var(--green); }
    pre.code {
      margin: 0;
      padding: 1rem 1.1rem;
      overflow-x: auto;
      font-family: var(--mono);
      font-size: 0.83rem;
      line-height: 1.65;
      color: #d3e4dc;
    }
    pre.code code { background: none; padding: 0; border: 0; color: inherit; font-size: inherit; }

    :host ::ng-deep .hl-cmt   { color: #5d7570; font-style: italic; }
    :host ::ng-deep .hl-str   { color: #b8f5d4; }
    :host ::ng-deep .hl-num   { color: #f6c453; }
    :host ::ng-deep .hl-kw    { color: #ff7eb6; font-weight: 600; }
    :host ::ng-deep .hl-bi    { color: #5ab0f6; }
    :host ::ng-deep .hl-fn    { color: #c7e8d8; }
    :host ::ng-deep .hl-cls   { color: #ffd479; }
    :host ::ng-deep .hl-deco  { color: #ff9ed1; }
    :host ::ng-deep .hl-op    { color: #9db1ac; }
    :host ::ng-deep .hl-punct { color: #6b7c79; }
  `],
})
export class CodeBlock {
  code = input.required<string>();
  lang = input<string>('ts');
  filename = input<string>('');

  copied = signal(false);

  html = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(highlight(this.code().trim(), this.lang())));

  constructor(private readonly sanitizer: DomSanitizer) {}

  copy(): void {
    navigator.clipboard.writeText(this.code().trim()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
