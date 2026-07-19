import type { DateFormatter } from './daily-note-path';

export function renderTemplate(template: string, title: string, format: DateFormatter): string {
  return template.replace(/\{\{(title|date|time)(?::([^}]+))?\}\}/gu, (_whole, token: string, custom: string | undefined) => {
    if (token === 'title') return title;
    return format(custom ?? (token === 'date' ? 'YYYY-MM-DD' : 'HH:mm'));
  });
}
