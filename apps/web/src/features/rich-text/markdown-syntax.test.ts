import { describe, expect, it } from 'vitest';
import { applyMarkdown } from './markdown-syntax.ts';

describe('applyMarkdown', () => {
  it('wraps a selection in bold and keeps it selected', () => {
    expect(applyMarkdown('hello world', 0, 5, 'bold')).toEqual({
      value: '**hello** world',
      selectionStart: 2,
      selectionEnd: 7,
    });
  });

  it('wraps a selection in italics with underscores', () => {
    expect(applyMarkdown('hello', 0, 5, 'italic')).toEqual({
      value: '_hello_',
      selectionStart: 1,
      selectionEnd: 6,
    });
  });

  it('opens an empty pair with the cursor inside when nothing is selected', () => {
    expect(applyMarkdown('ab', 1, 1, 'bold')).toEqual({
      value: 'a****b',
      selectionStart: 3,
      selectionEnd: 3,
    });
  });

  it('prefixes every line the selection touches with a bullet', () => {
    const text = 'one\ntwo\nthree';
    // Selection starts inside "one" and ends inside "three".
    expect(applyMarkdown(text, 1, 10, 'bulletList')).toEqual({
      value: '- one\n- two\n- three',
      selectionStart: 0,
      selectionEnd: 19,
    });
  });

  it('numbers the lines it touches', () => {
    expect(applyMarkdown('a\nb', 0, 3, 'numberedList')).toEqual({
      value: '1. a\n2. b',
      selectionStart: 0,
      selectionEnd: 9,
    });
  });
});
