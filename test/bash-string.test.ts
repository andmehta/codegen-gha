import { describe, expect, it } from 'vitest';
import { bash } from '../src/components/bash-string.ts';
import { BashStep } from '../src/components/step.ts';

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
    expect(bash`
        echo one
  \t
        echo two
    `).toBe('echo one\n\necho two\n');
  });

  it('removes indentation made of tabs', () => {
    expect(bash`
\t\techo one
\t\t\techo two
\t`).toBe('echo one\n\techo two\n');
  });

  it('only removes indentation that every line shares exactly', () => {
    expect(bash`
\t  echo tab
  \techo space
`).toBe('\t  echo tab\n  \techo space\n');
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
