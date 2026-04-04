/**
 * Skill Format Suggestion Tests
 *
 * Validates that all user-facing command suggestions in source files
 * use the /gsd-xxx (dash) format, not the legacy /gsd:xxx (colon) format.
 *
 * After the migration from slash commands to skills, the canonical invocation
 * format is /gsd-xxx. The install.js converter handles backward compatibility
 * for any remaining colon-format references, but source files should use
 * the dash format directly.
 *
 * Closes #1619
 */

// Enable test-mode exports from install.js
process.env.GSD_TEST_MODE = '1';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Directories containing user-facing suggestion text
const SCAN_DIRS = [
  path.join(ROOT, 'agents'),
  path.join(ROOT, 'get-shit-done', 'workflows'),
  path.join(ROOT, 'hooks'),
  path.join(ROOT, 'get-shit-done', 'bin', 'lib'),
];

const EXTENSIONS = new Set(['.md', '.js', '.cjs', '.sh']);

// Regex that matches the legacy colon format: /gsd:command-name
const LEGACY_PATTERN = /\/gsd:[a-z][a-z0-9-]*/gi;

function collectFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath));
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('skill format suggestions (#1619)', () => {
  for (const dir of SCAN_DIRS) {
    const dirLabel = path.relative(ROOT, dir);

    test(`${dirLabel}/ has no legacy /gsd:xxx references`, () => {
      const files = collectFiles(dir);
      const violations = [];

      for (const filePath of files) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const matches = content.match(LEGACY_PATTERN);
        if (matches) {
          const relPath = path.relative(ROOT, filePath);
          violations.push(`${relPath}: ${[...new Set(matches)].join(', ')}`);
        }
      }

      assert.equal(
        violations.length,
        0,
        `Found legacy /gsd:xxx format in ${violations.length} file(s):\n` +
        violations.join('\n')
      );
    });
  }

  test('install.js Claude default command uses dash format', () => {
    const installJs = fs.readFileSync(
      path.join(ROOT, 'bin', 'install.js'),
      'utf-8'
    );
    // The Claude default (before runtime-specific overrides) should use dash
    assert.ok(
      installJs.includes("let command = '/gsd-new-project'"),
      'install.js default command should be /gsd-new-project (dash format)'
    );
    // The reapply-patches default for Claude should also use dash
    assert.ok(
      installJs.includes(": '/gsd-reapply-patches'"),
      'install.js reapply-patches default should be /gsd-reapply-patches (dash format)'
    );
  });

  test('install.js Codex agent conversion handles dash format', () => {
    const { convertClaudeAgentToCodexAgent } = require(
      path.join(ROOT, 'bin', 'install.js')
    );

    const agentContent = `---
name: gsd-test
description: Test agent
tools: Read
---

Run \`/gsd-execute-phase 3\` to proceed.
Or legacy: \`/gsd:plan-phase 4\`.
File path: node "$HOME/.codex/get-shit-done/bin/gsd-tools.cjs"`;

    const result = convertClaudeAgentToCodexAgent(agentContent);

    // New dash format should be converted to $gsd-xxx
    assert.ok(
      result.includes('$gsd-execute-phase'),
      'dash format /gsd-xxx should convert to $gsd-xxx'
    );

    // Legacy colon format should still be converted
    assert.ok(
      result.includes('$gsd-plan-phase'),
      'colon format /gsd:xxx should still convert to $gsd-xxx'
    );

    // File paths should NOT be mangled
    assert.ok(
      result.includes('gsd-tools.cjs'),
      'file paths containing gsd-tools should not be mangled'
    );
  });
});
