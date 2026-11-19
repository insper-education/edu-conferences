import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('app renderiza a data manual do EduComp na timeline e na lista', async () => {
 const elements = new Map();
 const element = id => {
  if (!elements.has(id)) elements.set(id,{value:'',innerHTML:'',textContent:'',listeners:{},
   addEventListener(event,handler){this.listeners[event]=handler;},append(){},setAttribute(){}});
  return elements.get(id);
 };
 const oldDocument = globalThis.document;
 const oldFetch = globalThis.fetch;
 try {
  globalThis.document = {getElementById:element,createElement:()=>({})};
  globalThis.fetch = async () => ({ok:true,json:async()=>JSON.parse(await readFile('data/conferences.json','utf8'))});
  element('query').value='educomp';
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
  element('query').value='iticse';
  element('filters').listeners.input();
  const filtered = element('results').innerHTML;
  assert.match(filtered,/deadline-chart/);
  assert.match(filtered,/<table>/);
  assert.doesNotMatch(filtered,/EduComp/i);
  assert.match(filtered,/ITiCSE/i);
  assert.doesNotMatch(filtered,/🇧🇷/);
  element('query').value='koli';
  element('filters').listeners.input();
  const undated = element('results').innerHTML;
  assert.match(undated,/jul\. de 2027/);
  assert.match(undated,/certainty-estimated/);
  assert.match(undated,/<table>/);
  assert.match(undated,/deadline-chart/);
  assert.match(undated.split('<table>')[0],/Koli Calling/);
  const clickFilter = (filter,value) => element('filters').listeners.click({target:{closest:()=>({dataset:{filter,value}})}});
  const data = JSON.parse(await readFile('data/conferences.json','utf8'));
  const otherArea = data.find(v=>v.area !== data.find(v=>v.slug==='koli').area).area;
  clickFilter('area',otherArea);
  assert.match(element('results').innerHTML,/Nenhum venue encontrado/);
  const koliArea = data.find(v=>v.slug==='koli').area;
  clickFilter('area',koliArea);
  assert.match(element('results').innerHTML,/Koli Calling/);
  assert.equal((element('area-buttons').innerHTML.match(/aria-pressed="true"/g)||[]).length,2);
  clickFilter('area',koliArea);
  assert.match(element('results').innerHTML,/Nenhum venue encontrado/);
  clickFilter('area',otherArea);
  assert.match(element('results').innerHTML,/Koli Calling/);
  element('query').value='inexistente-xyz';
  element('filters').listeners.input();
  assert.match(element('results').innerHTML,/Nenhum venue encontrado/);
  assert.doesNotMatch(element('results').innerHTML,/<table>|deadline-chart/);
 } finally {globalThis.document=oldDocument;globalThis.fetch=oldFetch;}
});
