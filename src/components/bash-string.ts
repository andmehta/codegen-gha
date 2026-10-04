export type BashString = string & {
  readonly __brand__: unique symbol;
};

const SPACE = ' ';
const EMPTY_STRING = '';
const NEWLINE = '\n';

/**
 * TODO:
 * pick up with some string helping here
 * ideally it should do some friendly whitespace cleanup
 * and who knows what else
 */
export function bash(strings: TemplateStringsArray, ...values: unknown[]): BashString {
  let out = '';
  if (strings.length !== values.length + 1) {
    throw new Error('apparently im doing this wrong');
  }
  /**
   * Make a copy so we can mutate comfortably
   */
  const stringsCopy = [...strings];
  /**
   * Strip the first newline so that stuff looks more like we expect it to
   */
  if (stringsCopy[0]?.startsWith(NEWLINE)) {
    stringsCopy[0] = stringsCopy[0].replace(NEWLINE, EMPTY_STRING);
  }

  /**
   * Do normal template string stuff
   */
  for (let i = 0; i < stringsCopy.length; i++) {
    const str = stringsCopy[i];
    const val = values[i];
    out += `${str}`;
    if (i < values.length) {
      out += `${val}`;
    }
  }

  /**
   * Do hacky things to try to force spacing alignment for cleanliness
   * First split on newlines
   * then see how many spaces the first line starts with
   * (remember that we already trimmed the leading newline above)
   * If every non-empty line starts with that many spaces, remove it from all of them
   */
  const lines = out.split(NEWLINE);
  const firstLine = lines[0];
  let spacesLeadingFirstLine = 0;
  for (let i = 0; i < firstLine.length; i++) {
    const char = firstLine[i];
    if (char === SPACE) {
      spacesLeadingFirstLine++;
    } else {
      break;
    }
  }
  const toTrim = SPACE.repeat(spacesLeadingFirstLine);
  if (spacesLeadingFirstLine > 0 && lines.every(l => l.startsWith(toTrim) || l === EMPTY_STRING)) {
    return lines.map(l => l.replace(toTrim, EMPTY_STRING)).join(NEWLINE) as BashString;
  }

  return out as BashString;
}

export function ghaTemplateString(s: string): string {
  return `\${{ ${s} }}`;
}
