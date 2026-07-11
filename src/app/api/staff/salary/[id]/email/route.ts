import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getStaffManagerContext,
  isManagerContext,
} from "@/lib/staff-api-context";
import { mergeTenantEmailSettings } from "@/lib/email/tenant-email-settings";
import { resolveSmtpForTenant, sendMailViaSmtp } from "@/lib/email/smtp-server";
import {
  buildPayslipEmailSubject,
  buildPayslipHtml,
} from "@/lib/staff-salary-payslip";
import { STAFF_FINANCIAL_SELECT, STAFF_SALARY_SELECT } from "@/types/staff-salary";
import type { StaffFinancial } from "@/types/staff-salary";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getStaffManagerContext();
  if (!isManagerContext(ctx)) return ctx;

  const { id: statementId } = await params;
  const body = await req.json();
  const emailTo = body.email?.trim();

  const admin = createAdminClient()!;

  const { data: stmt, error: stmtErr } = await admin
    .from("staff_salary_statements")
    .select(`${STAFF_SALARY_SELECT}, tenant_staff(name, position, email)`)
    .eq("id", statementId)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (stmtErr || !stmt) {
    return NextResponse.json({ error: "명세서를 찾을 수 없습니다." }, { status: 404 });
  }

  const staffRaw = stmt.tenant_staff;
  const staff = (Array.isArray(staffRaw) ? staffRaw[0] : staffRaw) as {
    name: string;
    position?: string;
    email?: string;
  } | null;
  const to = emailTo || staff?.email;
  if (!to) {
    return NextResponse.json(
      { error: "직원 이메일이 없습니다. 인사 정보에 이메일을 등록하거나 수신 주소를 입력해주세요." },
      { status: 400 },
    );
  }

  const { data: finRow } = await admin
    .from("staff_financials")
    .select(STAFF_FINANCIAL_SELECT)
    .eq("tenant_id", ctx.tenantId)
    .eq("staff_id", stmt.staff_id)
    .maybeSingle();

  const { data: settingsRow } = await admin
    .from("system_settings")
    .select("data")
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  const emailSettings = mergeTenantEmailSettings(settingsRow?.data);
  const shopName = emailSettings.siteName || "FloXync";

  const html = buildPayslipHtml({
    shopName,
    staffName: staff?.name || "직원",
    position: staff?.position,
    financial: (finRow as StaffFinancial) ?? null,
    statement: stmt,
  });

  const subject = buildPayslipEmailSubject(
    shopName,
    stmt.payment_year_month,
    staff?.name || "직원",
  );

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const smtpConfig = await resolveSmtpForTenant(supabaseAdmin, ctx.tenantId);
  if (!smtpConfig) {
    return NextResponse.json(
      {
        error:
          "SMTP가 설정되지 않았습니다. 환경설정 > 이메일에서 SMTP를 먼저 설정해주세요.",
      },
      { status: 400 },
    );
  }

  await sendMailViaSmtp(smtpConfig, { to, subject, html });

  await admin
    .from("staff_salary_statements")
    .update({
      status: "sent",
      emailed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", statementId);

  return NextResponse.json({ success: true, emailedTo: to });
}
