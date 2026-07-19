export function newlineOf(content: string): '\r\n' | '\n' { return content.includes('\r\n') ? '\r\n' : '\n'; }
export function withFinalNewline(content: string, newline: string): string { return content.replace(/(?:\r\n|\n)+$/u, '') + newline; }
