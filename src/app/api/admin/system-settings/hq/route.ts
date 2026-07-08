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

    // Get hq_tenant_id from organizations
    const { data: orgData, error: orgError } = await admin
      .from('organizations')
      .select('hq_tenant_id')
      .limit(1)
      .single();

    if (orgError || !orgData?.hq_tenant_id) {
      throw new Error('HQ tenant ID not found in organizations table');
    }

    const { error } = await admin
      .from('system_settings')
      .upsert({
        id: 'hq',
        tenant_id: orgData.hq_tenant_id,
        data: settings,
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error updating HQ settings:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
