import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('app exibe o catálogo completo sem controles de filtro', async () => {
 const elements = new Map();
 for (const id of ['results','count','last-updated']) elements.set(id,{innerHTML:'',textContent:'',hidden:false,addEventListener(){}});
 const element = id => {
  assert.ok(elements.has(id), `Elemento inesperado: ${id}`);
  return elements.get(id);
 };
 const OriginalDate = globalThis.Date;
 const oldDocument = globalThis.document;
 const oldFetch = globalThis.fetch;
 try {
  globalThis.Date = class extends OriginalDate {constructor(...args){super(...(args.length ? args : ['2026-11-22T12:00:00Z']));}};
  globalThis.document = {getElementById:element,createElement:()=>({})};
  globalThis.fetch = async () => ({ok:true,json:async()=>JSON.parse(await readFile('data/conferences.json','utf8'))});
  await import('../assets/app.js');
  const timeline = element('results').innerHTML;
  assert.match(timeline,/18 de jan\. de 2027/);
  assert.match(timeline,/Inserido manualmente/);
  assert.match(timeline,/🇧🇷/);
  assert.match(timeline,/aria-label="Conferência brasileira"/);
  for (const flag of ['🇺🇸','🇨🇦','🇲🇽','🇧🇴','🇦🇺','🇮🇳','🇪🇺']) {
   assert.ok(timeline.split('<table>')[0].includes(flag), `Bandeira ausente na timeline: ${flag}`);
   assert.ok(timeline.split('<table>')[1].includes(flag), `Bandeira ausente na lista: ${flag}`);
  }
  for (const country of ['Reino Unido','Romênia','Itália']) assert.ok(timeline.includes(`title="Europa — ${country}">🇪🇺</span>`));
  assert.doesNotMatch(timeline,/🇬🇧|🇷🇴|🇮🇹/);
  assert.ok(timeline.indexOf('deadline-chart') < timeline.indexOf('<table>'));
  assert.match(timeline,/<table>/);
  const list = element('results').innerHTML;
  assert.match(list,/18 de jan\. de 2027/);
  assert.match(list,/Artigos completos/);
  assert.match(list,/Inserido manualmente/);
  assert.match(timeline,/ITiCSE/i);
  assert.match(timeline,/Koli Calling/);
  assert.match(timeline,/<th scope="col">Deadline<\/th><th scope="col">Data da conferência<\/th>/);
  assert.match(timeline,/event-marker event-range certainty-confirmed/);
  assert.match(timeline,/event-marker event-range certainty-estimated/);
  assert.match(timeline,/Realização:.*Dallas, Estados Unidos/);
  assert.match(timeline,/<span class="sub event-location">São Paulo, Brasil<\/span>/);
  assert.match(timeline,/Confirmado · dias a confirmar/);
  assert.match(timeline,/Local a confirmar/);
  assert.match(element('last-updated').textContent,/Catálogo atualizado automaticamente em: 22\/11\/2026/);
  const data = JSON.parse(await readFile('data/conferences.json','utf8'));
  const slugs = new Set(data.map(v=>v.slug));
  assert.equal((timeline.match(/<tr id=/g)||[]).length,slugs.size);
  const html = await readFile('index.html','utf8');
  assert.doesNotMatch(html,/<form|id="(?:filters|query|area-buttons)"|Limpar filtros/);
 } finally {globalThis.Date=OriginalDate;globalThis.document=oldDocument;globalThis.fetch=oldFetch;}
});
