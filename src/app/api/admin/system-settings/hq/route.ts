import { NextResponse } from 'next/server';
import { requireAuthenticated, effectiveIsSuperAdmin } from '@/lib/auth-api-guards';
import { createAdminClient } from '@/utils/supabase/admin';
import { hqApiUiBase } from '@/lib/hq/hq-api-locale';
import { errAdminForbidden, errAdminServerMisconfigured } from '@/lib/admin/admin-api-errors';

export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get('uiLocale'));

  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  try {
    const { data, error } = await admin
      .from('system_settings')
      .select('data')
      .eq('id', 'hq')
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ data: data?.data || {} });
  } catch (err: any) {
    console.error('Error fetching HQ settings:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get('uiLocale'));

  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  try {
    const { settings } = await req.json();

    const { error } = await admin
      .from('system_settings')
      .upsert({
        id: 'hq',
        data: settings,
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error updating HQ settings:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
