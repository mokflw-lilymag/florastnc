import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Settings, Plus, Trash2, X } from 'lucide-react';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { getMessages } from '@/i18n/getMessages';
import { toast } from 'sonner';

interface PhraseManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function PhraseManagerDialog({ isOpen, onClose, onChanged }: PhraseManagerProps) {
  const locale = usePreferredLocale();
  const R = getMessages(locale).dashboard.ribbon;
  const [phrases, setPhrases] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [newCat, setNewCat] = useState('');
  const [newText, setNewText] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    if (isOpen) fetchPhrases();
  }, [isOpen]);

  const fetchPhrases = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('custom_phrases').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setPhrases(data);
      const uniqueCats = Array.from(new Set(data.map(p => p.category)));
      setCategories(uniqueCats);
      if (uniqueCats.length > 0 && !newCat) setNewCat(uniqueCats[0]);
    }
    setIsLoading(false);
  };

  const handeAdd = async () => {
    if (!newCat.trim() || !newText.trim()) {
      toast.error(R.phraseAlertBoth);
      return;
    }
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(R.phraseLoginRequired);
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.from('custom_phrases').insert([{
      user_id: user.id,
      category: newCat.trim(),
      text: newText.trim(),
      description: newDesc.trim() || ''
    }]);
    if (error) toast.error(error.message);
    else {
      setNewText('');
      setNewDesc('');
      fetchPhrases();
      onChanged();
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(R.phraseDeleteConfirm)) return;
    setIsLoading(true);
    const { error } = await supabase.from('custom_phrases').delete().eq('id', id);
    if (!error) {
      fetchPhrases();
      onChanged();
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col font-sans h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Settings size={18} className="text-blue-400" /> {R.phraseMgrTitle}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Add New Phrase Form */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300">{R.phraseMgrNewSection}</h3>
            <div className="flex flex-col gap-3">
              <input type="text" placeholder={R.phraseMgrPhCat} value={newCat} onChange={e => setNewCat(e.target.value)} translate="no" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white notranslate" />
              <div className="flex gap-2">
                <input type="text" placeholder={R.phraseMgrPhText} value={newText} onChange={e => setNewText(e.target.value)} translate="no" className="w-1/2 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white notranslate" />
                <input type="text" placeholder={R.phraseMgrPhDesc} value={newDesc} onChange={e => setNewDesc(e.target.value)} translate="no" className="w-1/2 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white notranslate" />
              </div>
              <button disabled={isLoading} onClick={handeAdd} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <Plus size={16} /> {R.phraseMgrBtnSave}
              </button>
            </div>
          </div>

          {/* List Phrases Grouped by Category */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-300 border-b border-slate-700 pb-2">{R.phraseMgrListHeader}</h3>
            {categories.map(cat => (
              <div key={cat} className="space-y-2">
                <h4 className="text-blue-400 text-sm font-semibold bg-slate-800/80 px-3 py-1.5 rounded">{cat}</h4>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {phrases.filter(p => p.category === cat).map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg hover:border-slate-500 group">
                      <div className="flex flex-col notranslate" translate="no">
                        <span className="text-sm font-semibold text-white leading-tight">{p.text}</span>
                        <span className="text-[10px] text-slate-400">{p.description}</span>
                      </div>
                      <button onClick={() => handleDelete(p.id)} className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {categories.length === 0 && !isLoading && (
              <div className="text-center py-10 text-slate-500 text-sm">{R.phraseMgrEmpty}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
