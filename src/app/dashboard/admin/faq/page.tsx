"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Search, ArrowUpDown, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";

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
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState("프린터/리본 출력");
  const [categoryIcon, setCategoryIcon] = useState("🖨️");
  const [categoryOrder, setCategoryOrder] = useState(1);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [questionOrder, setQuestionOrder] = useState(1);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

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
      toast.error('FAQ 로드 중 오류가 발생했습니다.');
      console.error(error);
    } else {
      setFaqs(data as Faq[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setCategory("프린터/리본 출력");
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
      toast.error('필수 항목을 모두 입력해주세요.');
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
        toast.error('수정 중 오류가 발생했습니다.');
      } else {
        toast.success('FAQ가 수정되었습니다.');
        setModalOpen(false);
        fetchFaqs();
      }
    } else {
      const { error } = await supabase.from('support_faq').insert([payload]);
      if (error) {
        toast.error('추가 중 오류가 발생했습니다.');
      } else {
        toast.success('새 FAQ가 추가되었습니다.');
        setModalOpen(false);
        fetchFaqs();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('이 FAQ를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.')) {
      const { error } = await supabase.from('support_faq').delete().eq('id', id);
      if (error) {
        toast.error('삭제 중 오류가 발생했습니다.');
      } else {
        toast.success('삭제되었습니다.');
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
            FAQ 및 AI 지식 관리
          </h1>
          <p className="text-slate-500 mt-1 text-sm">추가/수정된 FAQ는 사용자의 빠른 답변 봇과 AI 지식베이스에 즉시 반영됩니다.</p>
        </div>
        <Button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          새 FAQ 추가
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="질문 또는 카테고리 검색..." 
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
                <th className="px-6 py-4 font-semibold">카테고리</th>
                <th className="px-6 py-4 font-semibold w-1/3">질문 (Question)</th>
                <th className="px-6 py-4 font-semibold w-1/3">답변 (Answer)</th>
                <th className="px-6 py-4 font-semibold text-center">상태</th>
                <th className="px-6 py-4 font-semibold text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">데이터를 불러오는 중입니다...</td></tr>
              ) : filteredFaqs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">등록된 FAQ가 없습니다.</td></tr>
              ) : (
                filteredFaqs.map((faq) => (
                  <tr key={faq.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{faq.category_icon}</span>
                        <span className="font-semibold text-slate-700">{faq.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{faq.question}</div>
                      {faq.is_featured && <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-bold">자주묻는질문</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600 line-clamp-2">{faq.answer}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${faq.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {faq.is_active ? '사용중' : '숨김'}
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
              {editingId ? 'FAQ 수정' : '새 FAQ 추가'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">카테고리</label>
                <Input value={category} onChange={e => handleCategoryChange(e.target.value)} placeholder="예: 프린터 연동" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">기존 카테고리 선택</label>
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger><SelectValue placeholder="카테고리 선택" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">카테고리 아이콘 (이모지)</label>
                <Input value={categoryIcon} onChange={e => setCategoryIcon(e.target.value)} placeholder="예: 🖨️" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">출력 순서 (낮을수록 위)</label>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-slate-500 font-medium">카테고리 순서</span>
                    <Input type="number" value={categoryOrder} onChange={e => setCategoryOrder(Number(e.target.value))} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-slate-500 font-medium">질문 순서</span>
                    <Input type="number" value={questionOrder} onChange={e => setQuestionOrder(Number(e.target.value))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">질문 (Question)</label>
              <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="예: 프린터가 연결되지 않아요" className="font-medium" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">답변 (Answer)</label>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">* 마크다운 문법 지원</span>
              </div>
              <Textarea 
                value={answer} 
                onChange={e => setAnswer(e.target.value)} 
                placeholder="AI와 사용자에게 띄워질 답변을 상세하게 적어주세요. 1, 2, 3 번호 매기기를 활용하면 좋습니다." 
                className="h-40 resize-none font-mono text-sm leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600" />
                <span className="text-sm font-medium text-slate-700">활성화 (목록에 표시)</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500" />
                <span className="text-sm font-medium text-slate-700">주요 질문 (Featured) 강조</span>
              </label>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>취소</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]">
              저장하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
