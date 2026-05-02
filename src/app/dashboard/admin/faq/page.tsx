"use client";
import { getMessages } from "@/i18n/getMessages";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Search, ArrowUpDown, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";

interface Faq {
  id: string;
  category: string;
  category_icon: string;
  category_order: number;
  question: string;
  answer: string;
  question_order: number;
  is_featured: boolean;
  is_active: boolean;
}

export default function AdminFaqPage() {
  const supabase = createClient();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState(tf.f02142);
  const [categoryIcon, setCategoryIcon] = useState("🖨️");
  const [categoryOrder, setCategoryOrder] = useState(1);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [questionOrder, setQuestionOrder] = useState(1);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const formatCategoryLabel = useCallback(
    (value: string) => {
      const map: Record<string, string> = {
        "프린터/리본 출력": tf.f02477,
        "프린터 연동": tf.f02478,
        "주문/출고": tf.f02479,
        "고객/정산": tf.f02480,
      };
      return map[value] ?? value;
    },
    [tf]
  );

  const categories = Array.from(new Set(faqs.map(f => f.category)));

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_faq')
      .select('*')
      .order('category_order')
      .order('question_order');

    if (error) {
      toast.error(tf.f02262);
      console.error(error);
    } else {
      setFaqs(data as Faq[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setCategory(tf.f02142);
    setCategoryIcon("🖨️");
    setCategoryOrder(1);
    setQuestion("");
    setAnswer("");
    setQuestionOrder(1);
    setIsFeatured(false);
    setIsActive(true);
  };

  const openAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (faq: Faq) => {
    setEditingId(faq.id);
    setCategory(faq.category);
    setCategoryIcon(faq.category_icon);
    setCategoryOrder(faq.category_order);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setQuestionOrder(faq.question_order);
    setIsFeatured(faq.is_featured);
    setIsActive(faq.is_active);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!question.trim() || !answer.trim() || !category.trim()) {
      toast.error(tf.f02155);
      return;
    }

    const payload = {
      category,
      category_icon: categoryIcon,
      category_order: categoryOrder,
      question,
      answer,
      question_order: questionOrder,
      is_featured: isFeatured,
      is_active: isActive,
      updated_at: new Date().toISOString()
    };

    if (editingId) {
      const { error } = await supabase.from('support_faq').update(payload).eq('id', editingId);
      if (error) {
        toast.error(tf.f01453);
      } else {
        toast.success(tf.f02265);
        setModalOpen(false);
        fetchFaqs();
      }
    } else {
      const { error } = await supabase.from('support_faq').insert([payload]);
      if (error) {
        toast.error(tf.f02027);
      } else {
        toast.success(tf.f01384);
        setModalOpen(false);
        fetchFaqs();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(tf.f01678)) {
      const { error } = await supabase.from('support_faq').delete().eq('id', id);
      if (error) {
        toast.error(tf.f00307);
      } else {
        toast.success(tf.f01332);
        fetchFaqs();
      }
    }
  };

  const handleCategoryChange = (val: string | null) => {
    if (!val) return;
    setCategory(val);
    const existingCat = faqs.find(f => f.category === val);
    if (existingCat) {
      setCategoryIcon(existingCat.category_icon);
      setCategoryOrder(existingCat.category_order);
    }
  };

  const filteredFaqs = faqs.filter(f => f.question.toLowerCase().includes(search.toLowerCase()) || f.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bot className="h-7 w-7 text-indigo-600" />
            {tf.f02263}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">{tf.f02028}</p>
        </div>
        <Button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          {tf.f01383}
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder={tf.f01969} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50 border-transparent focus-visible:bg-white rounded-xl"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50/80 uppercase">
              <tr>
                <th className="px-6 py-4 font-semibold">{tf.f02060}</th>
                <th className="px-6 py-4 font-semibold w-1/3">{tf.f01968}</th>
                <th className="px-6 py-4 font-semibold w-1/3">{tf.f01068}</th>
                <th className="px-6 py-4 font-semibold text-center">{tf.f00319}</th>
                <th className="px-6 py-4 font-semibold text-right">{tf.f00087}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">{tf.f00158}</td></tr>
              ) : filteredFaqs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">{tf.f01123}</td></tr>
              ) : (
                filteredFaqs.map((faq) => (
                  <tr key={faq.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{faq.category_icon}</span>
                        <span className="font-semibold text-slate-700">{formatCategoryLabel(faq.category)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{faq.question}</div>
                      {faq.is_featured && <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-bold">{tf.f01751}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600 line-clamp-2">{faq.answer}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${faq.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {faq.is_active ? tf.f01324 : tf.f01463}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(faq)} className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(faq.id)} className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-500" />
              {editingId ? tf.f02264 : tf.f01383}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{tf.f02060}</label>
                <Input value={category} onChange={e => handleCategoryChange(e.target.value)} placeholder={tf.f01591} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{tf.f01013}</label>
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger><SelectValue placeholder={tf.f02062} /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{formatCategoryLabel(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{tf.f02065}</label>
                <Input value={categoryIcon} onChange={e => setCategoryIcon(e.target.value)} placeholder={tf.f02481} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{tf.f02030}</label>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-slate-500 font-medium">{tf.f02064}</span>
                    <Input type="number" value={categoryOrder} onChange={e => setCategoryOrder(Number(e.target.value))} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-slate-500 font-medium">{tf.f01970}</span>
                    <Input type="number" value={questionOrder} onChange={e => setQuestionOrder(Number(e.target.value))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{tf.f01968}</label>
              <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder={tf.f01592} className="font-medium" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">{tf.f01068}</label>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{tf.f00798}</span>
              </div>
              <Textarea 
                value={answer} 
                onChange={e => setAnswer(e.target.value)} 
                placeholder={tf.f02249} 
                className="h-40 resize-none font-mono text-sm leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600" />
                <span className="text-sm font-medium text-slate-700">{tf.f02226}</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500" />
                <span className="text-sm font-medium text-slate-700">{tf.f01883}</span>
              </label>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>{tf.f00702}</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]">
              {tf.f01771}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
