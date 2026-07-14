import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
import { templateRegistry } from './registry';
import { TEMPLATE_CATEGORIES } from './categories';
import type { LibraryTemplateEntry, FavoriteEntry, InstallHistoryEntry } from './types';
import type { PrintTemplate } from '../types';
import type { UniversalDocumentData } from '../types/data';
import {
  MODAL_MAX_WIDTH, CARD_MIN_WIDTH, CARD_PREVIEW_HEIGHT,
  CARD_PREVIEW_SCALE, MODAL_BORDER_RADIUS, CARD_BORDER_RADIUS,
  GRID_GAP,
} from './constants';
import { getMockDocumentData } from './mockData';

// ════════════════════════════════════════════════════════════════════════════
//  Lazy-loaded UniversalPreview (code-split)
// ════════════════════════════════════════════════════════════════════════════

const UniversalPreview = lazy(() => import('../components/preview/UniversalPreview'));

function PreviewFallback() {
  return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, color: '#bbb', background: '#f9fafb',
    }}>
      <i className="ti ti-loader-2 spin" style={{ fontSize: 20 }} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Props
// ════════════════════════════════════════════════════════════════════════════

interface Props {
  open: boolean;
  onClose: () => void;
  onInstall: (templateId: string, tpl: PrintTemplate) => Promise<void>;
  activeDoc: string;
}

// ════════════════════════════════════════════════════════════════════════════
//  Local storage helpers — favorites, install history, recently used
// ════════════════════════════════════════════════════════════════════════════

const FAV_KEY = 'template_library_favorites';
const RECENT_KEY = 'template_library_recent';
const HISTORY_KEY = 'template_library_history';
const MAX_RECENT = 5;

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return new Set();
    const parsed: FavoriteEntry[] = JSON.parse(raw);
    return new Set(parsed.map(e => e.templateId));
  } catch { return new Set(); }
}

function saveFavorites(ids: Set<string>): void {
  const entries: FavoriteEntry[] = Array.from(ids).map(templateId => ({
    templateId, addedAt: new Date().toISOString(),
  }));
  localStorage.setItem(FAV_KEY, JSON.stringify(entries));
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addRecent(templateId: string): void {
  const list = loadRecent().filter(id => id !== templateId);
  list.unshift(templateId);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

function addHistory(entry: InstallHistoryEntry): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const list: InstallHistoryEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 20)));
  } catch { /* ignore */ }
}

// ════════════════════════════════════════════════════════════════════════════
//  Component
// ════════════════════════════════════════════════════════════════════════════

const STYLES = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    padding: 20, direction: 'rtl' as const,
  },
  modal: {
    background: '#fff', borderRadius: MODAL_BORDER_RADIUS,
    width: '100%', maxWidth: MODAL_MAX_WIDTH, maxHeight: '90vh',
    display: 'flex' as const, flexDirection: 'column' as const,
    boxShadow: '0 25px 60px rgba(0,0,0,.25)',
    overflow: 'hidden',
  },
  header: {
    padding: '14px 20px', borderBottom: '1px solid #e5e7eb',
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 17, fontWeight: 800, color: '#111',
    display: 'flex' as const, alignItems: 'center' as const, gap: 8,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8, border: 'none',
    background: '#f3f4f6', cursor: 'pointer', fontSize: 16,
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    color: '#666',
  },
  body: {
    padding: 0, overflow: 'hidden', flex: 1,
    display: 'flex' as const, flexDirection: 'column' as const,
  },
  toolbar: {
    padding: '12px 20px', borderBottom: '1px solid #e5e7eb',
    display: 'flex' as const, flexWrap: 'wrap' as const, gap: 8,
    alignItems: 'center' as const, background: '#fafafa',
  },
  searchInput: {
    flex: 1, minWidth: 180, padding: '7px 12px', borderRadius: 8,
    border: '1px solid #d1d5db', fontSize: 13, outline: 'none',
    fontFamily: 'Tajawal, sans-serif',
  },
  filterSelect: {
    padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db',
    fontSize: 12, fontFamily: 'Tajawal, sans-serif', background: '#fff',
  },
  grid: {
    display: 'grid' as const, gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN_WIDTH}px, 1fr))`,
    gap: GRID_GAP, padding: 20, overflowY: 'auto' as const, flex: 1,
  },
  card: {
    borderRadius: CARD_BORDER_RADIUS, border: '1px solid #e5e7eb',
    overflow: 'hidden', display: 'flex' as const, flexDirection: 'column' as const,
    transition: 'box-shadow .2s', background: '#fff',
  },
  cardPreviewWrapper: {
    height: CARD_PREVIEW_HEIGHT, overflow: 'hidden', position: 'relative' as const,
    background: '#f9fafb', cursor: 'pointer',
  },
  cardPreviewContent: {
    transform: `scale(${CARD_PREVIEW_SCALE})`,
    transformOrigin: 'top right',
    width: `${100 / CARD_PREVIEW_SCALE}%`,
  },
  cardBody: {
    padding: '12px 14px', flex: 1, display: 'flex' as const,
    flexDirection: 'column' as const, gap: 6,
  },
  cardName: {
    fontSize: 14, fontWeight: 700, color: '#111',
    display: 'flex' as const, alignItems: 'center' as const, gap: 6,
  },
  cardDesc: {
    fontSize: 11, color: '#666', lineHeight: 1.5, flex: 1,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  },
  tagRow: {
    display: 'flex' as const, gap: 4, flexWrap: 'wrap' as const,
  },
  tagDoc: {
    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
    background: '#eef2ff', color: '#4338ca',
    display: 'flex' as const, alignItems: 'center' as const, gap: 3,
  },
  tagSize: {
    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
    background: '#f0fdf4', color: '#15803d',
    display: 'flex' as const, alignItems: 'center' as const, gap: 3,
  },
  tagCategory: {
    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
    background: '#fef3c7', color: '#92400e',
    display: 'flex' as const, alignItems: 'center' as const, gap: 3,
  },
  installBtn: {
    padding: '8px 16px', border: 'none', borderRadius: 6,
    background: '#1a1a2e', color: '#fff', cursor: 'pointer',
    fontSize: 12, fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 6, marginTop: 8, transition: 'opacity .2s',
  },
  favBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 14, padding: 0, lineHeight: 1,
  },
  emptyState: {
    textAlign: 'center' as const, padding: 60, color: '#999', fontSize: 13,
    display: 'flex' as const, flexDirection: 'column' as const, alignItems: 'center' as const, gap: 8,
  },
  recentRow: {
    padding: '10px 20px', borderBottom: '1px solid #e5e7eb',
    display: 'flex' as const, gap: 12, alignItems: 'center' as const,
    background: '#f7f7ff', fontSize: 12, color: '#555',
  },
  zoomControls: {
    display: 'flex' as const, gap: 4,
  },
  zoomBtn: {
    width: 28, height: 28, borderRadius: 6, border: '1px solid #d1d5db',
    background: '#fff', cursor: 'pointer', fontSize: 12,
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    color: '#555',
  },
};

export default function TemplateLibraryModal({ open, onClose, onInstall, _activeDoc }: Props) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterDocType, setFilterDocType] = useState<string | null>(null);
  const [filterPaperSize, setFilterPaperSize] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [recentIds, setRecentIds] = useState<string[]>(loadRecent);
  const [_previewZoom, _setPreviewZoom] = useState<'fit' | '100' | 'page'>('fit');

  // ── Cached mock data (never recreate) ──────────────────────────────────────
  const mockDataRef = useRef<UniversalDocumentData | null>(null);
  if (!mockDataRef.current) {
    mockDataRef.current = getMockDocumentData();
  }

  // ── Filtered list ──────────────────────────────────────────────────────────
  const allTemplates = useMemo(() => templateRegistry.getAll(), []);
  const recentTemplates = useMemo(
    () => recentIds.map(id => templateRegistry.get(id)).filter(Boolean) as LibraryTemplateEntry[],
    [recentIds],
  );

  const filtered = useMemo(() => {
    let list = allTemplates;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.meta.name.toLowerCase().includes(q) ||
        e.meta.nameAr.includes(q) ||
        e.meta.description.toLowerCase().includes(q) ||
        e.meta.descriptionAr.includes(q) ||
        e.meta.tags.some(t => t.includes(q)) ||
        e.meta.documentType.toLowerCase().includes(q)
      );
    }
    if (filterDocType) list = list.filter(e => e.meta.documentType === filterDocType);
    if (filterPaperSize) list = list.filter(e => e.meta.paperSize === filterPaperSize);
    if (filterCategory) list = list.filter(e => e.meta.category === filterCategory);
    if (favoritesOnly) list = list.filter(e => favorites.has(e.meta.id));
    return list;
  }, [allTemplates, search, filterDocType, filterPaperSize, filterCategory, favoritesOnly, favorites]);

  // ── Derived filter options ─────────────────────────────────────────────────
  const docTypeOptions = useMemo(() => templateRegistry.getDocTypes(), [allTemplates]);
  const paperSizeOptions = useMemo(() => templateRegistry.getPaperSizes(), [allTemplates]);
  const categoryOptions = useMemo(() => templateRegistry.getCategories(), [allTemplates]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavorites(next);
      return next;
    });
  }, []);

  const handleInstall = useCallback(async (entry: LibraryTemplateEntry) => {
    setInstalling(entry.meta.id);
    try {
      const config = entry.createConfig();
      await onInstall(entry.meta.id, config);
      addRecent(entry.meta.id);
      setRecentIds(loadRecent());
      addHistory({
        templateId: entry.meta.id,
        templateNameAr: entry.meta.nameAr,
        installedAt: new Date().toISOString(),
        version: entry.meta.version,
        createdTplId: null,
      });
    } finally {
      setInstalling(null);
    }
  }, [onInstall]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setFilterDocType(null);
    setFilterPaperSize(null);
    setFilterCategory(null);
    setFavoritesOnly(false);
  }, []);

  // ── Keyboard handler ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      window.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  // ── Filter tag pills display ───────────────────────────────────────────────
  const hasActiveFilters = search || filterDocType || filterPaperSize || filterCategory || favoritesOnly;

  return (
    <div style={STYLES.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={STYLES.modal}>
        {/* Header */}
        <div style={STYLES.header}>
          <div style={STYLES.headerTitle}>
            <i className="ti ti-library" />
            مكتبة القوالب الجاهزة
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={resetFilters}
              style={{
                ...STYLES.closeBtn, fontSize: 11, width: 'auto', padding: '0 10px',
                color: hasActiveFilters ? 'var(--em)' : '#999',
                fontWeight: hasActiveFilters ? 700 : 400,
              }}
              title="إعادة ضبط الفلاتر"
            >
              <i className="ti ti-filter-off" style={{ marginLeft: 4 }} />
              {hasActiveFilters ? 'مسح الكل' : 'فلاتر'}
            </button>
            <button type="button" style={STYLES.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={STYLES.body}>
          {/* Search + Filters toolbar */}
          <div style={STYLES.toolbar}>
            <input
              type="text"
              placeholder="🔍 بحث في القوالب..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={STYLES.searchInput}
            />
            <select
              value={filterDocType ?? ''}
              onChange={e => setFilterDocType(e.target.value || null)}
              style={STYLES.filterSelect}
            >
              <option value="">كل المستندات</option>
              {docTypeOptions.map(dt => (
                <option key={dt} value={dt}>{dt}</option>
              ))}
            </select>
            <select
              value={filterPaperSize ?? ''}
              onChange={e => setFilterPaperSize(e.target.value || null)}
              style={STYLES.filterSelect}
            >
              <option value="">كل الأحجام</option>
              {paperSizeOptions.map(ps => (
                <option key={ps} value={ps}>{ps}</option>
              ))}
            </select>
            <select
              value={filterCategory ?? ''}
              onChange={e => setFilterCategory(e.target.value || null)}
              style={STYLES.filterSelect}
            >
              <option value="">كل التصنيفات</option>
              {categoryOptions.map(cat => {
                const label = TEMPLATE_CATEGORIES.find(c => c.id === cat);
                return (
                  <option key={cat} value={cat}>{label?.nameAr ?? cat}</option>
                );
              })}
            </select>
            <button
              type="button"
              onClick={() => setFavoritesOnly(f => !f)}
              style={{
                ...STYLES.filterSelect, cursor: 'pointer',
                background: favoritesOnly ? '#fef3c7' : '#fff',
                fontWeight: favoritesOnly ? 700 : 400,
              }}
            >
              <i className="ti ti-star" style={{ marginLeft: 4 }} />
              المفضلة
            </button>
          </div>

          {/* Recently installed */}
          {recentTemplates.length > 0 && !search && !favoritesOnly && (
            <div style={STYLES.recentRow}>
              <i className="ti ti-history" style={{ fontSize: 14, color: '#6366f1' }} />
              <span style={{ fontWeight: 700, color: '#444' }}>المثبتة مؤخراً:</span>
              {recentTemplates.slice(0, 3).map(t => (
                <button
                  key={t.meta.id}
                  type="button"
                  style={{
                    background: '#eef2ff', border: 'none', borderRadius: 4,
                    padding: '2px 8px', fontSize: 11, color: '#4338ca', cursor: 'pointer',
                  }}
                  onClick={() => {
                    setSearch('');
                    setFilterDocType(t.meta.documentType);
                  }}
                >
                  {t.meta.nameAr}
                </button>
              ))}
            </div>
          )}

          {/* Grid */}
          <div style={STYLES.grid}>
            {filtered.length === 0 ? (
              <div style={{ ...STYLES.emptyState, gridColumn: '1 / -1' }}>
                <i className="ti ti-files-off" style={{ fontSize: 32 }} />
                {hasActiveFilters ? 'لا توجد نتائج للبحث' : 'لا توجد قوالب جاهزة'}
              </div>
            ) : filtered.map(entry => {
              const { meta } = entry;
              const isBusy = installing === meta.id;
              const isFav = favorites.has(meta.id);
              const categoryObj = TEMPLATE_CATEGORIES.find(c => c.id === meta.category);

              return (
                <div key={meta.id} style={STYLES.card}>
                  {/* Preview */}
                  <div style={STYLES.cardPreviewWrapper}>
                    <div style={STYLES.cardPreviewContent}>
                      <Suspense fallback={<PreviewFallback />}>
                        <UniversalPreview
                          tpl={entry.createConfig()}
                          data={mockDataRef.current!}
                          company={null}
                        />
                      </Suspense>
                    </div>
                    {/* Favorite toggle */}
                    <button
                      type="button"
                      onClick={() => toggleFavorite(meta.id)}
                      style={{
                        ...STYLES.favBtn, position: 'absolute', top: 6, left: 6,
                      }}
                      title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                    >
                      {isFav ? '⭐' : '☆'}
                    </button>
                  </div>

                  {/* Info */}
                  <div style={STYLES.cardBody}>
                    <div style={STYLES.cardName}>
                      {meta.nameAr}
                    </div>
                    <div style={STYLES.cardDesc}>{meta.descriptionAr}</div>
                    <div style={STYLES.tagRow}>
                      <span style={STYLES.tagDoc}>
                        <i className="ti ti-file-text" style={{ fontSize: 8 }} />
                        {meta.documentType}
                      </span>
                      <span style={STYLES.tagSize}>
                        <i className="ti ti-dimensions" style={{ fontSize: 8 }} />
                        {meta.paperSize}
                      </span>
                      {categoryObj && (
                        <span style={STYLES.tagCategory}>
                          <i className="ti ti-folder" style={{ fontSize: 8 }} />
                          {categoryObj.nameAr}
                        </span>
                      )}
                    </div>

                    {/* Install */}
                    <button
                      type="button"
                      style={{
                        ...STYLES.installBtn,
                        opacity: isBusy ? 0.6 : 1,
                        cursor: isBusy ? 'wait' : 'pointer',
                      }}
                      onClick={() => handleInstall(entry)}
                      disabled={isBusy}
                    >
                      {isBusy ? (
                        <><i className="ti ti-loader-2 spin" /> جارٍ التثبيت...</>
                      ) : (
                        <><i className="ti ti-download" /> تثبيت القالب</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
