import {mkdir, rm, copyFile, cp, readFile, writeFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const data = JSON.parse(await readFile('data/conferences.json', 'utf8'));
const ids = new Set();
for (const venue of data) {
  if (!venue.id || ids.has(venue.id)) throw new Error('ID ausente ou duplicado');
  ids.add(venue.id);
  for (const key of ['conferencia','area','site_url','ano_edicao']) if (!venue[key]) throw new Error(`${venue.id}: ${key} obrigatório`);
  if (!/^https?:$/.test(new URL(venue.site_url).protocol)) throw new Error('URL inválida');
  const d = venue.deadline;
  if (![null,'day','month'].includes(venue.deadline_precision)) throw new Error('Precisão deve ser day, month ou null');
  if (!d && venue.deadline_precision !== null) throw new Error('Prazo ausente deve ter precisão null');
  if (!['confirmed','estimated','unknown'].includes(venue.deadline_status)) throw new Error('Confirmação inválida');
  if (venue.deadline_status === 'confirmed' && (!d || !venue.deadline_source)) throw new Error('Prazo confirmado precisa de data e fonte');
  if (venue.deadline_status === 'unknown' && d) throw new Error('Status incompatível com data');
  if (!venue.checked_at || !venue.source_url) throw new Error('Registro sem auditoria');
  if (venue.h5_index != null && (!Number.isInteger(venue.h5_index) || venue.h5_index < 0 || !venue.h5_source || !venue.h5_checked_at)) throw new Error(`${venue.id}: índice h5 requer valor inteiro, fonte e data de consulta`);
  if (venue.h5_source && !/^https?:$/.test(new URL(venue.h5_source).protocol)) throw new Error(`${venue.id}: fonte h5 inválida`);
  if (venue.h5_checked_at && (!/^\d{4}-\d{2}-\d{2}$/.test(venue.h5_checked_at) || !Number.isFinite(Date.parse(venue.h5_checked_at)) || new Date(venue.h5_checked_at).toISOString().slice(0,10) !== venue.h5_checked_at)) throw new Error(`${venue.id}: data de consulta h5 inválida`);
  for (const url of [venue.source_url,venue.deadline_source].filter(Boolean)) if (!/^https?:$/.test(new URL(url).protocol)) throw new Error('Fonte inválida');
  if (venue.deadline_at && (venue.deadline_precision !== 'day' || !venue.deadline_at.startsWith(d+'T') || !Number.isFinite(Date.parse(venue.deadline_at)) || !/(Z|[+-]\d{2}:\d{2})$/.test(venue.deadline_at))) throw new Error('Instante ou fuso incompatível');
  if (d && !/^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/.test(d)) throw new Error(`${venue.id}: data inválida`);
  if (d?.length === 10 && new Date(d).toISOString().slice(0,10) !== d) throw new Error('Dia inválido');
  if ((d?.length === 7 && venue.deadline_precision !== 'month') || (d?.length === 10 && venue.deadline_precision !== 'day')) throw new Error('Precisão inválida');
  const manual = venue.deadline_manual;
  if (manual != null) {
    if (typeof manual !== 'object' || Array.isArray(manual)) throw new Error('deadline_manual deve ser objeto ou null');
    const md = manual.date;
    if (typeof md !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/.test(md)) throw new Error('Data manual inválida');
    if (md.length === 10 && (!Number.isFinite(Date.parse(md)) || new Date(md).toISOString().slice(0,10) !== md)) throw new Error('Dia manual inválido');
    if (manual.precision !== (md.length === 10 ? 'day' : 'month')) throw new Error('Precisão manual incompatível');
    if (!['confirmed','estimated'].includes(manual.status) || !manual.track || !manual.checked_at) throw new Error('Metadados manuais incompletos');
    if (manual.source && !/^https?:$/.test(new URL(manual.source).protocol)) throw new Error('Fonte manual inválida');
    if (manual.at && (manual.precision !== 'day' || !manual.at.startsWith(md+'T') || !Number.isFinite(Date.parse(manual.at)) || !/(Z|[+-]\d{2}:\d{2})$/.test(manual.at))) throw new Error('Instante manual incompatível');
  }

}
await rm('site', {recursive:true, force:true});
await mkdir('site');
await copyFile('index.html', 'site/index.html');
await copyFile('equipe.html', 'site/equipe.html');
await cp('assets','site/assets',{recursive:true});
await cp('data','site/data',{recursive:true});
await copyFile('.nojekyll','site/.nojekyll');
// Version the whole module graph together so a new page cannot reuse old logic.
const assetNames = (await readdir('assets')).filter(name => /\.(js|css)$/.test(name)).sort();
const hash = createHash('sha256');
for (const name of assetNames) hash.update(name).update(await readFile(`assets/${name}`));
hash.update(await readFile('data/conferences.json'));
const version = hash.digest('hex').slice(0,12);
for (const name of assetNames.filter(name=>name.endsWith('.js'))) {
  const source = await readFile(`assets/${name}`, 'utf8');
  await writeFile(`site/assets/${name}`, source.replace(/(from\s+['"]\.\/[^'"]+\.js)(['"])/g, `$1?v=${version}$2`));
}
for (const page of ['index.html','equipe.html']) {
  const html = await readFile(page,'utf8');
  await writeFile(`site/${page}`,html.replace(/(assets\/[^"\s]+\.(?:js|css))(?=")/g, `$1?v=${version}`));
}
console.log(`Site gerado em site/; ${data.length} venues validados.`);
