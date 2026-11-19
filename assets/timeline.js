// Use UTC only for calendar geometry; no submission hour is inferred.
import {resolveDeadline} from './model.js';
export function timelineScale(venues, now = new Date()) {
  const rows = venues.map(resolveDeadline).filter(v => v.deadline).map(venue => {
    const [year, month, day] = venue.deadline.split('-').map(Number);
    const start = Date.UTC(year, month - 1, day || 1);
    const end = day ? start : Date.UTC(year, month, 1);
    return {venue, start, end};
  }).sort((a,b) => a.start - b.start || a.venue.conferencia.localeCompare(b.venue.conferencia));
  if (!rows.length) return null;
  const first = new Date(rows[0].start);
  const last = new Date(Math.max(...rows.map(r=>r.end)));
  const start = Math.min(
    Date.UTC(now.getFullYear(), now.getMonth() - 1, 1),
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1)
  );
  const end = Date.UTC(last.getUTCFullYear(), last.getUTCMonth()+1, 1);
  const position = value => (value-start)/(end-start)*100;
  const months = [];
  for (let tick = start; tick < end;) {
    const d = new Date(tick);
    const next = Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1);
    months.push({date:d, left:position(tick), width:position(next)-position(tick)});
    tick = next;
  }
  const today = Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
  return {months, today:today >= start && today <= end ? position(today) : null,
    rows:rows.map(r=>({...r,left:position(r.start),width:position(r.end)-position(r.start)}))};
}
