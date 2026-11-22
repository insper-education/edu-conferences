import {statusOf, selectVenues, upcomingVenues} from './model.js';
import {timelineScale} from './timeline.js';
const $ = id => document.getElementById(id);
const labels = {open:'Em aberto',closed:'Encerrado',unknown:'A confirmar',estimated:'Estimativa'};
const confirmationLabels = {confirmed:'Confirmado na fonte oficial',estimated:'Estimativa (ver fonte)',unknown:'Prazo não localizado'};
const originLabel = v => v.deadline_origin === 'manual' ? 'Inserido manualmente' : v.deadline_origin === 'automatic' ? 'Campo automático' : '';
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => value ? new Intl.DateTimeFormat('pt-BR',{...(value.length === 10 ? {day:'2-digit'} : {}),month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value + (value.length === 7 ? '-01' : '')+'T12:00:00Z')) : 'A confirmar';
const safeUrl = value => { try {const url = new URL(value);return /^https?:$/.test(url.protocol) ? escape(url.href) : '#';} catch {return '#';} };
const abbreviations = {'sigcse-ts':'SIGCSE TS',iticse:'ITiCSE',koli:'Koli Calling','paee-ale':'PAEE/ALE',educomp:'EduComp',comped:'CompEd'};
const brazilFlag = venue => venue.nacional === true ? '<span class="country-flag" role="img" aria-label="Conferência brasileira">🇧🇷</span>' : '';
function conferenceLabel(venue) {
 const abbreviation = abbreviations[venue.slug] || venue.slug.toUpperCase();
 const separator = venue.conferencia.indexOf(' — ');
 const fullName = separator >= 0 ? venue.conferencia.slice(separator + 3) : venue.conferencia.replace(new RegExp('^' + abbreviation + '\\s+', 'i'), '');
 return {abbreviation, fullName};
}
let venues = [];
function render() {
 const current = upcomingVenues(venues);
 const selected = selectVenues(current);
 $('count').textContent = '';
 $('count').hidden = true;
 if (!selected.length) { $('results').innerHTML = '<p class="empty">Nenhuma conferência disponível no catálogo.</p>'; return; }
 $('results').innerHTML = renderTimeline(selected) + renderList(selected);
}
function renderTimeline(selected) {
 const undated = selected.filter(v => !v.deadline);
 const pending = undated.length ? `<div class="pending-deadlines"><h4>Prazo a confirmar</h4><ul>${undated.map(v => `<li><a href="${safeUrl(v.site_url)}">${escape(conferenceLabel(v).abbreviation)}${brazilFlag(v)}</a> · ${v.ano_edicao}</li>`).join('')}</ul></div>` : '';
 const scale = timelineScale(selected);
 if (!scale) return `<h3 class="timeline-heading">Deadlines</h3><p class="empty">Nenhum prazo informado no catálogo.</p>${pending}`;
 const monthFormat = new Intl.DateTimeFormat('pt-BR',{month:'short',year:'2-digit',timeZone:'UTC'});
 const grid = scale.months.map(m=>`<span class="axis-grid" style="left:${m.left}%"></span>`).join('');
 const today = scale.today === null ? '' : `<span class="today-line" style="left:${scale.today}%" title="Hoje"></span>`;
 return `<h3 class="timeline-heading">Deadlines</h3><div class="deadline-scroll" role="region" aria-label="Linha do tempo de deadlines; role horizontalmente para navegar pelos meses" tabindex="0"><div class="deadline-chart" style="--axis-width:${scale.months.length*72}px"><div class="deadline-header"><div class="venue-label">Conferência / edição</div><div class="deadline-axis">${scale.months.map(m=>`<span class="month-label" style="left:${m.left}%;width:${m.width}%">${monthFormat.format(m.date)}</span>`).join('')}${today}</div></div>${scale.rows.map(({venue:v,left,width})=>{
  const estimated = v.deadline_precision === 'month';
  const detail = `${v.conferencia} · ${v.ano_edicao} — Deadline: ${date(v.deadline)}${estimated ? ' (estimativa, dia não informado)' : ` (${v.deadline_timezone || 'horário e fuso a confirmar'})`} — ${labels[statusOf(v)]}${v.deadline_status === 'estimated' ? ' (baseado na edição anterior)' : ''} — ${v.deadline_track || 'Submissão'} — ${confirmationLabels[v.deadline_status]} — ${originLabel(v)}`;
  const previous = v.estimated_from_deadline || venues.find(item => item.id === v.estimated_from)?.deadline;
  const tooltip = v.deadline_status === 'confirmed' ? 'Confirmado' : v.deadline_status === 'estimated' && previous ? `Baseado na edição anterior: ${date(previous)}` : v.deadline_status === 'estimated' ? 'Estimativa — data da edição anterior não disponível' : 'A confirmar';
  return `<div class="deadline-row"><div class="venue-label"><a href="${safeUrl(v.site_url)}" title="${escape(v.conferencia)}"><span>${escape(conferenceLabel(v).abbreviation)}${brazilFlag(v)}</span> <span>${v.ano_edicao}</span></a><small>${date(v.deadline)}${estimated?' · estimativa':''}</small></div><div class="deadline-lane">${grid}${today}<a class="deadline-marker ${estimated?'month-range':'day-point'} certainty-${escape(v.deadline_status)}" href="${safeUrl(v.site_url)}" style="left:${left}%;${estimated?`width:${width}%;`:''}" aria-label="${escape(detail)}"><span class="deadline-tooltip ${left>65?'align-right':''}">${escape(tooltip)}</span></a></div></div>`;
 }).join('')}</div></div>${pending}`;
}
function renderList(selected) {
 return `<h3 class="timeline-heading">Conferências</h3><div class="table-wrap"><table><caption class="skip">Venues de pesquisa em educação</caption><thead><tr><th scope="col">Conferência</th><th scope="col">Deadline</th><th scope="col">Área / curadoria</th></tr></thead><tbody>${selected.map(v => `<tr id="${escape(v.id)}"><td><a href="${safeUrl(v.site_url)}"><span class="conference-name">${escape(conferenceLabel(v).abbreviation)}${brazilFlag(v)}</span><span class="edition">${v.ano_edicao}</span></a><span class="sub">${escape(conferenceLabel(v).fullName)}</span></td><td><strong class="deadline-date certainty-${escape(v.deadline_status)}"${v.deadline_status === 'estimated' ? ' title="Estimativa baseada nos prazos da edição anterior"' : v.deadline_status === 'confirmed' ? ' title="Data confirmada na fonte oficial"' : ''}>${date(v.deadline)}</strong><span class="badge deadline-certainty ${escape(v.deadline_status)}"${v.deadline_status === 'estimated' ? ' title="Estimativa baseada nos prazos da edição anterior"' : v.deadline_status === 'confirmed' ? ' title="Data confirmada na fonte oficial"' : ''}>${v.deadline_status === 'confirmed' ? 'Confirmado' : v.deadline_status === 'estimated' ? 'Estimativa' : 'A confirmar'}</span></td><td>${escape(v.area)}</td></tr>`).join('')}</tbody></table></div>`;
}
try {
 const response = await fetch('data/conferences.json', {cache:'no-store'});
 if (!response.ok) throw new Error('Falha no catálogo');
  venues = await response.json();
  const latestCheck = venues.flatMap(v => [v.checked_at, v.deadline_manual?.checked_at]).filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value || '')).sort().at(-1);
  if (latestCheck && $('last-updated')) $('last-updated').textContent = `Catálogo atualizado automaticamente em: ${latestCheck.split('-').reverse().join('/')}`;
 render();
} catch (error) { $('count').hidden = false; $('count').textContent = 'Não foi possível carregar o catálogo. Atualize a página para tentar novamente.'; }
