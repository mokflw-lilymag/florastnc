import { NextResponse } from 'next/server';
import { tasks } from '@trigger.dev/sdk/v3';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current tenant ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const { type, templateId } = await req.json();

    if (!['firstPurchase', 'd7', 'dayOf', 'custom_ad'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Trigger the background task for bulk marketing email
    await tasks.trigger("marketing-bulk-email", {
      tenantId: profile.tenant_id,
      templateType: type as 'firstPurchase' | 'd7' | 'dayOf' | 'custom_ad',
      templateId,
      triggeredBy: user.id
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Bulk marketing API Error:", err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
