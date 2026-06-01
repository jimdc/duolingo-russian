// Minimal DOM glue for the userscript: the gender stylesheet and the legend.
// Lives here (not inline in the build script) so the mount targets are unit-testable.

export const STYLE_ID = 'rg-style';
export const LEGEND_ID = 'rg-legend';

/** Mount the gender CSS once. A <style> belongs in <head>. */
export function ensureStyle(doc, css) {
  const existing = doc.getElementById(STYLE_ID);
  if (existing) return existing;
  const s = doc.createElement('style');
  s.id = STYLE_ID;
  s.textContent = css;
  (doc.head || doc.documentElement).appendChild(s);
  return s;
}

/** Mount the legend once. A <div> must go in <body> — in <head> it won't render. */
export function ensureLegend(doc) {
  const existing = doc.getElementById(LEGEND_ID);
  if (existing) return existing;
  const d = doc.createElement('div');
  d.id = LEGEND_ID;
  d.innerHTML =
    'RU gender: <span class="m">masc</span> · <span class="f">fem</span> · <span class="n">neut</span>';
  (doc.body || doc.documentElement).appendChild(d);
  return d;
}
