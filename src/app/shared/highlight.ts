// Minimal, dependency-free syntax highlighter that returns HTML.
// Supports: typescript, javascript, sql, bash, html.

type Lang = 'ts' | 'typescript' | 'js' | 'javascript' | 'sql' | 'bash' | 'sh' | 'html' | 'text';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Apply non-overlapping regex replacements by tokenizing.
interface Rule { name: string; pattern: RegExp; }

function tokenize(source: string, rules: Rule[]): string {
  const combined = new RegExp(rules.map(r => `(?<${r.name}>${r.pattern.source})`).join('|'), 'gms');
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = combined.exec(source)) !== null) {
    if (m.index > last) out += escapeHtml(source.slice(last, m.index));
    const groups = m.groups ?? {};
    const matchedName = Object.keys(groups).find(k => groups[k] !== undefined) ?? '';
    out += `<span class="hl-${matchedName}">${escapeHtml(m[0])}</span>`;
    last = m.index + m[0].length;
    if (m[0].length === 0) combined.lastIndex++;
  }
  if (last < source.length) out += escapeHtml(source.slice(last));
  return out;
}

const TS_KEYWORDS = [
  'import','from','export','const','let','var','function','return','if','else','for','while','do',
  'switch','case','break','continue','class','extends','implements','interface','type','enum',
  'public','private','protected','readonly','static','async','await','new','this','super','as',
  'try','catch','finally','throw','typeof','instanceof','in','of','void','null','undefined',
  'true','false','default'
];
const TS_BUILTINS = ['string','number','boolean','any','unknown','never','Promise','Array','Record','Partial','signal','computed','inject'];

function highlightTs(src: string): string {
  return tokenize(src, [
    { name: 'cmt',    pattern: /\/\*[\s\S]*?\*\/|\/\/[^\n]*/ },
    { name: 'str',    pattern: /`(?:\\.|\$\{[^}]*\}|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
    { name: 'num',    pattern: /\b\d+(?:\.\d+)?\b/ },
    { name: 'deco',   pattern: /@[A-Za-z_]\w*/ },
    { name: 'kw',     pattern: new RegExp(`\\b(?:${TS_KEYWORDS.join('|')})\\b`) },
    { name: 'bi',     pattern: new RegExp(`\\b(?:${TS_BUILTINS.join('|')})\\b`) },
    { name: 'fn',     pattern: /\b[A-Za-z_]\w*(?=\s*\()/ },
    { name: 'cls',    pattern: /\b[A-Z][A-Za-z0-9_]*\b/ },
    { name: 'punct',  pattern: /[{}()\[\];,]/ },
    { name: 'op',     pattern: /=>|[+\-*/%=!<>?:&|]+/ },
  ]);
}

const SQL_KW = [
  'select','from','where','and','or','not','in','exists','create','table','if','exists','alter','add','drop','column','rename','to','primary','key','foreign','references','on','delete','update','cascade','restrict','set','null','default','language','as','returns','function','grant','execute','usage','schema','public','enable','row','level','security','policy','for','using','with','check','generated','by','identity','begin','end','exception','others','plpgsql','definer','json','build_object','sqlerrm','do','case','when','then','union','order','limit','offset','distinct','join','inner','left','right','outer'
];
const SQL_TYPES = ['text','integer','bigint','boolean','uuid','timestamp','jsonb','json','serial','date','varchar','int','numeric','decimal','float','real','double','precision','char'];

function highlightSql(src: string): string {
  return tokenize(src, [
    { name: 'cmt',   pattern: /--[^\n]*|\/\*[\s\S]*?\*\// },
    { name: 'str',   pattern: /'(?:''|[^'])*'|\$\$[\s\S]*?\$\$/ },
    { name: 'num',   pattern: /\b\d+(?:\.\d+)?\b/ },
    { name: 'kw',    pattern: new RegExp(`\\b(?:${SQL_KW.join('|')})\\b`, 'i') },
    { name: 'bi',    pattern: new RegExp(`\\b(?:${SQL_TYPES.join('|')})\\b`, 'i') },
    { name: 'punct', pattern: /[(),;]/ },
  ]);
}

function highlightBash(src: string): string {
  return tokenize(src, [
    { name: 'cmt',  pattern: /#[^\n]*/ },
    { name: 'str',  pattern: /"(?:\\.|[^"\\])*"|'(?:[^'])*'/ },
    { name: 'kw',   pattern: /\b(?:npm|npx|yarn|pnpm|supabase|export|cd|ls|mkdir|cat|echo|run|set)\b/ },
    { name: 'fn',   pattern: /^\$\s*/m },
    { name: 'op',   pattern: /[|&><]+/ },
  ]);
}

function highlightHtml(src: string): string {
  return tokenize(src, [
    { name: 'cmt',  pattern: /<!--[\s\S]*?-->/ },
    { name: 'str',  pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
    { name: 'kw',   pattern: /<\/?[A-Za-z][\w-]*|\/?>/ },
    { name: 'bi',   pattern: /\b[a-zA-Z-]+(?==)/ },
    { name: 'punct', pattern: /[=]/ },
  ]);
}

export function highlight(source: string, lang: Lang | string = 'ts'): string {
  switch (lang) {
    case 'ts':
    case 'typescript':
    case 'js':
    case 'javascript':
      return highlightTs(source);
    case 'sql':
      return highlightSql(source);
    case 'bash':
    case 'sh':
      return highlightBash(source);
    case 'html':
      return highlightHtml(source);
    default:
      return escapeHtml(source);
  }
}
