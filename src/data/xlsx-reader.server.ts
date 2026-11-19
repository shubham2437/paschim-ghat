import 'server-only';
import { inflateRawSync } from 'node:zlib';

/**
 * A tiny, dependency-free .xlsx (OOXML) reader, purpose-built for reading
 * flat-table worksheets from our own trusted catalogue workbook.
 *
 * We deliberately do NOT use the popular `xlsx` (SheetJS) npm package here:
 * the last version published to the npm registry (0.18.5) carries two
 * unpatched high-severity advisories (prototype pollution, ReDoS) with "no
 * fix available" on npm. Since this only ever parses a single first-party
 * file bundled with the app (never an untrusted upload), a small,
 * auditable parser working directly against the ZIP/XML structures we
 * control is the safer choice — no third-party dependency, no CVE surface.
 */

interface ZipEntry {
  data: Buffer;
}

function readZip(buf: Buffer): Map<string, Buffer> {
  const EOCD_SIG = 0x06054b50;
  const CEN_SIG = 0x02014b50;

  let eocd = -1;
  const minPos = Math.max(0, buf.length - 66000);
  for (let i = buf.length - 22; i >= minPos; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a valid .xlsx (zip) file');

  const entryCount = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);

  const files = new Map<string, ZipEntry>();
  for (let n = 0; n < entryCount; n++) {
    if (buf.readUInt32LE(offset) !== CEN_SIG) break;
    const method = buf.readUInt16LE(offset + 10);
    const compSize = buf.readUInt32LE(offset + 20);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localHeaderOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLen);

    const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);

    const data = method === 0 ? Buffer.from(raw) : inflateRawSync(raw);
    files.set(name, { data });

    offset += 46 + nameLen + extraLen + commentLen;
  }

  const out = new Map<string, Buffer>();
  for (const [name, entry] of files) out.set(name, entry.data);
  return out;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&');
}

function extractTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>|<${tag}(?:\\s[^>]*)?/>`, 'g');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1] ?? '');
  return out;
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const siBlocks = extractTags(xml, 'si');
  return siBlocks.map((block) => {
    const texts = extractTags(block, 't');
    return decodeXmlEntities(texts.join(''));
  });
}

function colLettersToIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? 'A';
  let idx = 0;
  for (const ch of letters) idx = idx * 26 + (ch.charCodeAt(0) - 64);
  return idx - 1;
}

function parseSheetRows(xml: string, sharedStrings: string[]): string[][] {
  const rowBlocks = xml.match(/<row\b[^>]*>[\s\S]*?<\/row>|<row\b[^>]*\/>/g) ?? [];
  const rows: string[][] = [];

  for (const rowXml of rowBlocks) {
    const cellMatches = rowXml.match(/<c\b[^>]*(?:\/>|>[\s\S]*?<\/c>)/g) ?? [];
    const row: string[] = [];

    for (const cellXml of cellMatches) {
      const refMatch = cellXml.match(/r="([A-Z]+\d+)"/);
      const idx = refMatch?.[1] ? colLettersToIndex(refMatch[1]) : row.length;
      const typeMatch = cellXml.match(/\st="([^"]+)"/);
      const type = typeMatch?.[1];

      let value = '';
      const inlineMatch = cellXml.match(/<is>([\s\S]*?)<\/is>/);
      if (inlineMatch?.[1] !== undefined) {
        const texts = extractTags(inlineMatch[1], 't');
        value = decodeXmlEntities(texts.join(''));
      } else {
        const vMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
        const raw = vMatch?.[1] ?? '';
        if (type === 's') {
          const strIdx = parseInt(raw, 10);
          value = sharedStrings[strIdx] ?? '';
        } else if (type === 'b') {
          value = raw === '1' ? 'yes' : 'no';
        } else {
          value = decodeXmlEntities(raw);
        }
      }
      row[idx] = value;
    }
    rows.push(row);
  }
  return rows;
}

export interface XlsxWorkbook {
  /** sheetName -> rows-as-objects, keyed by the header row (row 0) */
  sheets: Record<string, Record<string, string>[]>;
  /** sheetName -> raw cell grid (rows of cells, empty string for blanks).
   * For tabs whose header is not on the first row (e.g. a title/instruction
   * banner above the table) — the caller locates the header itself. */
  grids: Record<string, string[][]>;
}

export function parseXlsx(buf: Buffer): XlsxWorkbook {
  const files = readZip(buf);

  const workbookXml = files.get('xl/workbook.xml')?.toString('utf8');
  const relsXml = files.get('xl/_rels/workbook.xml.rels')?.toString('utf8');
  if (!workbookXml || !relsXml) throw new Error('Malformed .xlsx: missing workbook parts');

  const relTargets = new Map<string, string>();
  const relMatches = relsXml.match(/<Relationship\b[^>]*\/?>(?:[\s\S]*?<\/Relationship>)?/g) ?? [];
  for (const rel of relMatches) {
    const id = rel.match(/Id="([^"]+)"/)?.[1];
    const target = rel.match(/Target="([^"]+)"/)?.[1];
    if (id && target) relTargets.set(id, target.replace(/^\/?xl\//, ''));
  }

  const sharedStringsXml = files.get('xl/sharedStrings.xml')?.toString('utf8');
  const sharedStrings = parseSharedStrings(sharedStringsXml);

  const sheetTags = workbookXml.match(/<sheet\b[^>]*\/?>/g) ?? [];
  const sheets: Record<string, Record<string, string>[]> = {};
  const grids: Record<string, string[][]> = {};

  for (const tag of sheetTags) {
    const rawName = tag.match(/name="([^"]+)"/)?.[1];
    const name = rawName ? decodeXmlEntities(rawName) : rawName;
    const rid = tag.match(/r:id="([^"]+)"/)?.[1];
    if (!name || !rid) continue;
    const target = relTargets.get(rid);
    if (!target) continue;
    const sheetXml = files.get('xl/' + target)?.toString('utf8');
    if (!sheetXml) continue;

    const rows = parseSheetRows(sheetXml, sharedStrings);
    grids[name] = rows.map((row) => Array.from(row, (cell) => cell ?? ''));
    if (!rows.length) {
      sheets[name] = [];
      continue;
    }
    const header = (rows[0] ?? []).map((h) => String(h ?? '').trim());
    const objects: Record<string, string>[] = [];
    for (const row of rows.slice(1)) {
      const obj: Record<string, string> = {};
      let hasValue = false;
      header.forEach((h, i) => {
        if (!h) return;
        const cell = row[i] ?? '';
        obj[h] = cell;
        if (cell !== '') hasValue = true;
      });
      if (hasValue) objects.push(obj);
    }
    sheets[name] = objects;
  }

  return { sheets, grids };
}
