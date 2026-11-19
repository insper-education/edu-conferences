import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {statusOf, selectVenues} from '../assets/model.js';
test('datas parciais e ausentes não viram prazos exatos', () => {
 const now = new Date(2026,10,19,12);
 assert.equal(statusOf({deadline:'2026-10',deadline_precision:'month'},now),'closed');
 assert.equal(statusOf({deadline:null},now),'unknown');
 assert.equal(statusOf({deadline:'2026-11-19',deadline_precision:'day'},now),'open');
 assert.equal(statusOf({deadline:'2026-11-18',deadline_precision:'day'},now),'closed');
});
test('37 edições preservadas, filtros combinados e busca sem acentos', async () => {
 const venues = JSON.parse(await readFile('data/conferences.json','utf8'));
 assert.equal(venues.length,37);
 assert.equal(new Set(venues.map(v=>v.slug)).size,19);
 assert.equal(selectVenues(venues,{year:'2027'}).length,19);
 assert.equal(selectVenues(venues,{year:'2028'}).length,18);
 assert.equal(selectVenues(venues,{query:'simposio',year:'2027'})[0].slug,'educomp');
 assert.equal(selectVenues(venues,{query:'inexistente'}).length,0);
 assert.equal(venues.find(v=>v.id==='sigcse-ts-2027').deadline,'2026-06-26');
 assert.equal(venues.find(v=>v.id==='educon-2028').deadline,'2027-10');
 assert.equal(selectVenues(venues).at(-1).deadline,null);
});

test('eixo compartilhado preserva meses estimados, dias e posição de hoje', async () => {
 const {timelineScale} = await import('../assets/timeline.js');
 const scale = timelineScale([
  {conferencia:'Estimativa',deadline:'2027-02'},
  {conferencia:'Dia',deadline:'2027-01-15'},
  {conferencia:'Sem prazo',deadline:null}
 ],new Date(2027,0,15));
 assert.equal(scale.rows.length,2);
 assert.equal(scale.months[0].date.toISOString(),'2026-12-01T00:00:00.000Z');
 const future = timelineScale([{conferencia:'Futura',deadline:'2027-04-15'}],new Date(2026,10,19));
 assert.equal(future.months[0].date.toISOString(),'2026-10-01T00:00:00.000Z');
 assert.equal(scale.rows[0].venue.conferencia,'Dia');
 assert.equal(scale.rows[0].width,0);
 assert.equal(scale.rows[0].left,scale.today);
 assert.equal(scale.rows[1].end-scale.rows[1].start,28*86400000);
 assert.ok(scale.rows.every(r=>r.left>=0&&r.left+r.width<=100));
 assert.equal(timelineScale([{deadline:null}]),null);
 assert.equal(timelineScale([{conferencia:'Dia',deadline:'2027-01-15'}],new Date(2028,0,1)).today,null);
});

test('deadline geral inclui submissões de artigos sem etapa de resumo', async () => {
 const venues = JSON.parse(await readFile('data/conferences.json','utf8'));
 const day = selectVenues(venues,{precision:'day'});
 assert.equal(day.length,13);
 assert.ok(day.every(v=>v.deadline_precision==='day' && v.deadline_source));
 assert.equal(selectVenues(venues,{precision:'month',year:'2028'}).length,12);
 const sefi = venues.find(v=>v.id==='sefi-2027');
 assert.equal(sefi.deadline_precision,'month');
 assert.equal(statusOf(sefi),'estimated')
 assert.equal(sefi.deadline,'2027-04');;
 assert.ok(!selectVenues(venues,{status:'unknown'}).some(v=>v.id===sefi.id));
 assert.equal(venues.find(v=>v.id==='csedu-2027').deadline,'2026-12-01');
 assert.equal(venues.find(v=>v.id==='edunine-2027').deadline,'2026-09-30');
});
test('instante AoE não encerra uma chamada antes do horário publicado', () => {
 const v = {deadline:'2027-01-11',deadline_precision:'day',deadline_at:'2027-01-11T23:59:00-12:00'};
 assert.equal(statusOf(v,new Date('2027-01-12T11:58:00Z')),'open');
 assert.equal(statusOf(v,new Date('2027-01-12T12:00:00Z')),'closed');
});

test('manual substitui automático ausente, estimado ou não confirmado; confirmado vence', async () => {
 const {resolveDeadline} = await import('../assets/model.js');
 const manual = {date:'2027-01-18',precision:'day',status:'confirmed',track:'Artigos completos',source:'https://example.org/manual',checked_at:'2026-11-19',note:'Nota manual'};
 const base = {conferencia:'EduComp',area:'Computação',ano_edicao:2027,deadline:'2026-12',deadline_precision:'month',deadline_status:'estimated',deadline_manual:manual,deadline_at:'2026-12-01T23:59:00Z'};
 for (const automatic of [{deadline:null,deadline_status:'unknown'},{deadline:'2027-02-01',deadline_precision:'day',deadline_status:'estimated'},{deadline:'2026-12',deadline_precision:'month',deadline_status:'estimated'}]) {
  const raw = {...base,...automatic};
  const selected = resolveDeadline(raw);
  assert.equal(selected.deadline,'2027-01-18');
  assert.equal(selected.deadline_origin,'manual');
  assert.equal(selected.deadline_at,null);
  assert.equal(selected.note,'Nota manual');
  assert.equal(resolveDeadline(selected).deadline_origin,'manual');
  assert.equal(selectVenues([raw],{precision:'day'}).length,1);
  assert.equal(statusOf(raw,new Date(2027,0,10)),'open');
 }
 const updated = {...base,deadline:'2027-01-25',deadline_precision:'day',deadline_status:'confirmed',note:'Nova fonte'};
 assert.equal(resolveDeadline(updated).deadline,'2027-01-25');
 assert.equal(resolveDeadline(updated).deadline_origin,'automatic');
 assert.equal(updated.deadline_manual.date,'2027-01-18');
 assert.equal(base.deadline,'2026-12');
 assert.equal(resolveDeadline({...base,deadline_manual:null}).deadline,'2026-12');
 assert.equal(resolveDeadline({deadline:null}).deadline_origin,null);
 const {timelineScale} = await import('../assets/timeline.js');
 assert.equal(timelineScale([base]).rows[0].venue.deadline,'2027-01-18');
});
test('EduComp conserva o automático e mostra a correção manual', async () => {
 const {resolveDeadline} = await import('../assets/model.js');
 const venues = JSON.parse(await readFile('data/conferences.json','utf8'));
 const raw = venues.find(v=>v.id==='educomp-2027');
 assert.equal(raw.deadline,'2026-12');
 assert.equal(raw.deadline_status,'estimated');
 assert.equal(resolveDeadline(raw).deadline,'2027-01-18');
 assert.equal(resolveDeadline(raw).deadline_origin,'manual');
});

test('mostra só a próxima edição e promove a seguinte após encerrar no fuso correto', async () => {
 const {upcomingVenues} = await import('../assets/model.js');
 const editions = [
  {id:'iticse-2027',slug:'iticse',conferencia:'ITiCSE',ano_edicao:2027,deadline:'2027-01-11',deadline_precision:'day',deadline_at:'2027-01-11T23:59:00-12:00'},
  {id:'iticse-2028',slug:'iticse',conferencia:'ITiCSE',ano_edicao:2028,deadline:'2028-01',deadline_precision:'month'}
 ];
 assert.deepEqual(upcomingVenues(editions,new Date('2027-01-12T11:58:00Z')).map(v=>v.id),['iticse-2027']);
 const promoted = upcomingVenues(editions,new Date('2027-01-12T12:00:00Z'));
 assert.deepEqual(promoted.map(v=>v.id),['iticse-2028']);
 assert.equal(promoted[0].deadline,'2028-01');
 assert.equal(selectVenues(upcomingVenues(editions,new Date(2026,10,19)),{year:'2028'}).length,0);
});
test('projeta só o mês, preenche edição sem data e não herda a correção manual', async () => {
 const {upcomingVenues} = await import('../assets/model.js');
 const old = {id:'test-2027',slug:'test',conferencia:'Test',ano_edicao:2027,deadline:'2026-10',deadline_precision:'month',deadline_status:'estimated',deadline_manual:{date:'2026-11-01',precision:'day',status:'confirmed',track:'Artigos'}};
 const snapshot = JSON.stringify(old);
 const projected = upcomingVenues([old],new Date(2026,10,19))[0];
 assert.equal(projected.id,'test-2028');
 assert.equal(projected.deadline,'2027-11');
 assert.equal(projected.deadline_status,'estimated');
 assert.equal(projected.deadline_precision,'month');
 assert.equal(projected.deadline_manual,null);
 assert.equal(projected.deadline_at,null);
 assert.equal(projected.deadline_source,null);
 assert.equal(JSON.stringify(old),snapshot);
 const existing = {...old,id:'test-2028',ano_edicao:2028,deadline:null,deadline_manual:null};
 assert.equal(upcomingVenues([old,existing],new Date(2026,10,19))[0].deadline,'2027-11');
 const later = upcomingVenues([old],new Date(2030,11,1))[0];
 assert.equal(later.deadline,'2031-11');
});
test('estimativa mensal só encerra após o último dia; catálogo não tem duplicatas ou vencidos', async () => {
 const {upcomingVenues} = await import('../assets/model.js');
 const v={id:'x-2027',slug:'x',conferencia:'X',ano_edicao:2027,deadline:'2027-01',deadline_precision:'month'};
 assert.equal(upcomingVenues([v],new Date(2027,0,31))[0].id,'x-2027');
 assert.equal(upcomingVenues([v],new Date(2027,1,1))[0].id,'x-2028');
 const raw=JSON.parse(await readFile('data/conferences.json','utf8'));
 const now=new Date(2026,10,19);
 const current=upcomingVenues(raw,now);
 assert.equal(current.length,19);
 assert.equal(new Set(current.map(v=>v.slug)).size,19);
 assert.ok(current.every(v=>statusOf(v,now)!=='closed'));
 assert.equal(current.find(v=>v.slug==='iticse').ano_edicao,2027);
 assert.equal(current.find(v=>v.slug==='educon').ano_edicao,2028);
 assert.equal(current.find(v=>v.slug==='edunine').deadline,'2027-09');
 assert.equal(current.find(v=>v.slug==='educomp').deadline,'2027-01-18');
});
