#!/usr/bin/env node
/** Generate CREATE TABLE SQL from PostgREST OpenAPI (source project export). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(fs.readFileSync(path.join(__dirname, '_source_openapi.json'), 'utf8'));
const defs = spec.definitions ?? {};

function mapType(prop) {
  const fmt = prop.format ?? '';
  if (fmt === 'uuid') return 'UUID';
  if (fmt === 'text') return 'TEXT';
  if (fmt === 'integer') return 'INTEGER';
  if (fmt === 'bigint') return 'BIGINT';
  if (fmt === 'numeric') return 'NUMERIC';
  if (fmt === 'boolean') return 'BOOLEAN';
  if (fmt === 'jsonb') return 'JSONB';
  if (fmt === 'timestamp with time zone') return 'TIMESTAMPTZ';
  if (fmt === 'date') return 'DATE';
  if (fmt === 'double precision') return 'DOUBLE PRECISION';
  if (fmt === 'character varying') return 'TEXT';
  if (fmt === 'json') return 'JSONB';
  if (prop.type === 'array') return 'JSONB';
  if (prop.type === 'number') return 'NUMERIC';
  if (prop.type === 'integer') return 'INTEGER';
  if (prop.type === 'boolean') return 'BOOLEAN';
  if (prop.type === 'string') return 'TEXT';
  return 'JSONB';
}

function isPk(prop) {
  return (prop.description ?? '').includes('Primary Key');
}

const lines = [
  '-- Auto-generated from source OpenAPI for REST migration',
  'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
  'CREATE EXTENSION IF NOT EXISTS pgcrypto;',
  '',
];

const tableNames = Object.keys(defs).filter((k) => !k.includes('.') && defs[k].properties);

for (const table of tableNames.sort()) {
  const def = defs[table];
  const props = def.properties ?? {};
  const required = new Set(def.required ?? []);
  const cols = [];

  for (const [name, prop] of Object.entries(props)) {
    let sqlType = mapType(prop);
    let col = `"${name}" ${sqlType}`;
    if (isPk(prop)) col += ' PRIMARY KEY';
    else if (required.has(name)) col += ' NOT NULL';
    if (prop.default && !isPk(prop)) {
      const d = String(prop.default);
      if (d === 'now()') col += ' DEFAULT now()';
      else if (d.includes('uuid_generate_v4')) col += ' DEFAULT uuid_generate_v4()';
      else if (d.startsWith("'") || /^-?\d/.test(d)) col += ` DEFAULT ${d}`;
    }
    cols.push(col);
  }

  if (!cols.length) continue;
  lines.push(`CREATE TABLE IF NOT EXISTS public."${table}" (`);
  lines.push(`  ${cols.join(',\n  ')}`);
  lines.push(');');
  lines.push('');
}

const out = path.join(__dirname, '_generated_public_schema.sql');
fs.writeFileSync(out, lines.join('\n'));
console.log(`Wrote ${tableNames.length} tables -> ${out}`);
