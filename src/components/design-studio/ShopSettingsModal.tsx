'use client';

import React from 'react';
import { X, Store, ImageIcon, User, Phone, MapPin } from 'lucide-react';
import { useEditorStore } from '@/stores/design-store';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { getMessages } from '@/i18n/getMessages';

interface ShopSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShopSettingsModal: React.FC<ShopSettingsModalProps> = ({ isOpen, onClose }) => {
  const locale = usePreferredLocale();
  const D = getMessages(locale).dashboard.designStudio;
  const { shopSettings, updateShopSettings } = useEditorStore();

  if (!isOpen) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real app, this would upload to Supabase storage
    // For now, we'll use a local object URL or simulated upload
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        updateShopSettings({ logoUrl: event.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 text-white">
              <Store size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-800 tracking-tight">{D.shopSettingsTitle}</h3>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">{D.shopSettingsBrandBadge}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-all shadow-sm border border-gray-100">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-10 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {/* Logo Section */}
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{D.shopSettingsLogoSection}</label>
            <div className="flex items-center gap-8 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
              <div className="w-24 h-24 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group hover:border-indigo-400 transition-colors">
                {shopSettings.logoUrl ? (
                   <img src={shopSettings.logoUrl} className="w-full h-full object-contain p-2" alt={D.altShopLogoPreview} />
                ) : (
                   <ImageIcon size={32} className="text-slate-200 group-hover:scale-110 transition-transform" />
                )}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-black text-slate-700">{D.shopSettingsLogoUpload}</p>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">{D.shopSettingsLogoHint}</p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{D.shopSettingsGeneralInfo}</label>
             <div className="space-y-3">
                <div className="relative group">
                  <User size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type="text" placeholder={D.shopSettingsNamePlaceholder} 
                    value={shopSettings.name} 
                    onChange={(e) => updateShopSettings({ name: e.target.value })}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold outline-none ring-4 ring-transparent focus:bg-white focus:ring-indigo-50 transition-all" 
                  />
                </div>
                <div className="relative group">
                  <Phone size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type="text" placeholder={D.shopSettingsTelPlaceholder} 
                    value={shopSettings.tel} 
                    onChange={(e) => updateShopSettings({ tel: e.target.value })}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold outline-none ring-4 ring-transparent focus:bg-white focus:ring-indigo-50 transition-all" 
                  />
                </div>
                <div className="relative group">
                  <MapPin size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type="text" placeholder={D.shopSettingsAddressPlaceholder} 
                    value={shopSettings.address} 
                    onChange={(e) => updateShopSettings({ address: e.target.value })}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold outline-none ring-4 ring-transparent focus:bg-white focus:ring-indigo-50 transition-all" 
                  />
                </div>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50 flex gap-4">
          <button onClick={onClose} className="flex-1 py-5 bg-white border border-slate-200 text-slate-600 rounded-[2rem] font-black text-sm shadow-sm hover:bg-gray-50 transition-all">{D.cancel}</button>
          <button 
            onClick={onClose} 
            className="flex-1 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
          >
            {D.shopSettingsSave}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};
