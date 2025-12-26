import { Buffer } from 'node:buffer';

const escapePdfText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const wrapText = (text: string, maxChars: number) => {
  const lines = text.split(/\r?\n/);
  const wrapped: string[] = [];

  lines.forEach((line) => {
    if (!line.trim()) {
      wrapped.push('');
      return;
    }

    const words = line.split(/\s+/);
    let current = '';
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= maxChars) {
        current = next;
        return;
      }

      if (current) {
        wrapped.push(current);
        current = word;
        return;
      }

      // hard split a single long word
      let remaining = word;
      while (remaining.length > maxChars) {
        wrapped.push(remaining.slice(0, maxChars));
        remaining = remaining.slice(maxChars);
      }
      current = remaining;
    });

    if (current) {
      wrapped.push(current);
    }
  });

  return wrapped;
};

type ContractBlock =
  | { type: 'heading'; content: string; level: 'main' | 'sub' }
  | { type: 'paragraph'; content: string }
  | { type: 'list'; items: string[] };

const stripToBeConfirmed = (line: string) =>
  line.replace(/\[?\(?\s*TO BE CONFIRMED\s*\)?\]?/gi, '').trim();

const getHeadingInfo = (
  rawLine: string,
): { content: string; level: 'main' | 'sub' } | null => {
  if (!rawLine) return null;
  const trimmed = stripToBeConfirmed(rawLine.trim());
  if (!trimmed) return null;
  if (trimmed.length > 140) return null;

  if (/^\d+(\.\d+)+\s+/.test(trimmed)) return { content: trimmed, level: 'sub' };
  if (/^\d+(\.\d+)*\s+/.test(trimmed)) return { content: trimmed, level: 'main' };
  if (trimmed.endsWith(':')) return { content: trimmed.replace(/:$/, ''), level: 'main' };
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed))
    return { content: trimmed, level: 'main' };
  if (/^[A-Z][A-Z\s/&,\-()]*$/.test(trimmed)) return { content: trimmed, level: 'main' };
  return null;
};

const formatContractText = (text: string): ContractBlock[] => {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const blocks: ContractBlock[] = [];
  let buffer: string[] = [];

  const flushBuffer = () => {
    if (!buffer.length) return;
    const merged = buffer.join(' ').replace(/\s+/g, ' ').trim();
    if (merged) {
      blocks.push({ type: 'paragraph', content: merged });
    }
    buffer = [];
  };

  lines.forEach((raw) => {
    const trimmed = raw.trim();

    if (!trimmed) {
      flushBuffer();
      return;
    }

    const listMatch = /^[-*]\s+/.test(trimmed);
    if (listMatch) {
      flushBuffer();
      blocks.push({ type: 'list', items: [trimmed.replace(/^[-*]\s+/, '')] });
      return;
    }

    const heading = getHeadingInfo(trimmed);
    if (heading) {
      flushBuffer();
      blocks.push({ type: 'heading', content: heading.content, level: heading.level });
      return;
    }

    buffer.push(trimmed);
  });

  flushBuffer();
  return blocks;
};

type RenderLine = {
  text: string;
  style: 'heading' | 'subheading' | 'list' | 'normal';
};

const buildRenderLines = (text: string) => {
  const blocks = formatContractText(text);
  const lines: RenderLine[] = [];

  blocks.forEach((block, idx) => {
    if (block.type === 'heading') {
      if (idx > 0) lines.push({ text: '', style: 'normal' });
      const wrapped = wrapText(block.content, 90);
      wrapped.forEach((line) =>
        lines.push({
          text: line,
          style: block.level === 'main' ? 'heading' : 'subheading',
        }),
      );
      return;
    }

    if (block.type === 'list') {
      block.items.forEach((item) => {
        const wrapped = wrapText(`- ${item}`, 92);
        wrapped.forEach((line) =>
          lines.push({ text: line, style: 'list' }),
        );
      });
      return;
    }

    const wrapped = wrapText(block.content, 96);
    wrapped.forEach((line) => lines.push({ text: line, style: 'normal' }));
  });

  return lines;
};

const splitPlaceholders = (text: string) => {
  const segments = text.split(/(\[[^\]]+\]|TO BE CONFIRMED)/gi);
  return segments
    .filter((seg) => seg.length > 0)
    .map((seg) => ({
      text: seg,
      bold: /^(\[[^\]]+\]|TO BE CONFIRMED)$/i.test(seg),
    }));
};

export const buildPdfBuffer = (text: string) => {
  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const marginX = 54;
  const marginY = 60;
  const fontSize = 11;
  const lineHeight = 15;
  const renderLines = buildRenderLines(text);
  const maxLinesPerPage = Math.floor(
    (pageHeight - marginY * 2) / lineHeight,
  );

  const pages: RenderLine[][] = [];
  for (let i = 0; i < renderLines.length; i += maxLinesPerPage) {
    pages.push(renderLines.slice(i, i + maxLinesPerPage));
  }

  const offsets: number[] = [];
  const parts: Buffer[] = [];
  let cursor = 0;

  const push = (chunk: string | Buffer) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf8');
    parts.push(buf);
    cursor += buf.length;
  };

  const addObject = (id: number, body: string) => {
    offsets[id] = cursor;
    push(`${id} 0 obj\n${body}\nendobj\n`);
  };

  push('%PDF-1.4\n');

  const pageCount = Math.max(pages.length, 1);
  const pageIds = Array.from({ length: pageCount }, (_, idx) => 3 + idx);
  const fontId = 3 + pageCount;
  const boldFontId = fontId + 1;
  const contentIds = Array.from(
    { length: pageCount },
    (_, idx) => boldFontId + 1 + idx,
  );

  addObject(1, `<< /Type /Catalog /Pages 2 0 R >>`);
  addObject(
    2,
    `<< /Type /Pages /Count ${pageCount} /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(' ')}] >>`,
  );

  pageIds.forEach((pageId, idx) => {
    addObject(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentIds[idx]} 0 R >>`,
    );
  });

  addObject(fontId, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
  addObject(boldFontId, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`);

  contentIds.forEach((contentId, idx) => {
    const pageLines = pages[idx] || [{ text: '', style: 'normal' }];
    const contentParts: string[] = [
      'BT',
      `${marginX} ${pageHeight - marginY} Td`,
      `${lineHeight} TL`,
    ];

    let currentFont = '';
    let currentSize = 0;

    const setFont = (font: string, size: number) => {
      if (font === currentFont && size === currentSize) return;
      currentFont = font;
      currentSize = size;
      contentParts.push(`/${font} ${size} Tf`);
    };

    pageLines.forEach((line) => {
      if (!line.text) {
        contentParts.push('T*');
        return;
      }

      const isHeading = line.style === 'heading';
      const isSubHeading = line.style === 'subheading';
      const baseFont = isHeading || isSubHeading ? 'F2' : 'F1';
      const baseSize = isHeading ? 14 : isSubHeading ? 12 : fontSize;

      setFont(baseFont, baseSize);

      const segments = splitPlaceholders(line.text);
      segments.forEach((segment) => {
        const font = segment.bold ? 'F2' : baseFont;
        setFont(font, baseSize);
        contentParts.push(`(${escapePdfText(segment.text)}) Tj`);
      });

      contentParts.push('T*');
    });

    contentParts.push('ET');

    const contentStream = contentParts.join('\n');

    const streamBuffer = Buffer.from(contentStream, 'utf8');
    addObject(
      contentId,
      `<< /Length ${streamBuffer.length} >>\nstream\n${contentStream}\nendstream`,
    );
  });

  const xrefStart = cursor;
  push(`xref\n0 ${offsets.length}\n`);
  push(`0000000000 65535 f \n`);
  for (let i = 1; i < offsets.length; i += 1) {
    const offset = offsets[i] || 0;
    push(`${String(offset).padStart(10, '0')} 00000 n \n`);
  }

  push(
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`,
  );

  return Buffer.concat(parts);
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const b of buf) {
    c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

const buildZip = (entries: { name: string; data: Buffer }[]) => {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  const records: {
    name: Buffer;
    crc: number;
    size: number;
    offset: number;
  }[] = [];

  let offset = 0;

  entries.forEach((entry) => {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const dataBuf = entry.data;
    const crc = crc32(dataBuf);
    const size = dataBuf.length;

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(0, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(size, 18);
    header.writeUInt32LE(size, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28);

    localChunks.push(header, nameBuf, dataBuf);

    records.push({ name: nameBuf, crc, size, offset });
    offset += header.length + nameBuf.length + size;
  });

  records.forEach((record) => {
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(0, 12);
    header.writeUInt16LE(0, 14);
    header.writeUInt32LE(record.crc, 16);
    header.writeUInt32LE(record.size, 20);
    header.writeUInt32LE(record.size, 24);
    header.writeUInt16LE(record.name.length, 28);
    header.writeUInt16LE(0, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE(0, 38);
    header.writeUInt32LE(record.offset, 42);

    centralChunks.push(header, record.name);
  });

  const centralSize = centralChunks.reduce((sum, b) => sum + b.length, 0);
  const centralOffset = offset;

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(records.length, 8);
  end.writeUInt16LE(records.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, ...centralChunks, end]);
};

export const buildDocxBuffer = (text: string) => {
  const renderLines = buildRenderLines(text);
  const paragraphs = renderLines
    .map((line) => {
      if (!line.text.trim()) return '<w:p/>';
      const segments = splitPlaceholders(line.text);
      const isHeading = line.style === 'heading';
      const isSubHeading = line.style === 'subheading';
      const size = isHeading ? 28 : isSubHeading ? 24 : 22;
      const baseBold = isHeading || isSubHeading;
      const runs = segments
        .map((segment) => {
          const bold = baseBold || segment.bold ? '<w:b/>' : '';
          const escaped = escapeXml(segment.text);
          return `<w:r><w:rPr>${bold}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r>`;
        })
        .join('');
      return `<w:p>${runs}</w:p>`;
    })
    .join('');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  return buildZip([
    { name: '[Content_Types].xml', data: Buffer.from(contentTypesXml, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(relsXml, 'utf8') },
    { name: 'word/document.xml', data: Buffer.from(documentXml, 'utf8') },
  ]);
};
