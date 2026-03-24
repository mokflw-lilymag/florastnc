"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  CheckCircle2, Circle, Clock, Calendar, 
  ListTodo, UserCheck, ShieldAlert, Award,
  CheckCheck, RefreshCw, CalendarDays, CalendarRange,
  ArrowRight, Info, Settings, Plus, Trash2, Edit2, Save, X,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, startOfMonth } from "date-fns";

interface ChecklistTask {
  id: string;
  role: string;
  task_name: string;
  description: string;
  display_order: number;
  frequency: 'daily' | 'weekly' | 'monthly';
}

interface HQRole {
  role_key: string;
  role_name: string;
}

export default function DailyChecklistPage() {
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [hqRoles, setHqRoles] = useState<HQRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("super_admin");
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("daily");
  
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [allMasterTasks, setAllMasterTasks] = useState<ChecklistTask[]>([]);
  const [newMasterTask, setNewMasterTask] = useState<Partial<ChecklistTask>>({
    role: 'hq_ops',
    frequency: 'daily',
    task_name: '',
    description: ''
  });

  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const getTargetDate = (frequency: string) => {
    const now = new Date();
    if (frequency === 'weekly') return format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (frequency === 'monthly') return format(startOfMonth(now), 'yyyy-MM-dd');
    return format(now, 'yyyy-MM-dd');
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const currentRole = profile?.role || "super_admin";
      setUserRole(currentRole);

      const { data: roles } = await supabase.from('hq_roles').select('role_key, role_name');
      setHqRoles(roles || []);

      const { data: checklistData } = await supabase
        .from('hq_checklists')
        .select('*')
        .eq('frequency', activeTab)
        .order('display_order');
      
      // Filter tasks for regular staff
      if (currentRole !== 'super_admin' && checklistData) {
        setTasks(checklistData.filter(t => t.role === currentRole));
      } else {
        setTasks(checklistData || []);
      }

      const targetDate = getTargetDate(activeTab);
      const { data: completionData } = await supabase
        .from('hq_task_completions')
        .select('task_id, is_completed')
        .eq('user_id', user.id)
        .eq('completed_at', targetDate);

      const completionMap: Record<string, boolean> = {};
      completionData?.forEach(c => {
        completionMap[c.task_id] = c.is_completed;
      });
      setCompletions(completionMap);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMasterTasks = async () => {
    const { data } = await supabase.from('hq_checklists').select('*').order('display_order');
    setAllMasterTasks(data || []);
  };

  const addMasterTask = async () => {
    if (!newMasterTask.task_name) return toast.error("업무명을 입력해주세요.");
    const { error } = await supabase.from('hq_checklists').insert([newMasterTask]);
    if (error) return toast.error("저장 중 오류 발생");
    toast.success("업무 추가 완료");
    setNewMasterTask({ ...newMasterTask, task_name: '', description: '' });
    fetchAllMasterTasks();
    fetchInitialData();
  };

  const deleteMasterTask = async (id: string, name: string) => {
    if (confirm(`'${name}' 업무를 마스터 리스트에서 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
        const { error } = await supabase.from('hq_checklists').delete().eq('id', id);
        if (!error) {
          toast.success("업무 삭제 완료");
          fetchAllMasterTasks();
          fetchInitialData();
        } else {
          toast.error("삭제 중 오류가 발생했습니다.");
        }
    }
  };

  const toggleTask = async (taskId: string) => {
    if (!userId) return;
    const isCompleted = !completions[taskId];
    const targetDate = getTargetDate(activeTab);

    try {
      if (isCompleted) {
        await supabase.from('hq_task_completions').upsert({
          user_id: userId, task_id: taskId, completed_at: targetDate, is_completed: true
        }, { onConflict: 'user_id, task_id, completed_at' });
      } else {
        await supabase.from('hq_task_completions').delete().eq('user_id', userId).eq('task_id', taskId).eq('completed_at', targetDate);
      }
      setCompletions(prev => ({ ...prev, [taskId]: isCompleted }));
      if (isCompleted) toast.success("완료 처리되었습니다.");
    } catch (error) {
      toast.error("상태 변경 실패");
    }
  };

  const completedCount = Object.values(completions).filter(v => v).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const getRoleName = (key: string) => hqRoles.find(r => r.role_key === key)?.role_name || key;

  // Filter master tasks by selected criteria in dialog
  const filteredMasterTasks = useMemo(() => {
    return allMasterTasks.filter(t => 
        t.role === newMasterTask.role && 
        t.frequency === newMasterTask.frequency
    );
  }, [allMasterTasks, newMasterTask.role, newMasterTask.frequency]);

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 max-w-5xl mx-auto pb-32">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Badge className="bg-indigo-600 text-white border-none font-black text-[10px] tracking-widest px-2 py-0.5 uppercase">Operational Protocol</Badge>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <ListTodo className="w-8 h-8 text-slate-900" />
            통합 업무 체크리스트
          </h2>
          <p className="text-slate-500 font-medium font-heading tracking-tight">본사 직무별 주기적 필수 업무 관리 시스템</p>
        </div>
        
        <div className="flex items-center gap-3">
            {userRole === 'super_admin' && (
                <Dialog open={isManageDialogOpen} onOpenChange={(open) => {
                    setIsManageDialogOpen(open);
                    if (open) fetchAllMasterTasks();
                }}>
                    <DialogTrigger 
                        render={
                            <Button variant="outline" className="rounded-2xl h-10 px-5 font-black gap-2 border-slate-200 shadow-sm">
                                <Settings className="w-4 h-4" />
                                업무 마스터 관리
                            </Button>
                        }
                    />
                    <DialogContent className="max-w-3xl rounded-[2.5rem] max-h-[90vh] overflow-y-auto border-none shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black">체크리스트 마스터 관리</DialogTitle>
                            <DialogDescription className="font-medium text-slate-500">파트와 주기를 선택하면 해당 조건의 업무만 필터링되어 나타납니다.</DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-8 pt-4">
                            <div className="bg-indigo-50/50 p-7 rounded-[2.5rem] border border-indigo-100/50 space-y-5">
                                <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    항목 추가 및 필터링 조건
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 font-bold">
                                        <label className="text-[10px] text-slate-400 uppercase tracking-widest ml-1">수행 파트 선택</label>
                                        <Select value={newMasterTask.role} onValueChange={(v) => setNewMasterTask({...newMasterTask, role: v})}>
                                            <SelectTrigger className="rounded-xl font-black h-11 bg-white border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-100">
                                                {hqRoles.map(r => <SelectItem key={r.role_key} value={r.role_key} className="font-black text-xs py-2">{r.role_name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5 font-bold">
                                        <label className="text-[10px] text-slate-400 uppercase tracking-widest ml-1">반복 주기 선택</label>
                                        <Select value={newMasterTask.frequency} onValueChange={(v: any) => setNewMasterTask({...newMasterTask, frequency: v})}>
                                            <SelectTrigger className="rounded-xl font-black h-11 bg-white border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-100">
                                                <SelectItem value="daily" className="font-black text-xs">일일 (Daily)</SelectItem>
                                                <SelectItem value="weekly" className="font-black text-xs">주간 (Weekly)</SelectItem>
                                                <SelectItem value="monthly" className="font-black text-xs">월별 (Monthly)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <Input placeholder="새로운 업무 명칭을 입력하세요" className="rounded-xl h-12 font-black border-slate-200" value={newMasterTask.task_name} onChange={(e) => setNewMasterTask({...newMasterTask, task_name: e.target.value})} />
                                    <Input placeholder="간단한 가이드 (선택 사항)" className="rounded-xl h-11 font-bold text-xs border-slate-200" value={newMasterTask.description} onChange={(e) => setNewMasterTask({...newMasterTask, description: e.target.value})} />
                                    <Button onClick={addMasterTask} className="w-full bg-slate-900 text-white rounded-xl font-black h-12 shadow-lg shadow-slate-900/20">이 조건으로 업무 등록</Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">설정된 조건의 업무 리스트 ({filteredMasterTasks.length})</h4>
                                    {filteredMasterTasks.length > 0 && <Badge className="bg-indigo-100 text-indigo-600 border-none font-black text-[9px] uppercase">{getRoleName(newMasterTask.role || '')} - {newMasterTask.frequency}</Badge>}
                                </div>
                                <div className="grid gap-2.5">
                                    {filteredMasterTasks.length === 0 ? (
                                        <div className="py-12 text-center bg-slate-50 border border-slate-100 border-dashed rounded-[2rem]">
                                            <p className="text-slate-300 font-black text-xs uppercase tracking-widest">No matching records found</p>
                                        </div>
                                    ) : filteredMasterTasks.map(task => (
                                        <div key={task.id} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-[2rem] group hover:border-red-100 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                                                    {task.frequency.substring(0, 1)}
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-black text-slate-900">{task.task_name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{task.description || '표준 가이드'}</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => deleteMasterTask(task.id, task.task_name)} className="h-9 w-9 p-0 rounded-xl text-slate-200 hover:text-red-500 group-hover:bg-red-50 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
            <Card className="bg-white p-2 rounded-2xl border border-slate-200 flex items-center gap-4 min-w-[170px] shadow-sm">
                <div className="bg-indigo-600 h-10 w-10 rounded-xl flex items-center justify-center text-white font-black text-xs">
                    {Math.round(progress)}%
                </div>
                <div className="pr-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Progress</p>
                    <p className="text-xs font-black text-slate-900">{completedCount}/{tasks.length}</p>
                </div>
            </Card>
        </div>
      </div>

      <Tabs defaultValue="daily" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1.5 rounded-2xl h-14 w-fit">
            {['daily', 'weekly', 'monthly'].map(tab => (
                <TabsTrigger key={tab} value={tab} className="rounded-xl px-12 font-black text-[11px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    {tab}
                </TabsTrigger>
            ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-0 space-y-8">
            {loading ? (
              <div className="py-24 text-center text-slate-300 font-bold uppercase tracking-[0.4em] text-xs animate-pulse">Establishing Connection...</div>
            ) : tasks.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-24 text-center">
                <p className="text-slate-400 font-bold">현재 직책에 지정된 필수 업무가 없습니다.</p>
              </div>
            ) : (
                hqRoles
                  .filter(role => tasks.some(t => t.role === role.role_key))
                  .map(role => {
                    const roleTasks = tasks.filter(t => t.role === role.role_key);
                    return (
                        <div key={role.role_key} className="space-y-5">
                            <div className="flex items-center gap-4 px-1">
                                <h3 className="text-[12px] font-black text-indigo-950 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    {role.role_name} Division
                                </h3>
                                <div className="h-px flex-1 bg-slate-200/50" />
                            </div>
                            <div className="grid gap-4">
                                {roleTasks.map(task => (
                                    <div key={task.id} onClick={() => toggleTask(task.id)} className={cn(
                                        "group flex items-center justify-between p-7 rounded-[2.5rem] border cursor-pointer transition-all duration-500",
                                        completions[task.id] ? "bg-slate-50/50 border-emerald-100 opacity-60" : "bg-white border-slate-200 hover:border-indigo-400 hover:shadow-2xl shadow-indigo-500/10"
                                    )}>
                                        <div className="flex items-center gap-7">
                                            <div className={cn(
                                                "w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500",
                                                completions[task.id] ? "bg-emerald-500 text-white rotate-[360deg]" : "bg-slate-50 text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-500"
                                            )}>
                                                {completions[task.id] ? <CheckCheck className="w-8 h-8" /> : <Circle className="w-8 h-8" />}
                                            </div>
                                            <div>
                                                <h4 className={cn("font-black text-xl tracking-tight transition-colors", completions[task.id] ? "text-slate-400 line-through" : "text-slate-900 group-hover:text-indigo-600")}>{task.task_name}</h4>
                                                <p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-2">
                                                    <AlertTriangle className="w-3 h-3 opacity-50" /> {task.description || "본사 표준 직무 가이드 준수"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {completions[task.id] && <Badge className="bg-emerald-100 text-emerald-600 border-none font-black text-[10px] uppercase rounded-full px-4 h-7">Verified</Badge>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}
        </TabsContent>
      </Tabs>
      
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 drop-shadow-2xl">
          <div className="bg-slate-900 p-5 rounded-[2.5rem] border border-white/10 shadow-2xl flex items-center justify-between">
              <div className="flex items-center gap-4 pl-2">
                  <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center text-white">
                      <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                      <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Job Role Console</h4>
                      <p className="text-[10px] font-medium text-white/50">현재 "{userRole === 'super_admin' ? '전체 관리' : getRoleName(userRole)}" 모드입니다.</p>
                  </div>
              </div>
              <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-black text-[10px] px-6 h-10 uppercase transition-all" onClick={() => window.location.href='/dashboard/admin/staff'}>
                  Staff Admin
              </Button>
          </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) { return classes.filter(Boolean).join(" "); }
