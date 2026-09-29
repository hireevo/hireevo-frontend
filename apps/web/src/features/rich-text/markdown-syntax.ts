/**
 * What a toolbar button does to the text and the selection.
 *
 * Pure, so the fiddly part — where the cursor lands after "bold" wraps two
 * words — is tested on its own rather than through a rendered textarea.
 */
export type MarkdownAction = 'bold' | 'italic' | 'bulletList' | 'numberedList';

export type MarkdownEdit = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export function applyMarkdown(
  text: string,
  start: number,
  end: number,
  action: MarkdownAction,
): MarkdownEdit {
  if (action === 'bold') return wrap(text, start, end, '**');
  if (action === 'italic') return wrap(text, start, end, '_');
  return list(text, start, end, action === 'numberedList');
}

/**
 * Surrounds the selection with `marker`, or opens an empty pair with the cursor
 * inside it when nothing is selected — the way pressing Bold with no selection
 * behaves everywhere else.
 */
function wrap(text: string, start: number, end: number, marker: string): MarkdownEdit {
  const selected = text.slice(start, end);
  const value = `${text.slice(0, start)}${marker}${selected}${marker}${text.slice(end)}`;
  return {
    value,
    selectionStart: start + marker.length,
    selectionEnd: end + marker.length,
  };
}

/**
 * Prefixes every line the selection touches, so selecting three lines and
 * pressing the bullet button makes all three a list, not just the first.
 *
 * The selection is widened to whole lines first: a list marker belongs at the
 * start of a line, not in the middle of the word the cursor happened to sit in.
 */
function list(text: string, start: number, end: number, numbered: boolean): MarkdownEdit {
  const lineStart = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const after = text.indexOf('\n', end);
  const lineEnd = after === -1 ? text.length : after;

  const block = text
    .slice(lineStart, lineEnd)
    .split('\n')
    .map((line, index) => (numbered ? `${index + 1}. ${line}` : `- ${line}`))
    .join('\n');

  return {
    value: `${text.slice(0, lineStart)}${block}${text.slice(lineEnd)}`,
    selectionStart: lineStart,
    selectionEnd: lineStart + block.length,
  };
}
