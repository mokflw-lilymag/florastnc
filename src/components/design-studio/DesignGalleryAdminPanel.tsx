'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Trash2, Save, ImageIcon, Upload, FileImage } from 'lucide-react';
import { toast } from 'sonner';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { getMessages } from '@/i18n/getMessages';
import { compressGalleryImage } from '@/lib/image-compress';
import { generateSlugFromLabel, isValidSlug } from '@/lib/slug-utils';

export type AdminGalleryTheme = {
  id: string;
  slug: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  design_gallery_assets?: { id: string; image_url: string; thumb_url: string | null; sort_order: number }[];
};

type UploadStage = 'compressing' | 'uploading' | 'saving';
type UploadStatus = {
  active: boolean;
  total: number;
  done: number;
  stage: UploadStage;
  currentName: string;
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
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newThemeSlug, setNewThemeSlug] = useState('');
  const [newThemeLabel, setNewThemeLabel] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [newAssetUrl, setNewAssetUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [upload, setUpload] = useState<UploadStatus>({
    active: false,
    total: 0,
    done: 0,
    stage: 'compressing',
    currentName: '',
  });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setSchemaMissing(Boolean(json.schemaMissing));
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
      setSlugManuallyEdited(false);
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

  const uploadOne = useCallback(
    async (file: File, themeId: string, baseSortOrder: number, indexOffset: number) => {
      // 1) 클라이언트 압축 (원본 2400 / 썸네일 600)
      setUpload((u) => ({ ...u, stage: 'compressing', currentName: file.name }));
      const compressed = await compressGalleryImage(file);

      // 2) Supabase Storage 업로드 (FormData)
      setUpload((u) => ({ ...u, stage: 'uploading' }));
      const fd = new FormData();
      fd.append('uiLocale', locale);
      fd.append(
        'file',
        new File([compressed.original], `image.${compressed.originalExt}`, {
          type: compressed.originalMime,
        }),
      );
      fd.append(
        'thumb',
        new File([compressed.thumb], `thumb.${compressed.thumbExt}`, {
          type: compressed.thumbMime,
        }),
      );

      const upRes = await fetch('/api/admin/design-gallery/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const upJson = await upRes.json();
      if (!upRes.ok) throw new Error(upJson.error || D.galleryAdminAddErr);

      // 3) DB 등록
      setUpload((u) => ({ ...u, stage: 'saving' }));
      const dbRes = await fetch('/api/admin/design-gallery/assets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme_id: themeId,
          image_url: upJson.image_url,
          thumb_url: upJson.thumb_url,
          sort_order: baseSortOrder + indexOffset,
          uiLocale: locale,
        }),
      });
      const dbJson = await dbRes.json();
      if (!dbRes.ok) throw new Error(dbJson.error || D.galleryAdminAddErr);
    },
    [locale, D.galleryAdminAddErr],
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!selected) return;
      const fileArray = Array.from(files);
      const images = fileArray.filter((f) => f.type.startsWith('image/'));
      const skipped = fileArray.length - images.length;
      if (!images.length) {
        if (skipped > 0) toast.error(D.galleryAdminUploadNotImage);
        return;
      }

      const baseSortOrder =
        (selected.design_gallery_assets ?? []).reduce(
          (max, a) => (a.sort_order > max ? a.sort_order : max),
          -1,
        ) + 1;

      setUpload({
        active: true,
        total: images.length,
        done: 0,
        stage: 'compressing',
        currentName: images[0]?.name ?? '',
      });

      let successCount = 0;
      for (let i = 0; i < images.length; i += 1) {
        const file = images[i];
        try {
          await uploadOne(file, selected.id, baseSortOrder, i);
          successCount += 1;
          setUpload((u) => ({ ...u, done: u.done + 1, currentName: images[i + 1]?.name ?? '' }));
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          toast.error(D.galleryAdminUploadError.replace('{name}', file.name).replace('{message}', msg));
        }
      }

      setUpload({ active: false, total: 0, done: 0, stage: 'compressing', currentName: '' });
      if (successCount > 0) {
        toast.success(D.galleryAdminUploadSuccess.replace('{count}', String(successCount)));
        await load();
        onCatalogChanged?.();
      }
    },
    [
      selected,
      D.galleryAdminUploadError,
      D.galleryAdminUploadSuccess,
      D.galleryAdminUploadNotImage,
      load,
      onCatalogChanged,
      uploadOne,
    ],
  );

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

      {schemaMissing && (
        <div className="mx-6 mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
          <p className="font-black text-sm mb-1">⚠️ Supabase 스키마가 적용되지 않았습니다</p>
          <p className="leading-relaxed mb-2">
            <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">design_gallery_themes</code> /
            <code className="ml-1 rounded bg-white px-1 py-0.5 font-mono text-[11px]">design_gallery_assets</code>{" "}
            테이블이 없습니다. Supabase SQL Editor에서 아래 파일을 실행해 주세요:
          </p>
          <code className="block rounded bg-white px-2 py-1.5 font-mono text-[11px]">
            supabase/design_studio_gallery_templates.sql
          </code>
        </div>
      )}

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

          {(() => {
            const slugValue = newThemeSlug.trim();
            const labelValue = newThemeLabel.trim();
            const slugInvalid = slugValue.length > 0 && !isValidSlug(slugValue);
            const canSubmit = !saving && labelValue.length > 0 && slugValue.length > 0 && !slugInvalid;
            const disabledReason = !labelValue
              ? D.galleryAdminWhyDisabledLabel
              : !slugValue
                ? D.galleryAdminWhyDisabledSlug
                : slugInvalid
                  ? D.galleryAdminWhyDisabledFix
                  : '';
            return (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 px-1">{D.galleryAdminNewTheme}</p>

                <div>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    placeholder={D.galleryAdminNamePlaceholder}
                    value={newThemeLabel}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNewThemeLabel(v);
                      if (!slugManuallyEdited) {
                        setNewThemeSlug(generateSlugFromLabel(v));
                      }
                    }}
                  />
                  <p className="text-[9px] font-bold text-slate-400 mt-1 px-1">
                    {D.galleryAdminLabelHint}
                  </p>
                </div>

                <div>
                  <input
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-mono ${
                      slugInvalid
                        ? 'border-rose-400 bg-rose-50 focus:outline-rose-500'
                        : 'border-slate-200'
                    }`}
                    placeholder={D.galleryAdminSlugPlaceholder}
                    value={newThemeSlug}
                    onChange={(e) => {
                      setNewThemeSlug(e.target.value);
                      setSlugManuallyEdited(true);
                    }}
                  />
                  <p
                    className={`text-[9px] font-bold mt-1 px-1 ${
                      slugInvalid ? 'text-rose-600' : 'text-slate-400'
                    }`}
                  >
                    {slugInvalid
                      ? D.galleryAdminSlugInvalidShort
                      : slugManuallyEdited
                        ? D.galleryAdminSlugInvalidShort
                        : D.galleryAdminSlugAutoHint}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={addTheme}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-black text-white hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={16} /> {D.galleryAdminAddTheme}
                </button>
                {!canSubmit && disabledReason && (
                  <p className="text-[10px] font-bold text-amber-600 text-center px-1">
                    ↑ {disabledReason}
                  </p>
                )}
              </div>
            );
          })()}
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
                  <Upload size={18} className="text-emerald-600" />
                  {D.galleryAdminUploadTitle}
                </h6>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !upload.active && fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !upload.active) {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!upload.active) setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (upload.active) return;
                    if (e.dataTransfer?.files?.length) {
                      void uploadFiles(e.dataTransfer.files);
                    }
                  }}
                  className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors mb-4 cursor-pointer ${
                    upload.active
                      ? 'border-emerald-400 bg-emerald-50/60 cursor-wait'
                      : dragOver
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/40'
                  }`}
                >
                  {upload.active ? (
                    <>
                      <Loader2 className="animate-spin text-emerald-600" size={28} />
                      <p className="text-xs font-black text-emerald-700">
                        {upload.stage === 'compressing'
                          ? D.galleryAdminUploadCompressing
                          : upload.stage === 'uploading'
                            ? D.galleryAdminUploadUploading
                            : D.galleryAdminUploadSaving}
                      </p>
                      <p className="text-[11px] font-bold text-slate-500">
                        {D.galleryAdminUploadProgress
                          .replace('{done}', String(upload.done))
                          .replace('{total}', String(upload.total))}
                        {upload.currentName ? ` · ${upload.currentName}` : ''}
                      </p>
                      <div className="w-full max-w-xs h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{
                            width: `${upload.total ? Math.round((upload.done / upload.total) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <FileImage className="text-emerald-600" size={32} />
                      <p className="text-sm font-black text-slate-700">
                        {dragOver ? D.galleryAdminUploadDrop : D.galleryAdminUploadButton}
                      </p>
                      <p className="text-[11px] font-bold text-slate-500 max-w-md leading-relaxed">
                        {D.galleryAdminUploadHint}
                      </p>
                    </>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      void uploadFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />

                <details className="mb-4 rounded-xl border border-slate-200 bg-white">
                  <summary className="cursor-pointer px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50">
                    <ImageIcon size={14} className="inline mr-2 -mt-0.5 text-slate-400" />
                    {D.galleryAdminOrUrl}
                  </summary>
                  <div className="flex gap-2 p-3 border-t border-slate-100">
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
                </details>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(selected.design_gallery_assets ?? []).map((a) => (
                    <div
                      key={a.id}
                      className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm"
                    >
                      <div className="aspect-[3/4] bg-slate-100">
                        <img
                          src={a.thumb_url ?? a.image_url}
                          alt={D.galleryAdminAssetAlt}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
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
