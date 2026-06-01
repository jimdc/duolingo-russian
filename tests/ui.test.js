import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { ensureLegend, ensureStyle, LEGEND_ID, STYLE_ID } from '../src/ui.js';

const blankDoc = () =>
  parseHTML('<!doctype html><html><head></head><body></body></html>').document;

test('legend mounts in <body>, not <head> (the bug)', () => {
  const doc = blankDoc();
  const el = ensureLegend(doc);
  assert.equal(el.parentNode.tagName, 'BODY');
  assert.notEqual(el.parentNode.tagName, 'HEAD');
});

test('style mounts in <head>', () => {
  const doc = blankDoc();
  const s = ensureStyle(doc, '.rg-neut{}');
  assert.equal(s.parentNode.tagName, 'HEAD');
});

test('both are idempotent — mounting twice keeps a single node', () => {
  const doc = blankDoc();
  ensureLegend(doc);
  ensureLegend(doc);
  ensureStyle(doc, '.x{}');
  ensureStyle(doc, '.x{}');
  assert.equal(doc.querySelectorAll('#' + LEGEND_ID).length, 1);
  assert.equal(doc.querySelectorAll('#' + STYLE_ID).length, 1);
});
