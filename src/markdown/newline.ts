export function newlineOf(content: string): '\r\n' | '\n' { return content.includes('\r\n') ? '\r\n' : '\n'; }
export function withFinalNewline(content: string, newline: string): string { return content.replace(/(?:\r\n|\n)+$/u, '') + newline; }

export interface IndexedLine { text: string; start: number; }

export function indexedLines(content: string): IndexedLine[] {
  const lines: IndexedLine[] = [];
  let start = 0;
  for (const match of content.matchAll(/\r\n|\n/gu)) {
    const end = match.index;
    lines.push({ text: content.slice(start, end), start });
    start = end + match[0].length;
  }
  lines.push({ text: content.slice(start), start });
  return lines;
}

export function lineStartOffset(lines: readonly IndexedLine[], index: number, contentLength: number): number {
  return lines[index]?.start ?? contentLength;
}

function leadingNewlineCount(content: string, offset: number): number {
  let count = 0;
  let cursor = offset;
  while (cursor < content.length) {
    if (content.slice(cursor, cursor + 2) === '\r\n') cursor += 2;
    else if (content[cursor] === '\n') cursor += 1;
    else break;
    count += 1;
  }
  return count;
}

function trailingNewlineCount(content: string, offset: number): number {
  let count = 0;
  let cursor = offset;
  while (cursor > 0) {
    if (cursor >= 2 && content.slice(cursor - 2, cursor) === '\r\n') cursor -= 2;
    else if (content[cursor - 1] === '\n') cursor -= 1;
    else break;
    count += 1;
  }
  return count;
}

export function insertBlockAt(content: string, offset: number, block: string, newline: '\r\n' | '\n'): string {
  const before = content.slice(0, offset);
  const after = content.slice(offset);
  const beforePadding = offset === 0 ? '' : newline.repeat(Math.max(0, 2 - trailingNewlineCount(content, offset)));
  const afterPadding = offset === content.length ? newline : newline.repeat(Math.max(0, 2 - leadingNewlineCount(content, offset)));
  return `${before}${beforePadding}${block}${afterPadding}${after}`;
}
