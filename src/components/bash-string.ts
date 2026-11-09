export type BashString = string & {
  readonly __brand__: unique symbol;
};

// Stands in for interpolated values while dedenting, so their contents never affect the indentation.
// NUL can't appear in a shell script, so it can't collide with the template's own text.
const PLACEHOLDER = '\0';

/**
 * Tags a step's `run:` script, letting it be indented to match the code around it:
 *
 * ```ts
 * run: bash`
 *   if git diff --quiet; then
 *     echo "changed=false" >> "$GITHUB_OUTPUT"
 *   fi
 * `,
 * ```
 *
 * The line break after the opening backtick is dropped, whitespace-only lines are emptied, and the
 * indentation shared by the remaining lines is removed. Interpolated values are inserted unchanged.
 */
export function bash(strings: TemplateStringsArray, ...values: unknown[]): BashString {
  const parts = dedent(strings.join(PLACEHOLDER)).split(PLACEHOLDER);
  return parts.reduce((script, part, i) => `${script}${values[i - 1]}${part}`) as BashString;
}

function dedent(text: string): string {
  const lines = text.split('\n');
  if (lines.length > 1 && isBlank(lines[0])) {
    lines.shift();
  }
  const indent = commonIndent(lines.filter((line) => !isBlank(line)));
  return lines.map((line) => (isBlank(line) ? '' : line.slice(indent.length))).join('\n');
}

function isBlank(line: string): boolean {
  return line.trim() === '';
}

function commonIndent(lines: string[]): string {
  const indents = lines.map((line) => /^[ \t]*/.exec(line)![0]);
  return indents.reduce(sharedPrefix, indents[0] ?? '');
}

function sharedPrefix(a: string, b: string): string {
  let length = 0;
  while (length < a.length && a[length] === b[length]) {
    length++;
  }
  return a.slice(0, length);
}

export function ghaTemplateString(s: string): string {
  return `\${{ ${s} }}`;
}
