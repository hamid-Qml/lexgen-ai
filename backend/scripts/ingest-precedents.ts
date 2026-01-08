import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../src/data-source';
import { PrecedentDocument } from '../src/contract-catalog/entities/precedent-document.entity';
import { ContractType } from '../src/contract-catalog/entities/contract-type.entity';
import { ContractCategory } from '../src/contract-catalog/entities/contract.enums';

type PrecedentSection = { heading: string; body: string };

const CONTRACT_DIR = path.resolve(
  __dirname,
  '../../Data/Employement/Contracts',
);

const PLACEHOLDER_RE = /{{\s*([^}]+?)\s*}}/g;
const TOP_LEVEL_NUMBERED_RE = /^(\d+)\.\s+(.+)$/;

const XML_ENTITY_REPLACEMENTS: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};

function decodeXmlEntities(text: string): string {
  return text.replace(
    /&(amp|lt|gt|quot|apos);/g,
    (match) => XML_ENTITY_REPLACEMENTS[match] || match,
  );
}

function normalizeText(text: string): string {
  return text
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\u2018/g, "'")
    .replace(/\u2019/g, "'")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"');
}

function letters(text: string): string {
  return text.replace(/[^A-Za-z]/g, '');
}

function capsRatio(text: string): number {
  const onlyLetters = letters(text);
  if (!onlyLetters) return 0;
  const upper = onlyLetters.split('').filter((ch) => ch === ch.toUpperCase());
  return upper.length / onlyLetters.length;
}

function isAllCapsHeading(text: string): boolean {
  const onlyLetters = letters(text);
  if (!onlyLetters) return false;
  if (text.length > 120) return false;
  return onlyLetters.split('').every((ch) => ch === ch.toUpperCase());
}

function isTopLevelNumberedHeading(text: string): boolean {
  const match = text.match(TOP_LEVEL_NUMBERED_RE);
  if (!match) return false;
  const tail = match[2];
  return capsRatio(tail) >= 0.6;
}

function isSectionHeading(text: string): boolean {
  return isTopLevelNumberedHeading(text) || isAllCapsHeading(text);
}

function extractParagraphsFromDocx(filePath: string): string[] {
  const xml = execFileSync('unzip', ['-p', filePath, 'word/document.xml'], {
    encoding: 'utf8',
  });

  const paragraphs: string[] = [];
  const matches = xml.matchAll(/<w:p[\s\S]*?<\/w:p>/g);
  for (const match of matches) {
    const block = match[0];
    const texts: string[] = [];
    const textMatches = block.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
    for (const textMatch of textMatches) {
      const raw = textMatch[1];
      if (!raw) continue;
      texts.push(decodeXmlEntities(raw));
    }
    if (!texts.length) continue;
    const combined = normalizeText(texts.join('')).trim();
    if (combined) paragraphs.push(combined);
  }
  return paragraphs;
}

function extractPlaceholders(lines: string[]): string[] {
  const found = new Set<string>();
  for (const line of lines) {
    if (!line) continue;
    let match;
    while ((match = PLACEHOLDER_RE.exec(line))) {
      const key = match[1]?.trim();
      if (key) found.add(key);
    }
  }
  return Array.from(found).sort();
}

function buildOutline(paragraphs: string[]) {
  let title: string | null = null;
  let index = 0;
  if (paragraphs[0] && isAllCapsHeading(paragraphs[0])) {
    title = paragraphs[0];
    index = 1;
  }

  const frontMatter: string[] = [];
  const sections: PrecedentSection[] = [];
  let current: { heading: string; body: string[] } | null = null;
  let frontMatterDone = false;

  for (const text of paragraphs.slice(index)) {
    if (isSectionHeading(text)) {
      frontMatterDone = true;
      if (current) {
        sections.push({
          heading: current.heading,
          body: current.body.join('\n').trim(),
        });
      }
      current = { heading: text, body: [] };
      continue;
    }

    if (!frontMatterDone) {
      frontMatter.push(text);
    } else if (current) {
      current.body.push(text);
    }
  }

  if (current) {
    sections.push({
      heading: current.heading,
      body: current.body.join('\n').trim(),
    });
  }

  const placeholderLines = [
    ...(title ? [title] : []),
    ...frontMatter,
    ...sections.flatMap((s) => [s.heading, s.body]),
  ];

  return {
    title,
    frontMatter,
    sections,
    placeholders: extractPlaceholders(placeholderLines),
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
}

function scoreTokens(a: Set<string>, b: Set<string>): number {
  let score = 0;
  for (const token of a) {
    if (b.has(token)) score += 1;
  }
  return score;
}

function resolveContractType(
  contractTypes: ContractType[],
  docTokens: Set<string>,
): ContractType | null {
  let best: { ct: ContractType; score: number } | null = null;
  for (const ct of contractTypes) {
    const ctTokens = new Set([
      ...tokenize(ct.name || ''),
      ...tokenize(ct.slug || ''),
    ]);
    if (!ctTokens.size) continue;
    const score = scoreTokens(docTokens, ctTokens);
    if (!best || score > best.score) {
      best = { ct, score };
    }
  }
  if (!best) return null;
  if (best.score < 2) return null;
  return best.ct;
}

async function ingestPrecedents() {
  if (!fs.existsSync(CONTRACT_DIR)) {
    throw new Error(`Contract directory not found: ${CONTRACT_DIR}`);
  }

  await AppDataSource.initialize();
  const precedentRepo = AppDataSource.getRepository(PrecedentDocument);
  const contractTypeRepo = AppDataSource.getRepository(ContractType);
  const contractTypes = await contractTypeRepo.find();

  const files = fs
    .readdirSync(CONTRACT_DIR)
    .filter((f) => f.toLowerCase().endsWith('.docx'));

  for (const file of files) {
    const filePath = path.join(CONTRACT_DIR, file);
    const paragraphs = extractParagraphsFromDocx(filePath);
    const outline = buildOutline(paragraphs);

    const fileTokens = new Set(tokenize(path.parse(file).name));
    const titleTokens = new Set(tokenize(outline.title || ''));
    const docTokens = new Set([...fileTokens, ...titleTokens]);

    const contractType = resolveContractType(contractTypes, docTokens);
    const keywords = Array.from(docTokens);

    const existing = await precedentRepo.findOne({
      where: { sourcePath: filePath },
    });

    const precedent = existing || precedentRepo.create();
    precedent.title = outline.title || path.parse(file).name;
    precedent.category = contractType?.category || ContractCategory.EMPLOYMENT;
    precedent.jurisdiction = contractType?.jurisdictionDefault || 'AU';
    precedent.sourcePath = filePath;
    precedent.frontMatter = outline.frontMatter;
    precedent.sections = outline.sections;
    precedent.placeholders = outline.placeholders;
    precedent.keywords = keywords;
    precedent.contractType = contractType;

    await precedentRepo.save(precedent);

    const contractTypeLabel = contractType ? contractType.name : 'unmatched';
    console.log(`Ingested ${file} → ${contractTypeLabel}`);
  }

  await AppDataSource.destroy();
}

ingestPrecedents().catch((err) => {
  console.error('Precedent ingest failed:', err);
  process.exit(1);
});
