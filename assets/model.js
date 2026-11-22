import {eventEnded, projectEvent} from './events.js';
export const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const resolved = Symbol('resolvedDeadline');
export function resolveDeadline(venue) {
 if (venue[resolved]) return venue;
 const manual = venue.deadline_manual;
 const useManual = manual?.date && !(venue.deadline && venue.deadline_status === 'confirmed');
 if (!useManual) return {...venue, [resolved]:true, deadline_origin:venue.deadline ? 'automatic' : null};
 return {...venue, [resolved]:true, deadline_origin:'manual',
  deadline:manual.date, deadline_precision:manual.precision,
  deadline_status:manual.status, deadline_track:manual.track,
  deadline_source:manual.source || null, source_url:manual.source || venue.site_url,
  deadline_timezone:manual.timezone || null, deadline_at:manual.at || null,
  source_access:'user_transcription', checked_at:manual.checked_at,
  provenance:manual.provenance || 'Informação inserida manualmente pelo grupo.',
  note:manual.note || '', important_dates:manual.important_dates || []};
}
export function statusOf(v, now = new Date()) {
 v = resolveDeadline(v);
 if (!v.deadline) return 'unknown';
 if (v.deadline_precision === 'month') {
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  return v.deadline < month ? 'closed' : 'estimated';
 }
 if (v.deadline_at) return new Date(v.deadline_at) < now ? 'closed' : 'open';
 const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 return v.deadline < today ? 'closed' : 'open';
}
// Keep one edition per venue until the event ends. Without event dates,
// preserve the previous selection rule based on the submission deadline.
const editionIsUpcoming = (v, now) => v.event_start ? !eventEnded(v,now) : statusOf(v,now) !== 'closed';
export function upcomingVenues(venues, now = new Date()) {
 const groups = new Map();
 for (const raw of venues) {
  const key = raw.slug || raw.id || raw.conferencia;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(resolveDeadline(raw));
 }
 const result = [];
 for (const editions of groups.values()) {
  editions.sort((a,b)=>a.ano_edicao-b.ano_edicao);
  let previous = null;
  let selected = null;
  for (const edition of editions) {
   const candidate = !edition.deadline && previous?.deadline
    ? estimateEdition(previous, edition.ano_edicao, edition) : edition;
   if (editionIsUpcoming(candidate,now) && (candidate.deadline || candidate.ano_edicao >= now.getFullYear())) {
    selected = candidate;
    break;
   }
   previous = candidate;
  }
  if (!selected && previous) {
   let year = Math.max(previous.ano_edicao+1, now.getFullYear());
   selected = estimateEdition(previous,year);
   while (!editionIsUpcoming(selected,now)) selected = estimateEdition(previous,++year);
  }
  if (selected) result.push(selected);
 }
 return result;
}
function estimateEdition(previous, year, existing) {
 const difference = year-previous.ano_edicao;
 const deadline = previous.deadline
  ? `${Number(previous.deadline.slice(0,4))+difference}${previous.deadline.slice(4,7)}` : null;
 // Explicit fields avoid copying old acceptance dates, manual corrections or
 // confirmation metadata into a new edition.
 return resolveDeadline({
  id:existing?.id || `${previous.slug}-${year}`, slug:previous.slug,
  conferencia:previous.conferencia, ano_edicao:year,
   site_url:existing?.site_url || previous.site_url, area:previous.area, nacional:existing?.nacional ?? previous.nacional,
   h5_index:existing?.h5_index ?? previous.h5_index, h5_source:existing?.h5_source ?? previous.h5_source, h5_checked_at:existing?.h5_checked_at ?? previous.h5_checked_at,
  ...projectEvent(previous,year,existing),
  deadline, deadline_precision:deadline ? 'month' : null,
  deadline_status:deadline ? 'estimated' : 'unknown',
  deadline_track:previous.deadline_track, deadline_manual:null,
  deadline_source:null, deadline_at:null, deadline_timezone:null,
  source_url:previous.deadline_source || previous.source_url || previous.site_url,
  checked_at:previous.checked_at, source_access:'projection',
  provenance:`Projeção anual a partir da edição ${previous.ano_edicao}; não é uma chamada confirmada.`,
  note:deadline ? `Mês projetado a partir do prazo ${previous.deadline}. Dia, chamada e realização da próxima edição não confirmados. O link pode apontar para uma edição anterior.` : 'Próxima edição sem prazo conhecido.',
   estimated_from:previous.id, estimated_from_deadline:previous.deadline
 });
}
const deadlineOrderGroup = (v,now) => !v.deadline ? 2 : statusOf(v,now) === 'closed' ? 1 : 0;
export function selectVenues(venues, {query='',area='',year='',status='',precision='',sort='deadline'}={},now=new Date()) {
 return venues.map(resolveDeadline).filter(v=>(!area||v.area===area)&&(!year||String(v.ano_edicao)===year)&&(!status||statusOf(v,now)===status)&&(!precision||(v.deadline_precision||'unknown')===precision)&&normalize([v.conferencia,v.slug,v.area,v.ano_edicao].join(' ')).includes(normalize(query))).sort((a,b)=>{
 if(sort==='name') return a.conferencia.localeCompare(b.conferencia,'pt-BR')||a.ano_edicao-b.ano_edicao;
 if(sort==='year') return a.ano_edicao-b.ano_edicao||a.conferencia.localeCompare(b.conferencia);
 const groupA = deadlineOrderGroup(a,now), groupB = deadlineOrderGroup(b,now);
 if (groupA !== groupB) return groupA-groupB;
 const byDate = (a.deadline||'9999').localeCompare(b.deadline||'9999');
 return (groupA === 1 ? -byDate : byDate)||a.conferencia.localeCompare(b.conferencia);
 });
}
