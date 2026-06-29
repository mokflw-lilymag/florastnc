"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ShieldAlert, Cpu, HeartHandshake, Truck, Receipt } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function ExpenseManagement() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"expense" | "devices">("expense");

  // Expense Log state
  const [expenses, setExpenses] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("infra"); // infra, shipping, labor, general, device_loss
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [desc, setDesc] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("corporate_card");

  // Device state
  const [devices, setDevices] = useState<any[]>([]);
  const [newSerial, setNewSerial] = useState("");
  const [newModel, setNewModel] = useState("POST_PRINTER_V2");
  const [isRegisteringDevice, setIsRegisteringDevice] = useState(false);

  const loadExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });
    if (data) setExpenses(data);
    setLoading(false);
  };

  const loadDevices = async () => {
    const { data, error } = await supabase
      .from("tenant_devices")
      .select("*, tenants(name)")
      .order("created_at", { ascending: false });
    if (data) setDevices(data);
  };

  useEffect(() => {
    loadExpenses();
    loadDevices();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !desc) {
      toast.error("금액과 지출 내역을 정확히 적어주세요.");
      return;
    }

    try {
      const { error } = await supabase.from("expenses").insert({
        amount: parseFloat(amount),
        category,
        expense_date: expDate,
        description: desc,
        payment_method: paymentMethod
      });
      if (error) throw error;
      toast.success("지출 내역이 장부에 기록되었습니다.");
      setAmount("");
      setDesc("");
      loadExpenses();
    } catch (err: any) {
      toast.error("지출 등록 실패", { description: err.message });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("이 지출 내역을 삭제하시겠습니까?")) return;
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      toast.success("지출 내역이 제거되었습니다.");
      loadExpenses();
    } catch (err: any) {
      toast.error("지출 삭제 실패", { description: err.message });
    }
  };

  // Device lifecycle state modifications
  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSerial.trim()) {
      toast.error("일련번호(S/N)를 입력해 주세요.");
      return;
    }
    setIsRegisteringDevice(true);

    try {
      const { error } = await supabase.from("tenant_devices").insert({
        serial_number: newSerial.trim().toUpperCase(),
        device_model: newModel,
        status: "available",
        history_logs: [{ action: "registered", date: new Date().toISOString(), note: "신규 장비 입고 등록" }]
      });
      if (error) throw error;
      toast.success("신규 장비가 재고에 입고되었습니다.");
      setNewSerial("");
      loadDevices();
    } catch (err: any) {
      toast.error("장비 등록 실패", { description: err.message });
    } finally {
      setIsRegisteringDevice(false);
    }
  };

  const handleDeviceStatusChange = async (id: string, serial: string, nextStatus: string) => {
    try {
      const currentDev = devices.find(d => d.id === id);
      const updatedLogs = [
        ...(currentDev?.history_logs || []),
        { action: nextStatus, date: new Date().toISOString(), note: `상태 변경: ${nextStatus}` }
      ];

      const { error } = await supabase
        .from("tenant_devices")
        .update({
          status: nextStatus,
          history_logs: updatedLogs,
          ...(nextStatus === "available" || nextStatus === "disposed" ? { tenant_id: null } : {})
        })
        .eq("id", id);

      if (error) throw error;

      // ⚠️ 만약 상태가 'disposed'(파기/폐기)로 변경된 경우, 장비 손실 원가(10만원)를 지출 대장에 자동으로 경비 산입
      if (nextStatus === "disposed") {
        await supabase.from("expenses").insert({
          amount: 100000,
          category: "device_loss",
          expense_date: new Date().toISOString().split("T")[0],
          description: `[장비폐기손실] 일련번호: ${serial} 폐기 처분 원가 산입`,
          payment_method: "etc"
        });
        toast.info("장비가 폐기되었습니다. 100,000원 상당의 손실 원가가 지출 경비에 자동 산입되었습니다.");
        loadExpenses();
      } else {
        toast.success(`장비 상태가 ${nextStatus}(으)로 갱신되었습니다.`);
      }

      loadDevices();
    } catch (err: any) {
      toast.error("장비 상태 갱신 실패", { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Button 
          variant={activeTab === "expense" ? "default" : "outline"} 
          onClick={() => setActiveTab("expense")}
          className="rounded-xl"
        >
          <Receipt className="mr-2 h-4 w-4" /> 본사 지출 장부
        </Button>
        <Button 
          variant={activeTab === "devices" ? "default" : "outline"} 
          onClick={() => setActiveTab("devices")}
          className="rounded-xl"
        >
          <Cpu className="mr-2 h-4 w-4" /> 임대 장비/재고 추적
        </Button>
      </div>

      {activeTab === "expense" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 rounded-2xl border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg font-bold">지출 내역 기입</CardTitle>
              <CardDescription>인건비, 서버비, 택배비 등 본사 지출 비용 입력</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div className="space-y-2">
                  <Label>지출 구분</Label>
                  <Select value={category} onValueChange={(val) => setCategory(val || "infra")}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="infra">서버 및 인프라 비용</SelectItem>
                      <SelectItem value="shipping">물류 및 택배 배송비</SelectItem>
                      <SelectItem value="labor">개발 및 운영 인건비</SelectItem>
                      <SelectItem value="general">일반 관리비 및 월세</SelectItem>
                      <SelectItem value="device_loss">임대 장비 손실/폐기비</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exp-amount">금액 (원)</Label>
                  <Input 
                    id="exp-amount" 
                    type="number" 
                    placeholder="100,000" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exp-date">지출 일자</Label>
                  <Input 
                    id="exp-date" 
                    type="date" 
                    value={expDate} 
                    onChange={e => setExpDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exp-desc">지출 적요 및 거래처명</Label>
                  <Input 
                    id="exp-desc" 
                    placeholder="Vercel Pro 플랜 인프라 정산" 
                    value={desc} 
                    onChange={e => setDesc(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>결제 수단</Label>
                  <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val || "corporate_card")}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corporate_card">법인 신용카드</SelectItem>
                      <SelectItem value="bank_transfer">계좌 이체 (현금)</SelectItem>
                      <SelectItem value="etc">기타/수수료 정산</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full rounded-xl">
                  <Plus className="mr-2 h-4 w-4" /> 장부 기입하기
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 rounded-2xl border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg font-bold">지출 대장</CardTitle>
              <CardDescription>국세청 소득 증빙 경비 산입용 매입 내역</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto space-y-3">
                  {expenses.map((exp) => (
                    <div key={exp.id} className="flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-100">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{exp.description}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {exp.category === "infra" ? "서버/인프라" : exp.category === "shipping" ? "배송/물류" : exp.category === "labor" ? "인건비" : exp.category === "device_loss" ? "장비손실" : "일반"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                          {exp.expense_date} · {exp.payment_method === "corporate_card" ? "법인카드" : "계좌이체"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-extrabold text-sm text-slate-800">
                          ₩{exp.amount.toLocaleString()}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="h-8 w-8 text-slate-400 hover:text-red-500 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {expenses.length === 0 && (
                    <p className="text-center text-sm text-slate-400 py-10 font-medium">기록된 매입 지출 내역이 없습니다.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        // Device Track List
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 rounded-2xl border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg font-bold">새 장비 입고</CardTitle>
              <CardDescription>출고 전 프린터 고유 일련번호(S/N) 재고 등록</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegisterDevice} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="device-sn">일련번호 (S/N)</Label>
                  <Input 
                    id="device-sn" 
                    placeholder="FP20260629A" 
                    value={newSerial} 
                    onChange={e => setNewSerial(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>기기 모델</Label>
                  <Input 
                    value={newModel} 
                    disabled 
                    className="rounded-xl bg-slate-50"
                  />
                </div>
                <Button type="submit" className="w-full rounded-xl" disabled={isRegisteringDevice}>
                  {isRegisteringDevice ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> 재고 등록</>}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 rounded-2xl border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg font-bold">장비 재고 대장</CardTitle>
              <CardDescription>임대 중인 기기 상태 및 가맹점 연동 내역 조회</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-y-auto space-y-3">
                {devices.map((dev) => (
                  <div key={dev.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 tracking-tight">{dev.serial_number}</span>
                          <Badge variant="secondary" className="text-[10px]">{dev.device_model}</Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {dev.tenants?.name ? `임대 매장: ${dev.tenants.name}` : "재고 보관 중"}
                        </p>
                      </div>

                      {/* Lifecycle status switch controllers */}
                      <div className="flex items-center gap-1.5">
                        <Button 
                          size="sm"
                          variant={dev.status === "available" ? "default" : "outline"}
                          onClick={() => handleDeviceStatusChange(dev.id, dev.serial_number, "available")}
                          className="text-[10px] h-7 px-2.5 rounded-lg"
                        >
                          정상재고
                        </Button>
                        <Button 
                          size="sm"
                          variant={dev.status === "damaged" ? "destructive" : "outline"}
                          onClick={() => handleDeviceStatusChange(dev.id, dev.serial_number, "damaged")}
                          className="text-[10px] h-7 px-2.5 rounded-lg"
                        >
                          고장/AS
                        </Button>
                        <Button 
                          size="sm"
                          variant={dev.status === "disposed" ? "secondary" : "outline"}
                          onClick={() => handleDeviceStatusChange(dev.id, dev.serial_number, "disposed")}
                          className="text-[10px] h-7 px-2.5 rounded-lg text-red-500"
                        >
                          폐기처리
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {devices.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-10 font-medium">등록된 임대 장비 재고가 없습니다.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
