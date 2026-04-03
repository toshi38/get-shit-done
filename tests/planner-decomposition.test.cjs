'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('gsd-planner.md modular decomposition', () => {
  const plannerPath = path.join(ROOT, 'agents', 'gsd-planner.md');
  let content;

  function read() {
    if (!content) content = fs.readFileSync(plannerPath, 'utf-8');
    return content;
  }

  test('planner file exists', () => {
    assert.ok(fs.existsSync(plannerPath));
  });

  test('planner is under 50000 chars after decomposition (CRLF-normalized)', () => {
    const normalized = read().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    assert.ok(
      normalized.length < 50000,
      `gsd-planner.md is ${normalized.length} chars — exceeds 50K early-warning threshold. Extract more content to reference files.`
    );
  });

  test('planner references planner-gap-closure.md', () => {
    assert.ok(
      read().includes('planner-gap-closure.md'),
      'Missing reference to planner-gap-closure.md — gap closure mode should be extracted'
    );
  });

  test('planner references planner-revision.md', () => {
    assert.ok(
      read().includes('planner-revision.md'),
      'Missing reference to planner-revision.md — revision mode should be extracted'
    );
  });

  test('planner references planner-reviews.md', () => {
    assert.ok(
      read().includes('planner-reviews.md'),
      'Missing reference to planner-reviews.md — reviews mode should be extracted'
    );
  });

  test('planner contains load_mode_context step', () => {
    assert.ok(
      read().includes('load_mode_context'),
      'Missing load_mode_context step — conditional Read logic must be in execution_flow'
    );
  });

  test('gap closure reference file exists', () => {
    const ref = path.join(ROOT, 'get-shit-done', 'references', 'planner-gap-closure.md');
    assert.ok(fs.existsSync(ref), 'planner-gap-closure.md reference file is missing');
  });

  test('revision reference file exists', () => {
    const ref = path.join(ROOT, 'get-shit-done', 'references', 'planner-revision.md');
    assert.ok(fs.existsSync(ref), 'planner-revision.md reference file is missing');
  });

  test('reviews reference file exists', () => {
    const ref = path.join(ROOT, 'get-shit-done', 'references', 'planner-reviews.md');
    assert.ok(fs.existsSync(ref), 'planner-reviews.md reference file is missing');
  });

  test('gap closure reference file contains key content', () => {
    const ref = path.join(ROOT, 'get-shit-done', 'references', 'planner-gap-closure.md');
    const text = fs.readFileSync(ref, 'utf-8');
    assert.ok(
      text.toLowerCase().includes('gap') && text.toLowerCase().includes('closure'),
      'planner-gap-closure.md should contain gap closure instructions'
    );
  });

  test('revision reference file contains key content', () => {
    const ref = path.join(ROOT, 'get-shit-done', 'references', 'planner-revision.md');
    const text = fs.readFileSync(ref, 'utf-8');
    assert.ok(
      text.toLowerCase().includes('revision') || text.toLowerCase().includes('checker'),
      'planner-revision.md should contain revision/checker feedback instructions'
    );
  });

  test('reviews reference file contains key content', () => {
    const ref = path.join(ROOT, 'get-shit-done', 'references', 'planner-reviews.md');
    const text = fs.readFileSync(ref, 'utf-8');
    assert.ok(
      text.toLowerCase().includes('review'),
      'planner-reviews.md should contain review-based replanning instructions'
    );
  });
});

describe('security scanner agentSource threshold', () => {
  const { scanForInjection } = require('../get-shit-done/bin/lib/security.cjs');

  test('agent source files use 100K threshold, not 50K', () => {
    // A 60K string should fail user-input check but pass agent-source check
    const sixtyK = 'A'.repeat(60000);
    const userResult = scanForInjection(sixtyK, { strict: true });
    const agentResult = scanForInjection(sixtyK, { strict: true, agentSource: true });
    assert.ok(!userResult.clean, '60K should fail user-input 50K threshold');
    assert.ok(agentResult.clean, '60K should pass agent-source 100K threshold');
  });

  test('agent source files still rejected over 100K', () => {
    const oneHundredTenK = 'A'.repeat(110000);
    const result = scanForInjection(oneHundredTenK, { strict: true, agentSource: true });
    assert.ok(!result.clean, '110K should fail even the agent-source 100K threshold');
  });
});
