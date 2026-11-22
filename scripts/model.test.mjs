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

test('timeline limita o eixo a um ano e recorta períodos nas bordas', async () => {
 const {timelineScale} = await import('../assets/timeline.js');
 const now = new Date(2027,0,15);
 const scale = timelineScale([
  {conferencia:'Estimativa',deadline:'2027-01',deadline_precision:'month'},
  {conferencia:'Hoje',deadline:'2027-01-15',deadline_precision:'day'},
  {conferencia:'Evento sem deadline',deadline:null,event_start:'2027-01-10',event_end:'2027-01-20',event_precision:'day'},
  {conferencia:'Borda final',deadline:'2029-01-01',event_start:'2028-01-10',event_end:'2028-01-20',event_precision:'day'},
  {conferencia:'Fora',deadline:'2028-01-15',deadline_precision:'day'},
  {conferencia:'Passado',deadline:'2027-01-14',deadline_precision:'day'},
  {conferencia:'Sem data',deadline:null}
 ],now);
 assert.equal(new Date(scale.start).toISOString(),'2027-01-15T00:00:00.000Z');
 assert.equal(new Date(scale.end).toISOString(),'2028-01-15T00:00:00.000Z');
 assert.equal(scale.rows.length,4);
 assert.equal(scale.today,0);
 const today = scale.rows.find(r=>r.venue.conferencia==='Hoje');
 assert.equal(today.deadline.left,0);
 assert.equal(today.deadline.width,0);
 const first = scale.rows.find(r=>r.venue.conferencia==='Evento sem deadline');
 assert.equal(first.deadline,null);
 assert.equal(first.event.left,0);
 assert.equal(first.event.clippedStart,true);
 const last = scale.rows.find(r=>r.venue.conferencia==='Borda final');
 assert.equal(last.event.clippedEnd,true);
 assert.equal(last.event.left+last.event.width,100);
 assert.ok(scale.rows.flatMap(r=>[r.deadline,r.event]).filter(Boolean).every(m=>m.left>=0&&m.left+m.width<=100));
 assert.equal(timelineScale([{deadline:null}],now),null);
 const leap=timelineScale([{deadline:'2024-03-01',deadline_precision:'day'}],new Date(2024,1,29));
 assert.equal(new Date(leap.end).toISOString(),'2025-02-28T00:00:00.000Z');
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
 assert.equal(timelineScale([base],new Date(2026,10,22)).rows[0].venue.deadline,'2027-01-18');
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
test('estimativa mensal encerra após o último dia; catálogo preserva eventos futuros', async () => {
 const {upcomingVenues} = await import('../assets/model.js');
 const v={id:'x-2027',slug:'x',conferencia:'X',ano_edicao:2027,deadline:'2027-01',deadline_precision:'month'};
 assert.equal(upcomingVenues([v],new Date(2027,0,31))[0].id,'x-2027');
 assert.equal(upcomingVenues([v],new Date(2027,1,1))[0].id,'x-2028');
 const raw=JSON.parse(await readFile('data/conferences.json','utf8'));
 const now=new Date(2026,10,19);
 const current=upcomingVenues(raw,now);
 assert.equal(current.length,19);
 assert.equal(new Set(current.map(v=>v.slug)).size,19);
 assert.ok(current.every(v=>v.event_start >= '2026-11'));
 assert.equal(current.find(v=>v.slug==='iticse').ano_edicao,2027);
 assert.equal(current.find(v=>v.slug==='educon').ano_edicao,2027);
 assert.equal(current.find(v=>v.slug==='edunine').deadline,'2026-09-30');
 assert.equal(current.find(v=>v.slug==='educomp').deadline,'2027-01-18');
});

test('timeline e lista seguem deadlines mesmo com eventos em ordem diferente e prazo fora da janela', async () => {
 const {timelineScale} = await import('../assets/timeline.js');
 const now = new Date(2026,10,22);
 const venues = [
  {id:'unknown',conferencia:'A confirmar',deadline:null,event_start:'2027-01-01',event_precision:'day'},
  {id:'later',conferencia:'Mais tarde',deadline:'2027-03-01',deadline_precision:'day',event_start:'2027-04-01',event_precision:'day'},
  {id:'manual',conferencia:'Manual',deadline:'2027-04',deadline_precision:'month',deadline_manual:{date:'2027-01-18',precision:'day',status:'confirmed'},event_start:'2027-09-01',event_precision:'day'},
  {id:'month',conferencia:'Mês',deadline:'2027-02',deadline_precision:'month',event_start:'2027-08-01',event_precision:'day'},
  {id:'past',conferencia:'Prazo encerrado',deadline:'2026-10-01',deadline_precision:'day',event_start:'2027-11-01',event_precision:'day'}
 ];
 const expected=['manual','month','later','past','unknown'];
 assert.deepEqual(selectVenues(venues,{},now).map(v=>v.id),expected);
 assert.deepEqual(timelineScale(venues,now).rows.map(row=>row.venue.id),expected);
 assert.equal(venues[2].deadline,'2027-04');
});

test('próximos deadlines vêm antes dos encerrados respeitando AoE e mês estimado', () => {
 const venues=[
  {id:'old',conferencia:'Antigo',deadline:'2026-12-01',deadline_precision:'day'},
  {id:'future',conferencia:'Futuro',deadline:'2027-02-01',deadline_precision:'day'},
  {id:'unknown',conferencia:'Sem prazo',deadline:null},
  {id:'recent',conferencia:'Recente',deadline:'2027-01-10',deadline_precision:'day'},
  {id:'aoe',conferencia:'AoE',deadline:'2027-01-11',deadline_precision:'day',deadline_at:'2027-01-11T23:59:00-12:00'},
  {id:'month',conferencia:'Estimado',deadline:'2027-01',deadline_precision:'month'}
 ];
 const order = instant => selectVenues(venues,{},new Date(instant)).map(v=>v.id);
 assert.deepEqual(order('2027-01-12T11:58:00Z'),['month','aoe','future','recent','old','unknown']);
 assert.deepEqual(order('2027-01-12T12:00:00Z'),['month','future','aoe','recent','old','unknown']);
});
