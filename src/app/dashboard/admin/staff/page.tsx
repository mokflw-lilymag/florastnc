"use client";
import { getMessages } from "@/i18n/getMessages";

import React, { useState, useEffect } from "react";
import { 
  Users, UserPlus, Search, Filter, 
  MoreVertical, Shield, ShieldCheck, 
  Mail, Phone, Briefcase, Calendar,
  MoreHorizontal, Trash2, Edit3, ShieldAlert,
  CreditCard, Settings, Plus, X, Save
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

interface StaffProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
  tenant_id: string;
}

interface HQRole {
  id: string;
  role_key: string;
  role_name: string;
  description: string;
}

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [hqRoles, setHqRoles] = useState<HQRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRoleManagerOpen, setIsRoleManagerOpen] = useState(false);
  const [newRole, setNewRole] = useState({ role_key: '', role_name: '', description: '' });
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      const hqTenantId = profile?.tenant_id;
      if (!hqTenantId) return;

      // Fetch Staff
      const { data: staffData } = await supabase.from('profiles').select('*').eq('tenant_id', hqTenantId).order('role', { ascending: false });
      setStaff(staffData || []);

      // Fetch Roles from Master Table
      const { data: roleData } = await supabase.from('hq_roles').select('*').order('role_name');
      setHqRoles(roleData || []);
    } catch (error) {
      toast.error(tf.f01092);
    } finally {
      setLoading(false);
    }
  };

  const updateStaffRole = async (userId: string, newRoleKey: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRoleKey }).eq('id', userId);
    if (!error) {
      setStaff(prev => prev.map(s => s.id === userId ? { ...s, role: newRoleKey } : s));
      toast.success(tf.f01957);
    }
  };

  const addHqRole = async () => {
    if (!newRole.role_key || !newRole.role_name) return toast.error(tf.f02077);
    const roleKey = newRole.role_key.startsWith('hq_') ? newRole.role_key : `hq_${newRole.role_key}`;
    const { error } = await supabase.from('hq_roles').insert([{ ...newRole, role_key: roleKey }]);
    if (error) return toast.error(tf.f01962);
    toast.success(tf.f01388);
    setNewRole({ role_key: '', role_name: '', description: '' });
    fetchInitialData();
  };

  const deleteHqRole = async (id: string) => {
    const { error } = await supabase.from('hq_roles').delete().eq('id', id);
    if (!error) {
      toast.success(tf.f01964);
      fetchInitialData();
    }
  };

  const filteredStaff = staff.filter(s => s.email.toLowerCase().includes(searchTerm.toLowerCase()));

  const getRoleDisplayName = (roleKey: string) => {
    if (roleKey === 'super_admin') return tf.f01464;
    const role = hqRoles.find(r => r.role_key === roleKey);
    return role ? role.role_name : roleKey;
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Badge variant="outline" className="text-indigo-600 bg-indigo-50/50 border-indigo-100 font-black text-[10px] tracking-widest px-2 py-0.5 uppercase">{tf.f01831}</Badge>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-slate-900" />
            {tf.f01273}
          </h2>
          <p className="text-slate-500 font-medium">{tf.f01439}</p>
        </div>
        <div className="flex items-center gap-3">
            <Dialog open={isRoleManagerOpen} onOpenChange={setIsRoleManagerOpen}>
                <DialogTrigger 
                    render={
                        <Button variant="outline" className="rounded-2xl h-10 px-5 font-black gap-2 border-slate-200">
                            <Settings className="w-4 h-4" />
                            {tf.f01959}
                        </Button>
                    }
                />
                <DialogContent className="max-w-2xl rounded-[2.5rem] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">{tf.f01276}</DialogTitle>
                        <DialogDescription className="font-medium">{tf.f01487}</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 pt-4">
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3">
                            <h4 className="text-xs font-black text-slate-400 tracking-widest uppercase">{tf.f01496}</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <Input placeholder={tf.f02074} value={newRole.role_key} onChange={(e) => setNewRole({...newRole, role_key: e.target.value})} className="rounded-xl h-11 font-bold bg-white" />
                                <Input placeholder={tf.f02117} value={newRole.role_name} onChange={(e) => setNewRole({...newRole, role_name: e.target.value})} className="rounded-xl h-11 font-bold bg-white" />
                            </div>
                            <Input placeholder={tf.f01961} value={newRole.description} onChange={(e) => setNewRole({...newRole, description: e.target.value})} className="rounded-xl h-11 font-bold bg-white" />
                            <Button onClick={addHqRole} className="w-full bg-slate-900 text-white rounded-xl font-black h-11">{tf.f01960}</Button>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-3">{tf.f02190} ({hqRoles.length})</h4>
                            <div className="grid gap-2">
                                {hqRoles.map(role => (
                                    <div key={role.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-slate-300">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 font-black text-xs uppercase">
                                                {role.role_key.replace('hq_', '').substring(0, 2)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900">{role.role_name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">{role.role_key}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => deleteHqRole(role.id)} className="h-8 w-8 p-0 rounded-lg text-slate-200 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-[1.2rem] h-10 px-5 font-black gap-2">
                <UserPlus className="w-4 h-4" />
                {tf.f01956}
            </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="border-none shadow-xl shadow-slate-100 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
            <div className="flex items-center justify-between">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder={tf.f01683} className="pl-10 h-10 bg-white border-slate-200 rounded-2xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/30 hover:bg-transparent">
                  <TableHead className="pl-10 h-14 text-[10px] font-black uppercase tracking-widest text-slate-400">{tf.f01954}</TableHead>
                  <TableHead className="h-14 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">{tf.f01289}</TableHead>
                  <TableHead className="h-14 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">{tf.f01108}</TableHead>
                  <TableHead className="h-14 pr-10 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow><TableCell colSpan={4} className="h-48 text-center text-slate-300 font-bold">{tf.f00177}</TableCell></TableRow>
                ) : filteredStaff.map((person) => (
                  <TableRow key={person.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-10 py-5">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border-2 border-white"><AvatarFallback className="bg-slate-100 font-bold">{person.email.substring(0, 2)}</AvatarFallback></Avatar>
                        <span className="text-sm font-black text-slate-900">{person.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                        <Badge className="bg-slate-900 border-none rounded-lg px-3 py-1 font-black text-[10px] uppercase tracking-wider">
                            {getRoleDisplayName(person.role)}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-slate-900">{new Date(person.created_at).toLocaleDateString()}</span>
                            <span className="text-[9px] font-bold text-emerald-500 uppercase">{tf.f02223}</span>
                        </div>
                    </TableCell>
                    <TableCell className="pr-10 text-right">
                      {person.role !== 'super_admin' && (
                        <DropdownMenu>
                            <DropdownMenuTrigger 
                                render={
                                    <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl">
                                        <MoreHorizontal className="h-5 w-5 text-slate-300" />
                                    </Button>
                                }
                            />
                            <DropdownMenuContent align="end" className="w-52 rounded-2xl shadow-xl border-slate-100 p-2">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{tf.f01275}</DropdownMenuLabel>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                {hqRoles.map(role => (
                                    <DropdownMenuItem key={role.id} className="rounded-xl cursor-pointer font-bold text-xs py-2.5" onClick={() => updateStaffRole(person.id, role.role_key)}>
                                        <Shield className="w-3.5 h-3.5 mr-2 text-indigo-500" /> {role.role_name}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="rounded-xl cursor-pointer font-bold text-xs py-2.5 text-red-500">{tf.f00933}</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
