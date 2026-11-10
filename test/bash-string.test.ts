import { describe, expect, it } from 'vitest';
import { bash } from '../src/components/bash-string.ts';
import { BashStep } from '../src/components/step.ts';

// Builds the template a source file would hold, for text such as tab indentation that's unreadable inline
function bashFrom(source: string) {
  return bash(Object.assign([source], { raw: [source] }));
}

describe('bash', () => {
  it('leaves a single line as-is', () => {
    expect(bash`pnpm test`).toBe('pnpm test');
  });

  it('leaves a script already at column 0 as-is', () => {
    expect(bash`
pnpm install
pnpm test
`).toBe('pnpm install\npnpm test\n');
  });

  it('removes the indentation shared by every line', () => {
    const script = bash`
        if git diff --quiet; then
          echo "changed=false" >> "$GITHUB_OUTPUT"
        fi
    `;
    expect(script).toBe('if git diff --quiet; then\n  echo "changed=false" >> "$GITHUB_OUTPUT"\nfi\n');
  });

  it('dedents by the shallowest line, even when it is not the first', () => {
    const script = bash`
          echo nested
        echo outer
    `;
    expect(script).toBe('  echo nested\necho outer\n');
  });

  it('empties whitespace-only lines and ignores them when dedenting', () => {
    expect(bashFrom('\n        echo one\n  \t\n        echo two\n    ')).toBe('echo one\n\necho two\n');
  });

  it('removes indentation made of tabs', () => {
    expect(bashFrom('\n\t\techo one\n\t\t\techo two\n\t')).toBe('echo one\n\techo two\n');
  });

  it('only removes indentation that every line shares exactly', () => {
    expect(bashFrom('\n\t  echo tab\n  \techo space\n')).toBe('\t  echo tab\n  \techo space\n');
  });

  it('inserts interpolated values without dedenting them', () => {
    const inner = 'echo a\n    echo b';
    const script = bash`
        cd ${'"$RUNNER_TEMP"'}
        ${inner}
    `;
    expect(script).toBe('cd "$RUNNER_TEMP"\necho a\n    echo b\n');
  });

  it('counts a line that only holds an interpolated value when dedenting', () => {
    const script = bash`
      ${'echo value'}
        echo indented
    `;
    expect(script).toBe('echo value\n  echo indented\n');
  });

  it('allows an empty script', () => {
    expect(bash``).toBe('');
    expect(bash`
    `).toBe('');
  });

  describe('backslashes', () => {
    it('keeps line continuations', () => {
      const script = bash`
        jq -n \
          --arg name "$NAME"
      `;
      expect(script).toBe('jq -n \\\n  --arg name "$NAME"\n');
    });

    it.each([
      [bash`echo "{\"a\": 1}"`, 'echo "{\\"a\\": 1}"'],
      [bash`grep 'v1\.2'`, "grep 'v1\\.2'"],
      [bash`echo "\$HOME"`, 'echo "\\$HOME"'],
      [bash`printf 'a\nb\t'`, "printf 'a\\nb\\t'"],
      [bash`echo C:\\dir`, 'echo C:\\\\dir'],
    ])('passes %j to the shell as written', (script, expected) => {
      expect(script).toBe(expected);
    });

    it('unescapes a backtick and a literal ${', () => {
      expect(bash`echo \`date\` \${HOME}`).toBe('echo `date` ${HOME}');
    });

    it('keeps an escaped backslash before a backtick or ${', () => {
      expect(bash`echo \\\` \\\${HOME}`).toBe('echo \\` \\${HOME}');
    });
  });

  it('serializes an indented script as a block literal', () => {
    const step = new BashStep({
      name: 'Check for changes',
      run: bash`
          if git diff --quiet; then
            echo "changed=false" >> "$GITHUB_OUTPUT"
          fi
      `,
    });
    expect(step.toYaml().toString()).toBe(
      [
        'name: Check for changes',
        'run: |',
        '  if git diff --quiet; then',
        '    echo "changed=false" >> "$GITHUB_OUTPUT"',
        '  fi',
        '',
      ].join('\n'),
    );
  });
});
