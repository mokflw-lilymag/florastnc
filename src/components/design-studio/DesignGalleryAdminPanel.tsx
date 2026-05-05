'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Trash2, Save, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { getMessages } from '@/i18n/getMessages';

export type AdminGalleryTheme = {
  id: string;
  slug: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  design_gallery_assets?: { id: string; image_url: string; sort_order: number }[];
};

interface DesignGalleryAdminPanelProps {
  onBack?: () => void;
  onCatalogChanged?: () => void;
}

export function DesignGalleryAdminPanel({ onBack, onCatalogChanged }: DesignGalleryAdminPanelProps) {
  const locale = usePreferredLocale();
  const D = getMessages(locale).dashboard.designStudio;
  const [themes, setThemes] = useState<AdminGalleryTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newThemeSlug, setNewThemeSlug] = useState('');
  const [newThemeLabel, setNewThemeLabel] = useState('');
  const [newAssetUrl, setNewAssetUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/design-gallery?uiLocale=${encodeURIComponent(locale)}`,
        { credentials: 'include' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || D.galleryAdminLoadFail);
      const list = (json.themes ?? []) as AdminGalleryTheme[];
      setThemes(list);
      setSelectedId((prev) => {
        if (prev && list.some((t) => t.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : D.galleryAdminListFail);
    } finally {
      setLoading(false);
    }
  }, [locale, D.galleryAdminLoadFail, D.galleryAdminListFail]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = themes.find((t) => t.id === selectedId) ?? null;

  const patchThemeField = async (id: string, patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/design-gallery/themes/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patch, uiLocale: locale }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || D.galleryAdminSaveFail);
      toast.success(D.galleryAdminThemeSaved);
      await load();
      onCatalogChanged?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : D.galleryAdminSaveErr);
    } finally {
      setSaving(false);
    }
  };

  const addTheme = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/design-gallery/themes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: newThemeSlug.trim().toLowerCase(),
          label: newThemeLabel.trim(),
          sort_order: themes.length ? Math.max(...themes.map((t) => t.sort_order)) + 10 : 10,
          uiLocale: locale,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || D.galleryAdminAddFail);
      toast.success(D.galleryAdminThemeAdded);
      setNewThemeSlug('');
      setNewThemeLabel('');
      await load();
      onCatalogChanged?.();
      if (json.theme?.id) setSelectedId(json.theme.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : D.galleryAdminAddErr);
    } finally {
      setSaving(false);
    }
  };

  const deleteTheme = async (id: string) => {
    if (!confirm(D.galleryAdminDeleteThemeConfirm)) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/design-gallery/themes/${id}?uiLocale=${encodeURIComponent(locale)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || D.galleryAdminDeleteFail);
      toast.success(D.galleryAdminThemeDeleted);
      setSelectedId(null);
      await load();
      onCatalogChanged?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : D.galleryAdminDeleteErr);
    } finally {
      setSaving(false);
    }
  };

  const addAsset = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/design-gallery/assets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme_id: selected.id,
          image_url: newAssetUrl.trim(),
          uiLocale: locale,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || D.galleryAdminAddFail);
      toast.success(D.galleryAdminDesignAdded);
      setNewAssetUrl('');
      await load();
      onCatalogChanged?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : D.galleryAdminAddErr);
    } finally {
      setSaving(false);
    }
  };

  const deleteAsset = async (assetId: string) => {
    if (!confirm(D.galleryAdminDeleteDesignConfirm)) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/design-gallery/assets/${assetId}?uiLocale=${encodeURIComponent(locale)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || D.galleryAdminDeleteFail);
      toast.success(D.galleryAdminDeleted);
      await load();
      onCatalogChanged?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : D.galleryAdminDeleteErr);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-slate-50">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-4 shrink-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft size={18} /> {D.galleryAdminBack}
          </button>
        )}
        <h4 className="text-sm font-black text-slate-800">{D.galleryAdminTitle}</h4>
        {saving && <Loader2 className="ml-auto animate-spin text-emerald-600" size={20} />}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-72 shrink-0 border-r border-slate-200 bg-white overflow-y-auto p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{D.galleryAdminThemes}</p>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-emerald-600" />
            </div>
          ) : (
            <ul className="space-y-1">
              {themes.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-colors ${
                      selectedId === t.id
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block truncate">{t.label}</span>
                    <span className={`block truncate text-[10px] font-mono opacity-70 ${selectedId === t.id ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {t.slug}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <p className="text-[10px] font-black uppercase text-slate-400 px-1">{D.galleryAdminNewTheme}</p>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              placeholder={D.galleryAdminSlugPlaceholder}
              value={newThemeSlug}
              onChange={(e) => setNewThemeSlug(e.target.value)}
            />
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              placeholder={D.galleryAdminNamePlaceholder}
              value={newThemeLabel}
              onChange={(e) => setNewThemeLabel(e.target.value)}
            />
            <button
              type="button"
              disabled={saving || !newThemeSlug.trim() || !newThemeLabel.trim()}
              onClick={addTheme}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-black text-white hover:bg-black disabled:opacity-40"
            >
              <Plus size={16} /> {D.galleryAdminAddTheme}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!selected ? (
            <p className="text-sm text-slate-400 font-bold">{D.galleryAdminSelectHint}</p>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h5 className="text-lg font-black text-slate-800">{selected.label}</h5>
                    <p className="text-xs font-mono text-slate-400 mt-1">{selected.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteTheme(selected.id)}
                    disabled={saving}
                    className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 size={14} /> {D.galleryAdminDeleteTheme}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[10px] font-black uppercase text-slate-400">
                    {D.galleryAdminDisplayName}
                    <input
                      key={selected.id + '-label'}
                      defaultValue={selected.label}
                      id={`theme-label-${selected.id}`}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                    />
                  </label>
                  <label className="block text-[10px] font-black uppercase text-slate-400">
                    {D.galleryAdminSlug}
                    <input
                      key={selected.id + '-slug'}
                      defaultValue={selected.slug}
                      id={`theme-slug-${selected.id}`}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
                    />
                  </label>
                  <label className="block text-[10px] font-black uppercase text-slate-400">
                    {D.galleryAdminSortOrder}
                    <input
                      key={selected.id + '-sort'}
                      type="number"
                      defaultValue={selected.sort_order}
                      id={`theme-sort-${selected.id}`}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-2 pt-6 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      defaultChecked={selected.is_active}
                      id={`theme-active-${selected.id}`}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {D.galleryAdminVisiblePartners}
                  </label>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    const labelEl = document.getElementById(`theme-label-${selected.id}`) as HTMLInputElement | null;
                    const slugEl = document.getElementById(`theme-slug-${selected.id}`) as HTMLInputElement | null;
                    const sortEl = document.getElementById(`theme-sort-${selected.id}`) as HTMLInputElement | null;
                    const activeEl = document.getElementById(`theme-active-${selected.id}`) as HTMLInputElement | null;
                    patchThemeField(selected.id, {
                      label: labelEl?.value ?? selected.label,
                      slug: slugEl?.value ?? selected.slug,
                      sort_order: Number(sortEl?.value ?? selected.sort_order),
                      is_active: activeEl?.checked ?? selected.is_active,
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-700"
                >
                  <Save size={16} /> {D.galleryAdminSaveTheme}
                </button>
              </div>

              <div>
                <h6 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                  <ImageIcon size={18} className="text-emerald-600" />
                  {D.galleryAdminDesignImageUrl}
                </h6>
                <div className="flex gap-2 mb-4">
                  <input
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    placeholder={D.galleryAdminImagePlaceholder}
                    value={newAssetUrl}
                    onChange={(e) => setNewAssetUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={saving || !newAssetUrl.trim()}
                    onClick={addAsset}
                    className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-black disabled:opacity-40"
                  >
                    {D.galleryAdminAdd}
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(selected.design_gallery_assets ?? []).map((a) => (
                    <div
                      key={a.id}
                      className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm"
                    >
                      <div className="aspect-[3/4] bg-slate-100">
                        <img src={a.image_url} alt={D.galleryAdminAssetAlt} className="h-full w-full object-cover" loading="lazy" />
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteAsset(a.id)}
                        disabled={saving}
                        className="absolute top-2 right-2 rounded-lg bg-rose-600 p-2 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 hover:bg-rose-700"
                        aria-label={D.galleryAdminDeleteAria}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
