import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('app exibe o catálogo completo sem controles de filtro', async () => {
 const elements = new Map();
 for (const id of ['results','count','last-updated']) elements.set(id,{innerHTML:'',textContent:'',hidden:false});
 const element = id => {
  assert.ok(elements.has(id), `Elemento inesperado: ${id}`);
  return elements.get(id);
 };
 const oldDocument = globalThis.document;
 const oldFetch = globalThis.fetch;
 try {
  globalThis.document = {getElementById:element,createElement:()=>({})};
  globalThis.fetch = async () => ({ok:true,json:async()=>JSON.parse(await readFile('data/conferences.json','utf8'))});
  await import('../assets/app.js');
  const timeline = element('results').innerHTML;
  assert.match(timeline,/18 de jan\. de 2027/);
  assert.match(timeline,/Inserido manualmente/);
  assert.match(timeline,/🇧🇷/);
  assert.match(timeline,/aria-label="Conferência brasileira"/);
  assert.ok(timeline.indexOf('deadline-chart') < timeline.indexOf('<table>'));
  assert.match(timeline,/<table>/);
  const list = element('results').innerHTML;
  assert.match(list,/18 de jan\. de 2027/);
  assert.match(list,/Artigos completos/);
  assert.match(list,/Inserido manualmente/);
  assert.match(timeline,/ITiCSE/i);
  assert.match(timeline,/Koli Calling/);
  const data = JSON.parse(await readFile('data/conferences.json','utf8'));
  const slugs = new Set(data.map(v=>v.slug));
  assert.equal((timeline.match(/<tr id=/g)||[]).length,slugs.size);
  const html = await readFile('index.html','utf8');
  assert.doesNotMatch(html,/<form|id="(?:filters|query|area-buttons)"|Limpar filtros/);
 } finally {globalThis.document=oldDocument;globalThis.fetch=oldFetch;}
});
