"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatKrw } from "@/lib/staff-salary-calc";
import { formatServiceTenure } from "@/lib/payroll/severance-kr";
import type { SeveranceEstimate } from "@/lib/payroll/types";
import { Landmark } from "lucide-react";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

interface StaffSeveranceCardProps {
  staffId: string | null;
}

export function StaffSeveranceCard({ staffId }: StaffSeveranceCardProps) {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);

  const [estimate, setEstimate] = useState<SeveranceEstimate | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!staffId) return;
    setLoading(true);
    fetch(`/api/staff/severance?staffId=${staffId}`)
      .then((r) => r.json())
      .then((json) => {
        setEstimate(json.estimate ?? null);
        setMessage(json.message ?? null);
      })
      .catch(() => setMessage(pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "퇴직금 조회에 실패했습니다.", "Severance pay inquiry failed.", "Yêu cầu trả tiền thôi việc không thành công.", "退職金の照会に失敗しました。", "遣散费查询失败。", "遣散費查詢失敗。", "La consulta de indemnización por despido falló.", "A consulta de indenização por demissão falhou.", "L’enquête sur l’indemnité de départ a échoué.", "Die Ermittlungen zur Abfindung scheiterten.", "Расследование о выплате выходного пособия не удалось."), "Severance pay inquiry failed.", "Yêu cầu trả tiền thôi việc không thành công.", "退職金の照会に失敗しました。", "遣散费查询失败。", "遣散費查詢失敗。", "La consulta de indemnización por despido falló.", "A consulta de indenização por demissão falhou.", "L’enquête sur l’indemnité de départ a échoué.", "Die Ermittlungen zur Abfindung scheiterten.", "Расследование о выплате выходного пособия не удалось."), "Severance pay inquiry failed.", "Yêu cầu trả tiền thôi việc không thành công.", "退職金の照会に失敗しました。", "遣散费查询失败。", "遣散費查詢失敗。", "La consulta de indemnización por despido falló.", "A consulta de indenização por demissão falhou.", "L’enquête sur l’indemnité de départ a échoué.", "Die Ermittlungen zur Abfindung scheiterten.", "Расследование о выплате выходного пособия не удалось."), "Severance pay inquiry failed.", "Yêu cầu trả tiền thôi việc không thành công.", "退職金の照会に失敗しました。", "遣散费查询失败。", "遣散費查詢失敗。", "La consulta de indemnización por despido falló.", "A consulta de indenização por demissão falhou.", "L’enquête sur l’indemnité de départ a échoué.", "Die Ermittlungen zur Abfindung scheiterten.", "Расследование о выплате выходного пособия не удалось.")))
      .finally(() => setLoading(false));
  }, [staffId]);

  if (!staffId) return null;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="w-4 h-4 text-amber-600" />
         {pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "퇴직금 예상 (한국)", "Severance pay expected (Korea)", "Dự kiến ​​trợ cấp thôi việc (Hàn Quốc)", "退職金予想(韓国)", "预计遣散费（韩国）", "預計遣散費（韓國）", "Se espera una indemnización por despido (Corea)", "Indenização prevista (Coréia)", "Indemnité de départ attendue (Corée)", "Abfindung erwartet (Korea)", "Ожидается выходное пособие (Корея)"), "Severance pay expected (Korea)", "Dự kiến ​​trợ cấp thôi việc (Hàn Quốc)", "退職金予想(韓国)", "预计遣散费（韩国）", "預計遣散費（韓國）", "Se espera una indemnización por despido (Corea)", "Indenização prevista (Coréia)", "Indemnité de départ attendue (Corée)", "Abfindung erwartet (Korea)", "Ожидается выходное пособие (Корея)"), "Severance pay expected (Korea)", "Dự kiến ​​trợ cấp thôi việc (Hàn Quốc)", "退職金予想(韓国)", "预计遣散费（韩国）", "預計遣散費（韓國）", "Se espera una indemnización por despido (Corea)", "Indenização prevista (Coréia)", "Indemnité de départ attendue (Corée)", "Abfindung erwartet (Korea)", "Ожидается выходное пособие (Корея)"), "Severance pay expected (Korea)", "Dự kiến ​​trợ cấp thôi việc (Hàn Quốc)", "退職金予想(韓国)", "预计遣散费（韩国）", "預計遣散費（韓國）", "Se espera una indemnización por despido (Corea)", "Indenização prevista (Coréia)", "Indemnité de départ attendue (Corée)", "Abfindung erwartet (Korea)", "Ожидается выходное пособие (Корея)")})
        </CardTitle>
        <CardDescription>{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "근로자퇴직급여보장법 기준 참고용", "For reference based on the Employee Retirement Benefit Security Act", "Để tham khảo dựa trên Đạo luật An ninh Phúc lợi Hưu trí của Nhân viên", "労働者退職給与保障法基準参照", "根据《雇员退休金保障法》供参考", "依《僱員退休金保障法》供參考", "Para referencia basada en la Ley de Seguridad de Beneficios de Jubilación de Empleados", "Para referência com base na Lei de Segurança de Benefícios de Aposentadoria de Funcionários", "Pour référence basée sur la Loi sur la sécurité des prestations de retraite des employés", "Als Referenz basierend auf dem Employee Retirement Benefit Security Act", "Для справки на основании Закона о пенсионном обеспечении сотрудников."), "For reference based on the Employee Retirement Benefit Security Act", "Để tham khảo dựa trên Đạo luật An ninh Phúc lợi Hưu trí của Nhân viên", "労働者退職給与保障法基準参照", "根据《雇员退休金保障法》供参考", "依《僱員退休金保障法》供參考", "Para referencia basada en la Ley de Seguridad de Beneficios de Jubilación de Empleados", "Para referência com base na Lei de Segurança de Benefícios de Aposentadoria de Funcionários", "Pour référence basée sur la Loi sur la sécurité des prestations de retraite des employés", "Als Referenz basierend auf dem Employee Retirement Benefit Security Act", "Для справки на основании Закона о пенсионном обеспечении сотрудников."), "For reference based on the Employee Retirement Benefit Security Act", "Để tham khảo dựa trên Đạo luật An ninh Phúc lợi Hưu trí của Nhân viên", "労働者退職給与保障法基準参照", "根据《雇员退休金保障法》供参考", "依《僱員退休金保障法》供參考", "Para referencia basada en la Ley de Seguridad de Beneficios de Jubilación de Empleados", "Para referência com base na Lei de Segurança de Benefícios de Aposentadoria de Funcionários", "Pour référence basée sur la Loi sur la sécurité des prestations de retraite des employés", "Als Referenz basierend auf dem Employee Retirement Benefit Security Act", "Для справки на основании Закона о пенсионном обеспечении сотрудников."), "For reference based on the Employee Retirement Benefit Security Act", "Để tham khảo dựa trên Đạo luật An ninh Phúc lợi Hưu trí của Nhân viên", "労働者退職給与保障法基準参照", "根据《雇员退休金保障法》供参考", "依《僱員退休金保障法》供參考", "Para referencia basada en la Ley de Seguridad de Beneficios de Jubilación de Empleados", "Para referência com base na Lei de Segurança de Benefícios de Aposentadoria de Funcionários", "Pour référence basée sur la Loi sur la sécurité des prestations de retraite des employés", "Als Referenz basierend auf dem Employee Retirement Benefit Security Act", "Для справки на основании Закона о пенсионном обеспечении сотрудников.")}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "계산 중...", "Calculating...", "Đang tính...", "計算中...", "正在计算...", "正在計算...", "Calculador...", "Calculando...", "Calculateur...", "Berechnen...", "Расчет..."), "Calculating...", "Đang tính...", "計算中...", "正在计算...", "正在計算...", "Calculador...", "Calculando...", "Calculateur...", "Berechnen...", "Расчет..."), "Calculating...", "Đang tính...", "計算中...", "正在计算...", "正在計算...", "Calculador...", "Calculando...", "Calculateur...", "Berechnen...", "Расчет..."), "Calculating...", "Đang tính...", "計算中...", "正在计算...", "正在計算...", "Calculador...", "Calculando...", "Calculateur...", "Berechnen...", "Расчет...")}</p>
        ) : message && !estimate ? (
          <p className="text-sm text-slate-500">{message}</p>
        ) : estimate ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "근속", "longevity", "tuổi thọ", "勤続", "长寿", "長壽", "longevidad", "longevidade", "longévité", "Langlebigkeit", "долголетие"), "longevity", "tuổi thọ", "勤続", "长寿", "長壽", "longevidad", "longevidade", "longévité", "Langlebigkeit", "долголетие"), "longevity", "tuổi thọ", "勤続", "长寿", "長壽", "longevidad", "longevidade", "longévité", "Langlebigkeit", "долголетие"), "longevity", "tuổi thọ", "勤続", "长寿", "長壽", "longevidad", "longevidade", "longévité", "Langlebigkeit", "долголетие")}</span>
              <span className="font-medium">
                {formatServiceTenure(estimate.serviceDays)} ({estimate.serviceYears}년)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "1일 평균임금", "average daily wage", "lương trung bình ngày", "1日平均賃金", "平均日工资", "平均日薪", "salario diario promedio", "salário médio diário", "salaire journalier moyen", "durchschnittlicher Tageslohn", "средняя дневная заработная плата"), "average daily wage", "lương trung bình ngày", "1日平均賃金", "平均日工资", "平均日薪", "salario diario promedio", "salário médio diário", "salaire journalier moyen", "durchschnittlicher Tageslohn", "средняя дневная заработная плата"), "average daily wage", "lương trung bình ngày", "1日平均賃金", "平均日工资", "平均日薪", "salario diario promedio", "salário médio diário", "salaire journalier moyen", "durchschnittlicher Tageslohn", "средняя дневная заработная плата"), "average daily wage", "lương trung bình ngày", "1日平均賃金", "平均日工资", "平均日薪", "salario diario promedio", "salário médio diário", "salaire journalier moyen", "durchschnittlicher Tageslohn", "средняя дневная заработная плата")}</span>
              <span>{formatKrw(estimate.dailyAverageWage)}</span>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center">
              <p className="text-xs text-amber-800 mb-1">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "퇴사 시 예상 퇴직금", "Expected severance pay upon leaving the company", "Dự kiến ​​trợ cấp thôi việc khi rời công ty", "退社時の予想退職金", "离开公司时预期的遣散费", "離開公司時預期的遣散費", "Indemnización esperada al dejar la empresa", "Indenização prevista ao sair da empresa", "Indemnité de départ attendue en cas de départ de l'entreprise", "Erwartete Abfindung bei Austritt aus dem Unternehmen", "Ожидаемое выходное пособие при увольнении из компании"), "Expected severance pay upon leaving the company", "Dự kiến ​​trợ cấp thôi việc khi rời công ty", "退社時の予想退職金", "离开公司时预期的遣散费", "離開公司時預期的遣散費", "Indemnización esperada al dejar la empresa", "Indenização prevista ao sair da empresa", "Indemnité de départ attendue en cas de départ de l'entreprise", "Erwartete Abfindung bei Austritt aus dem Unternehmen", "Ожидаемое выходное пособие при увольнении из компании"), "Expected severance pay upon leaving the company", "Dự kiến ​​trợ cấp thôi việc khi rời công ty", "退社時の予想退職金", "离开公司时预期的遣散费", "離開公司時預期的遣散費", "Indemnización esperada al dejar la empresa", "Indenização prevista ao sair da empresa", "Indemnité de départ attendue en cas de départ de l'entreprise", "Erwartete Abfindung bei Austritt aus dem Unternehmen", "Ожидаемое выходное пособие при увольнении из компании"), "Expected severance pay upon leaving the company", "Dự kiến ​​trợ cấp thôi việc khi rời công ty", "退社時の予想退職金", "离开公司时预期的遣散费", "離開公司時預期的遣散費", "Indemnización esperada al dejar la empresa", "Indenização prevista ao sair da empresa", "Indemnité de départ attendue en cas de départ de l'entreprise", "Erwartete Abfindung bei Austritt aus dem Unternehmen", "Ожидаемое выходное пособие при увольнении из компании")}</p>
              <p className="text-2xl font-bold text-amber-900">
                {formatKrw(estimate.estimatedAmount)}
              </p>
            </div>
            <p className="text-xs text-slate-500">{estimate.basisDescription}</p>
            <p className="text-xs text-slate-400">{estimate.disclaimer}</p>
            {!estimate.eligible && estimate.hireDate && (
              <p className="text-xs text-rose-600">{pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "1년 미만 근속 시 퇴직금 지급 의무가 없을 수 있습니다.", "There may be no obligation to pay severance pay if the employee has worked for less than one year.", "Có thể không có nghĩa vụ phải trả tiền thôi việc nếu nhân viên đã làm việc dưới một năm.", "1年未満の勤続時に退職金の支払義務がない場合があります。", "如果雇员工作时间少于一年，则可能没有义务支付遣散费。", "如果僱員工作時間少於一年，則可能沒有義務支付遣散費。", "Puede que no haya obligación de pagar una indemnización si el empleado ha trabajado menos de un año.", "Pode não haver obrigação de pagar verbas rescisórias se o empregado tiver trabalhado menos de um ano.", "Il ne peut y avoir aucune obligation de verser une indemnité de départ si le salarié a travaillé moins d'un an.", "Eine Verpflichtung zur Zahlung einer Abfindung kann entfallen, wenn der Arbeitnehmer weniger als ein Jahr gearbeitet hat.", "Обязанность по выплате выходного пособия может отсутствовать, если работник проработал менее одного года."), "There may be no obligation to pay severance pay if the employee has worked for less than one year.", "Có thể không có nghĩa vụ phải trả tiền thôi việc nếu nhân viên đã làm việc dưới một năm.", "1年未満の勤続時に退職金の支払義務がない場合があります。", "如果雇员工作时间少于一年，则可能没有义务支付遣散费。", "如果僱員工作時間少於一年，則可能沒有義務支付遣散費。", "Puede que no haya obligación de pagar una indemnización si el empleado ha trabajado menos de un año.", "Pode não haver obrigação de pagar verbas rescisórias se o empregado tiver trabalhado menos de um ano.", "Il ne peut y avoir aucune obligation de verser une indemnité de départ si le salarié a travaillé moins d'un an.", "Eine Verpflichtung zur Zahlung einer Abfindung kann entfallen, wenn der Arbeitnehmer weniger als ein Jahr gearbeitet hat.", "Обязанность по выплате выходного пособия может отсутствовать, если работник проработал менее одного года."), "There may be no obligation to pay severance pay if the employee has worked for less than one year.", "Có thể không có nghĩa vụ phải trả tiền thôi việc nếu nhân viên đã làm việc dưới một năm.", "1年未満の勤続時に退職金の支払義務がない場合があります。", "如果雇员工作时间少于一年，则可能没有义务支付遣散费。", "如果僱員工作時間少於一年，則可能沒有義務支付遣散費。", "Puede que no haya obligación de pagar una indemnización si el empleado ha trabajado menos de un año.", "Pode não haver obrigação de pagar verbas rescisórias se o empregado tiver trabalhado menos de um ano.", "Il ne peut y avoir aucune obligation de verser une indemnité de départ si le salarié a travaillé moins d'un an.", "Eine Verpflichtung zur Zahlung einer Abfindung kann entfallen, wenn der Arbeitnehmer weniger als ein Jahr gearbeitet hat.", "Обязанность по выплате выходного пособия может отсутствовать, если работник проработал менее одного года."), "There may be no obligation to pay severance pay if the employee has worked for less than one year.", "Có thể không có nghĩa vụ phải trả tiền thôi việc nếu nhân viên đã làm việc dưới một năm.", "1年未満の勤続時に退職金の支払義務がない場合があります。", "如果雇员工作时间少于一年，则可能没有义务支付遣散费。", "如果僱員工作時間少於一年，則可能沒有義務支付遣散費。", "Puede que no haya obligación de pagar una indemnización si el empleado ha trabajado menos de un año.", "Pode não haver obrigação de pagar verbas rescisórias se o empregado tiver trabalhado menos de um ano.", "Il ne peut y avoir aucune obligation de verser une indemnité de départ si le salarié a travaillé moins d'un an.", "Eine Verpflichtung zur Zahlung einer Abfindung kann entfallen, wenn der Arbeitnehmer weniger als ein Jahr gearbeitet hat.", "Обязанность по выплате выходного пособия может отсутствовать, если работник проработал менее одного года.")}</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
