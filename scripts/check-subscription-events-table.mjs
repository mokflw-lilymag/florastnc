#!/usr/bin/env node
/**
 * tenant_subscription_events 테이블 존재 여부 확인 (배포 체크리스트용)
 * 사용: node scripts/check-subscription-events-table.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { count, error } = await admin
  .from("tenant_subscription_events")
  .select("id", { count: "exact", head: true });

if (error) {
  console.error("FAIL:", error.message);
  console.error("→ supabase/migrations/002_tenant_subscription_events.sql 실행 필요");
  process.exit(1);
}

console.log("OK: tenant_subscription_events 테이블 접근 가능 (rows:", count ?? 0, ")");
process.exit(0);
