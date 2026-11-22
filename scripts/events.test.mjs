import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {eventEnded,projectEvent,validateEvent} from '../assets/events.js';
import {upcomingVenues} from '../assets/model.js';

const example = {id:'x-2027',slug:'x',conferencia:'X',ano_edicao:2027,deadline:'2026-10-01',deadline_precision:'day',event_start:'2027-06-01',event_end:'2027-06-03',event_precision:'day',event_status:'confirmed',event_source:'https://example.org/2027',event_checked_at:'2026-11-22',event_provenance:'Calendário oficial',event_city:'Cidade',event_country:'País'};
test('valida datas, períodos, origem e precisão sem confundir mês com estimativa', () => {
 assert.doesNotThrow(()=>validateEvent(example));
 assert.doesNotThrow(()=>validateEvent({...example,event_start:'2027-06',event_end:null,event_precision:'month'}));
 assert.doesNotThrow(()=>validateEvent({...example,event_start:null,event_end:null,event_precision:null,event_status:'unknown',event_source:null}));
 for (const change of [
  {event_start:'2027-02-29'}, {event_end:'2027-05-31'}, {event_start:'2027-13'},
  {event_status:'unknown'}, {event_source:null}, {event_source:'javascript:alert(1)'},
  {event_start:'2028-06-01'}, {event_checked_at:'2026-02-30'},
  {event_provenance:''}, {event_country:null}, {event_start:null}
 ]) assert.throws(()=>validateEvent({...example,...change}));
});
test('edição permanece após deadline e só muda após o último dia do evento', () => {
 const next={...example,id:'x-2028',ano_edicao:2028,deadline:'2027-10-01',event_start:'2028-07-01',event_end:'2028-07-03',event_city:'Outra cidade'};
 assert.equal(eventEnded(example,new Date(2027,5,3)),false);
 assert.equal(eventEnded(example,new Date(2027,5,4)),true);
 assert.equal(upcomingVenues([example,next],new Date(2027,5,3))[0].id,'x-2027');
 assert.equal(upcomingVenues([example,next],new Date(2027,5,4))[0].id,'x-2028');
 const monthly={...example,event_start:'2027-06',event_end:null,event_precision:'month'};
 assert.equal(eventEnded(monthly,new Date(2027,5,30)),false);
 assert.equal(eventEnded(monthly,new Date(2027,6,1)),true);
});
test('projeção não copia dias, duração ou local e conserva os campos da nova edição', () => {
 const projected=projectEvent(example,2028);
 assert.equal(projected.event_start,'2028-06');
 assert.equal(projected.event_end,null);
 assert.equal(projected.event_status,'estimated');
 assert.equal(projected.event_city,null);
 assert.equal(projected.event_country,null);
 assert.match(projected.event_provenance,/x-2027/);
 const next={...example,id:'x-2028',ano_edicao:2028,deadline:null,event_start:'2028-07-03',event_end:'2028-07-06',event_city:'Nova cidade'};
 const selected=upcomingVenues([example,next],new Date(2027,6,1))[0];
 assert.equal(selected.event_start,'2028-07-03');
 assert.equal(selected.event_city,'Nova cidade');
 assert.equal(selected.event_status,'confirmed');
 assert.equal(selected.deadline,'2027-10');
});
test('37 registros têm metadados de pesquisa; projeções não herdam local', async () => {
 const data=JSON.parse(await readFile('data/conferences.json','utf8'));
 assert.equal(data.length,37);
 for (const v of data) validateEvent(v);
 assert.equal(data.filter(v=>v.event_status==='confirmed').length,18);
 assert.equal(data.filter(v=>v.event_status==='estimated').length,19);
 const comped=data.find(v=>v.slug==='comped');
 assert.equal(comped.event_status,'confirmed');
 assert.equal(comped.event_precision,'month');
 assert.equal(comped.event_end,null);
 assert.equal(comped.event_city,'São Paulo');
 const sefi=data.find(v=>v.id==='sefi-2028');
 assert.equal(sefi.event_start,'2028-07-03');
 assert.equal(sefi.event_city,'Aalborg');
 for (const v of data.filter(v=>v.event_status==='estimated'&&v.id!=='educon-2028')) {
  assert.equal(v.event_city,null);
  assert.equal(v.event_country,null);
 }
});
