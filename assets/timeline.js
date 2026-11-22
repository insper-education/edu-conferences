// Use UTC for calendar geometry only; no event/submission hour is inferred.
import {resolveDeadline} from './model.js';
const dayMs = 86400000;
function interval(value, last, precision, duration = false) {
 if (!value) return null;
 const [year,month,day] = value.split('-').map(Number);
 const start = Date.UTC(year,month-1,day || 1);
 const [ey,em,ed] = (last || value).split('-').map(Number);
 const end = precision === 'month' ? Date.UTC(ey,em,1) : duration && last ? Date.UTC(ey,em-1,ed)+dayMs : start;
 return {start,end};
}
export function timelineScale(venues, now = new Date()) {
 const start = Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
 const anniversaryDay = Math.min(now.getDate(),new Date(Date.UTC(now.getFullYear()+1,now.getMonth()+1,0)).getUTCDate());
 const end = Date.UTC(now.getFullYear()+1,now.getMonth(),anniversaryDay);
 const position = value => (value-start)/(end-start)*100;
 const clip = marker => {
  if (!marker || marker.start >= end || (marker.end === marker.start ? marker.start < start : marker.end <= start)) return null;
  const from = Math.max(start,marker.start), to = Math.min(end,marker.end);
  return {...marker,left:position(from),width:position(to)-position(from),clippedStart:marker.start<start,clippedEnd:marker.end>end};
 };
 const rows = venues.map(resolveDeadline).map(venue => ({venue,
  deadline:clip(interval(venue.deadline,null,venue.deadline_precision)),
  event:clip(interval(venue.event_start,venue.event_end,venue.event_precision,true))
 })).filter(row => row.deadline || row.event).sort((a,b) => Math.min(a.deadline?.start ?? Infinity,a.event?.start ?? Infinity)-Math.min(b.deadline?.start ?? Infinity,b.event?.start ?? Infinity) || a.venue.conferencia.localeCompare(b.venue.conferencia));
 if (!rows.length) return null;
 const months = [];
 for (let tick = start; tick < end;) {
  const d = new Date(tick);
  const next = Math.min(end,Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1));
  months.push({date:d,left:position(tick),width:position(next)-position(tick)});
  tick = next;
 }
 return {start,end,months,today:0,rows};
}
