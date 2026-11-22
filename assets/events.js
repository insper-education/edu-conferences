// Calendar dates only: event dates do not imply a submission time or timezone.
export const eventFields = ['event_start','event_end','event_precision','event_status','event_source','event_checked_at','event_provenance','event_country','event_city'];
const validDay = value => /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
export function validateEvent(v) {
 const fail = message => { throw new Error(`${v.id}: ${message}`); };
 for (const key of eventFields) if (!Object.hasOwn(v,key)) fail(`${key} ausente`);
 if (!['confirmed','estimated','unknown'].includes(v.event_status)) fail('status do evento inválido');
 const precision = v.event_precision;
 if (![null,'day','month'].includes(precision)) fail('precisão do evento inválida');
 const valid = value => precision === 'day' ? validDay(value) : precision === 'month' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '');
 if (v.event_start === null) {
  if (v.event_end !== null || precision !== null || v.event_status !== 'unknown') fail('evento sem data deve ser unknown');
 } else {
  if (!valid(v.event_start) || v.event_status === 'unknown') fail('início do evento inválido');
  if (v.event_end !== null && (!valid(v.event_end) || v.event_end < v.event_start)) fail('fim do evento inválido');
  if (Number(v.event_start.slice(0,4)) !== v.ano_edicao) fail('ano do evento incompatível com edição');
  if (!v.event_source) fail('data do evento sem fonte');
 }
 if (v.event_source !== null) {
  try { if (!/^https?:$/.test(new URL(v.event_source).protocol)) fail('fonte do evento inválida'); }
  catch { fail('fonte do evento inválida'); }
 }
 if (!validDay(v.event_checked_at)) fail('data de consulta do evento inválida');
 if (typeof v.event_provenance !== 'string' || !v.event_provenance.trim()) fail('evento sem justificativa');
 for (const key of ['event_city','event_country']) if (v[key] !== null && (typeof v[key] !== 'string' || !v[key].trim())) fail(`${key} inválido`);
 if (v.event_city && !v.event_country) fail('cidade sem país');
}
export function eventEnded(v, now = new Date()) {
 const last = v.event_end || v.event_start;
 if (!last) return false;
 const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 return last < today.slice(0,last.length);
}
export function projectEvent(previous, year, existing) {
 // Published fields for the new edition always take precedence over projections.
 if (existing && Object.hasOwn(existing,'event_start')) return Object.fromEntries(eventFields.map(key => [key,existing[key]]));
 const sourceDate = previous.event_start;
 return {
  event_start:sourceDate ? `${Number(sourceDate.slice(0,4))+year-previous.ano_edicao}${sourceDate.slice(4,7)}` : null,
  event_end:null, event_precision:sourceDate ? 'month' : null,
  event_status:sourceDate ? 'estimated' : 'unknown',
  event_source:previous.event_source || null, event_checked_at:previous.event_checked_at || null,
  event_provenance:sourceDate ? `Projeção mensal a partir de ${previous.id || previous.ano_edicao} (${sourceDate}); dias, duração e local não confirmados.` : 'Período e local ainda não conhecidos.',
  event_city:null, event_country:null
 };
}
