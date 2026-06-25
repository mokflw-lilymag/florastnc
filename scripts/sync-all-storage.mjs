#!/usr/bin/env node
/** SOURCE → TARGET: 모든 storage 버킷 생성 + 파일 복사 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const g = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

const source = createClient(g('SOURCE_SUPABASE_URL'), g('SOURCE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const target = createClient(g('TARGET_SUPABASE_URL'), g('TARGET_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

async function listStorageObjects(client, bucket, prefix = '') {
  const out = [];
  const listAt = async (folder) => {
    const { data, error } = await client.storage.from(bucket).list(folder, { limit: 1000 });
    if (error) throw error;
    for (const item of data ?? []) {
      const p = folder ? `${folder}/${item.name}` : item.name;
      if (item.id) out.push(p);
      else await listAt(p);
    }
  };
  await listAt(prefix);
  return out;
}

const { data: srcBuckets, error: lbErr } = await source.storage.listBuckets();
if (lbErr) throw lbErr;

console.log(`SOURCE buckets: ${srcBuckets.length}`);
for (const b of srcBuckets) {
  const { data: existing } = await target.storage.getBucket(b.id);
  if (!existing) {
    const { error } = await target.storage.createBucket(b.id, {
      public: b.public,
      fileSizeLimit: b.file_size_limit ?? undefined,
    });
    if (error) console.warn(`  createBucket ${b.id}: ${error.message}`);
    else console.log(`  created bucket: ${b.id}`);
  }

  let paths = [];
  try {
    paths = await listStorageObjects(source, b.id);
  } catch (e) {
    console.log(`\n${b.id}: skip list (${e.message})`);
    continue;
  }
  console.log(`\n${b.id}: ${paths.length} files`);
  let ok = 0;
  for (const p of paths) {
    const { data: blob, error: dlErr } = await source.storage.from(b.id).download(p);
    if (dlErr) {
      console.warn(`  FAIL dl ${p}: ${dlErr.message}`);
      continue;
    }
    const { error: upErr } = await target.storage.from(b.id).upload(p, blob, { upsert: true });
    if (upErr) console.warn(`  FAIL up ${p}: ${upErr.message}`);
    else ok++;
  }
  console.log(`  copied: ${ok}/${paths.length}`);
}
