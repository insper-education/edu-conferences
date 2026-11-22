import {statusOf, selectVenues, upcomingVenues} from './model.js';
import {timelineScale} from './timeline.js';
const $ = id => document.getElementById(id);
const labels = {open:'Em aberto',closed:'Encerrado',unknown:'A confirmar',estimated:'Estimativa'};
const confirmationLabels = {confirmed:'Confirmado na fonte oficial',estimated:'Estimativa (ver fonte)',unknown:'Prazo não localizado'};
const originLabel = v => v.deadline_origin === 'manual' ? 'Inserido manualmente' : v.deadline_origin === 'automatic' ? 'Campo automático' : '';
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => value ? new Intl.DateTimeFormat('pt-BR',{...(value.length === 10 ? {day:'2-digit'} : {}),month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value + (value.length === 7 ? '-01' : '')+'T12:00:00Z')) : 'A confirmar';
const certainty = status => status === 'confirmed' ? 'Confirmado' : status === 'estimated' ? 'Estimativa' : 'A confirmar';
const eventDate = v => !v.event_start ? 'A confirmar' : date(v.event_start) + (v.event_end && v.event_end !== v.event_start ? ` – ${date(v.event_end)}` : '');
const eventLocation = v => [v.event_city,v.event_country].filter(Boolean).join(', ') || 'Local a confirmar';
const eventDetail = v => `${v.conferencia} · ${v.ano_edicao} — Realização: ${eventDate(v)} — ${certainty(v.event_status)}${v.event_precision === 'month' ? ' · dias e duração a confirmar' : ''} — ${eventLocation(v)} — ${v.event_provenance || ''}`;
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
 $('results').innerHTML = renderTimeline(selected) + renderList(selected) + '<div id="timeline-popup" class="timeline-popup" role="tooltip" hidden></div>';
}
function deadlineMarker(v, marker) {
 if (!marker) return '';
 const monthly = v.deadline_precision === 'month';
 const detail = `${v.conferencia} · ${v.ano_edicao} — Deadline: ${date(v.deadline)}${monthly ? ' (dia não informado)' : ` (${v.deadline_timezone || 'horário e fuso a confirmar'})`} — ${labels[statusOf(v)]} — ${v.deadline_track || 'Submissão'} — ${confirmationLabels[v.deadline_status]} — ${originLabel(v)}`;
 return `<a class="deadline-marker ${monthly?'month-range':'day-point'} certainty-${escape(v.deadline_status)}" href="${safeUrl(v.deadline_source || v.site_url)}" style="left:${marker.left}%;${monthly?`width:${marker.width}%;`:''}" aria-label="${escape(detail)}"><span class="deadline-tooltip ${marker.left>65?'align-right':''}">${escape(detail)}</span></a>`;
}
function eventMarker(v, marker) {
 if (!marker) return '';
 const range = marker.width > 0;
 const detail = eventDetail(v);
 return `<a class="deadline-marker event-marker ${range?'event-range':'event-point'} certainty-${escape(v.event_status)}${marker.clippedStart?' clipped-start':''}${marker.clippedEnd?' clipped-end':''}" href="${safeUrl(v.event_source || v.site_url)}" style="left:${marker.left}%;${range?`width:${marker.width}%;`:''}" aria-label="${escape(detail)}"><span class="deadline-tooltip ${marker.left>65?'align-right':''}">${escape(detail)}</span></a>`;
}
function renderTimeline(selected) {
 const heading = '<h3 class="timeline-heading">Deadlines e realização</h3><p class="timeline-window">De hoje até um ano à frente. Datas fora desse período e informações a confirmar estão na tabela abaixo.</p>';
 const scale = timelineScale(selected);
 if (!scale) return `${heading}<p class="empty">Nenhuma data informada nos próximos 12 meses.</p>`;
 const monthFormat = new Intl.DateTimeFormat('pt-BR',{month:'short',year:'2-digit',timeZone:'UTC'});
 const grid = scale.months.map(m=>`<span class="axis-grid" style="left:${m.left}%"></span>`).join('');
 const today = '<span class="today-line" style="left:0%" title="Hoje"></span>';
 const legend = '<div class="timeline-legend" aria-label="Legenda"><span><i class="legend-dot" aria-hidden="true"></i>Deadline</span><span><i class="legend-event" aria-hidden="true"></i>Realização / período</span><span><i class="legend-estimated" aria-hidden="true"></i>Estimativa (contorno tracejado)</span></div>';
 return `${heading}${legend}<div class="deadline-scroll" role="region" aria-label="Linha do tempo de deadlines e realização das conferências nos próximos 12 meses; role horizontalmente para navegar pelos meses" tabindex="0"><div class="deadline-chart" style="--axis-width:${scale.months.length*72}px"><div class="deadline-header"><div class="venue-label">Conferência / edição</div><div class="deadline-axis">${scale.months.map(m=>`<span class="month-label" style="left:${m.left}%;width:${m.width}%">${monthFormat.format(m.date)}</span>`).join('')}${today}</div></div>${scale.rows.map(({venue:v,deadline,event})=>`<div class="deadline-row"><div class="venue-label"><a href="${safeUrl(v.site_url)}" title="${escape(v.conferencia)}"><span>${escape(conferenceLabel(v).abbreviation)}${brazilFlag(v)}</span> <span>${v.ano_edicao}</span></a><small>Deadline: ${date(v.deadline)}</small></div><div class="deadline-lane">${grid}${today}${deadlineMarker(v,deadline)}${eventMarker(v,event)}</div></div>`).join('')}</div></div>`;
}
function renderList(selected) {
 return `<h3 class="timeline-heading">Conferências</h3><div class="table-wrap"><table><caption class="skip">Venues de pesquisa em educação</caption><thead><tr><th scope="col">Conferência</th><th scope="col">Deadline</th><th scope="col">Data da conferência</th><th scope="col">Área / curadoria</th></tr></thead><tbody>${selected.map(v => `<tr id="${escape(v.id)}"><td><a href="${safeUrl(v.site_url)}"><span class="conference-name">${escape(conferenceLabel(v).abbreviation)}${brazilFlag(v)}</span><span class="edition">${v.ano_edicao}</span></a><span class="sub">${escape(conferenceLabel(v).fullName)}</span></td><td><strong class="deadline-date certainty-${escape(v.deadline_status)}"${v.deadline_status === 'estimated' ? ' title="Estimativa baseada nos prazos da edição anterior"' : v.deadline_status === 'confirmed' ? ' title="Data confirmada na fonte oficial"' : ''}>${date(v.deadline)}</strong><span class="badge deadline-certainty ${escape(v.deadline_status)}"${v.deadline_status === 'estimated' ? ' title="Estimativa baseada nos prazos da edição anterior"' : v.deadline_status === 'confirmed' ? ' title="Data confirmada na fonte oficial"' : ''}>${v.deadline_status === 'confirmed' ? 'Confirmado' : v.deadline_status === 'estimated' ? 'Estimativa' : 'A confirmar'}</span></td><td class="event-cell"><strong class="event-date certainty-${escape(v.event_status || 'unknown')}">${escape(eventDate(v))}</strong><span class="badge event-certainty">${certainty(v.event_status)}${v.event_precision === 'month' ? ' · dias a confirmar' : ''}</span><span class="sub event-location">${escape(eventLocation(v))}</span>${v.event_source ? `<a class="event-source" href="${safeUrl(v.event_source)}" title="${escape(v.event_provenance || '')}">Fonte${v.event_status === 'estimated' ? ' da estimativa' : ''}</a>` : ''}</td><td>${escape(v.area)}</td></tr>`).join('')}</tbody></table></div>`;
}
// Render the active tooltip outside the scrolling chart so its text stays visible
// on narrow screens and on the first/last chart rows.
const results = $('results');
function hideTooltip() {
 const popup = results.querySelector('#timeline-popup');
 if (popup) popup.hidden = true;
}
function showTooltip(event) {
 const marker = event.target.closest('.deadline-marker');
 if (!marker) return;
 const popup = results.querySelector('#timeline-popup');
 popup.textContent = marker.getAttribute('aria-label');
 popup.hidden = false;
 const bounds = marker.getBoundingClientRect();
 const box = popup.getBoundingClientRect();
 const left = Math.max(12,Math.min(bounds.left,globalThis.innerWidth-box.width-12));
 const top = bounds.bottom+12+box.height < globalThis.innerHeight
  ? bounds.bottom+12 : Math.max(12,bounds.top-box.height-12);
 popup.style.left = `${left}px`;
 popup.style.top = `${top}px`;
}
results.addEventListener('pointerover',showTooltip);
results.addEventListener('focusin',showTooltip);
results.addEventListener('pointerout',() => {if (!document.activeElement?.matches('.deadline-marker')) hideTooltip();});
results.addEventListener('focusout',hideTooltip);
results.addEventListener('keydown',event => {if(event.key === 'Escape') hideTooltip();});
function scrollTooltip() {
 const focused = document.activeElement;
 if (focused?.matches('.deadline-marker')) showTooltip({target:focused});
 else hideTooltip();
}
results.addEventListener('scroll',scrollTooltip,true);
globalThis.addEventListener?.('resize',hideTooltip);
globalThis.addEventListener?.('scroll',scrollTooltip,true);
try {
 const response = await fetch('data/conferences.json', {cache:'no-store'});
 if (!response.ok) throw new Error('Falha no catálogo');
  venues = await response.json();
  const latestCheck = venues.flatMap(v => [v.checked_at, v.deadline_manual?.checked_at, v.event_checked_at]).filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value || '')).sort().at(-1);
  if (latestCheck && $('last-updated')) $('last-updated').textContent = `Última consulta do catálogo: ${latestCheck.split('-').reverse().join('/')}`;
 render();
} catch (error) { $('count').hidden = false; $('count').textContent = 'Não foi possível carregar o catálogo. Atualize a página para tentar novamente.'; }
