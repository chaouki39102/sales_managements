import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
import { templateRegistry } from './registry';
import { TEMPLATE_CATEGORIES } from './categories';
import type { LibraryTemplateEntry, FavoriteEntry, InstallHistoryEntry } from './types';
import type { PrintTemplate } from '../types';
import type { UniversalDocumentData } from '../types/data';
import Modal from '../../../../components/ui/Modal';
import { Button, Badge, EmptyState, Tabs } from '../../../../components/ui';
import SearchInput from '../../../../components/ui/SearchInput';
import Dropdown from '../../../../components/ui/Dropdown';
import { getMockDocumentData } from './mockData';

// ════════════════════════════════════════════════════════════════════════════
//  Lazy-loaded UniversalPreview (code-split)
// ════════════════════════════════════════════════════════════════════════════

const UniversalPreview = lazy(() => import('../components/preview/UniversalPreview'));

const HINT_ROW_CLASS = 'tpl-lib-fallback';

function PreviewFallback() {
  return (
    <div className={HINT_ROW_CLASS}>
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

function loadHistory(): InstallHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
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

export default function TemplateLibraryModal({ open, onClose, onInstall, activeDoc }: Props) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterDocType, setFilterDocType] = useState<string | null>(activeDoc ?? null);
  const [filterPaperSize, setFilterPaperSize] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterCountry, setFilterCountry] = useState<string | null>(null);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [view, setView] = useState<'library' | 'history'>('library');
  const [installing, setInstalling] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [recentIds, setRecentIds] = useState<string[]>(loadRecent);
  const [history, setHistory] = useState<InstallHistoryEntry[]>(loadHistory);
  const [zoomEntry, setZoomEntry] = useState<LibraryTemplateEntry | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // ── Cached mock data (never recreate) ──────────────────────────────────────
  const mockDataRef = useRef<UniversalDocumentData | null>(null);
  if (!mockDataRef.current) {
    mockDataRef.current = getMockDocumentData();
  }

  // ── Entry lookup from template id ──────────────────────────────────────────
  const entryById = useCallback(
    (id: string) => templateRegistry.get(id),
    [],
  );

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
    if (filterCountry) list = list.filter(e => e.meta.country === filterCountry);
    if (filterTags.length) list = list.filter(e => filterTags.every(t => e.meta.tags.includes(t)));
    if (favoritesOnly) list = list.filter(e => favorites.has(e.meta.id));
    return list;
  }, [allTemplates, search, filterDocType, filterPaperSize, filterCategory, filterCountry, filterTags, favoritesOnly, favorites]);

  // ── Derived filter options ─────────────────────────────────────────────────
  const docTypeOptions = useMemo(() => templateRegistry.getDocTypes(), [allTemplates]);
  const paperSizeOptions = useMemo(() => templateRegistry.getPaperSizes(), [allTemplates]);
  const categoryOptions = useMemo(() => templateRegistry.getCategories(), [allTemplates]);
  const countryOptions = useMemo(
    () => [...new Set(allTemplates.map(e => e.meta.country).filter(Boolean) as string[])],
    [allTemplates],
  );
  const availableTags = useMemo(() => templateRegistry.getTags(), [allTemplates]);

  const hasActiveFilters = Boolean(
    search || filterDocType || filterPaperSize || filterCategory || filterCountry ||
    filterTags.length || favoritesOnly,
  );

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

  const toggleTag = useCallback((tag: string) => {
    setFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
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
      setHistory(loadHistory());
    } finally {
      setInstalling(null);
    }
  }, [onInstall]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setFilterDocType(null);
    setFilterPaperSize(null);
    setFilterCategory(null);
    setFilterCountry(null);
    setFilterTags([]);
    setFavoritesOnly(false);
    setView('library');
  }, []);

  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(HISTORY_KEY);
      setHistory([]);
    } catch { /* ignore */ }
  }, []);

  const reinstallFromHistory = useCallback(
    async (entry: InstallHistoryEntry) => {
      const tpl = entryById(entry.templateId);
      if (!tpl) return;
      setInstalling(entry.templateId);
      try {
        const config = tpl.createConfig();
        await onInstall(entry.templateId, config);
        addRecent(entry.templateId);
        setRecentIds(loadRecent());
      } finally {
        setInstalling(null);
      }
    },
    [entryById, onInstall],
  );

  // ── Reset filters when the modal opens ─────────────────────────────────────
  useEffect(() => {
    if (open) {
      setFavorites(loadFavorites());
      setRecentIds(loadRecent());
      setHistory(loadHistory());
    }
  }, [open]);

  // ════════════════════════════════════════════════════════════════════════════
  //  Render
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <>
          <i className="ti ti-library" />
          مكتبة القوالب الجاهزة
        </>
      }
      size="xl"
      bodyHeight="min(72vh, 640px)"
    >
      <div className="tpl-lib-body">
        {/* ── Toolbar: search + selects + favorite toggle ── */}
        <div className="tpl-lib-toolbar">
          <div className="tpl-lib-filter tpl-lib-filter--search">
            <SearchInput
              value={search}
              onChange={setSearch}
              onSearch={setSearch}
              placeholder="بحث في القوالب..."
              debounce={250}
              style={{ width: '100%' }}
            />
          </div>
          <div className="tpl-lib-filter">
            <Dropdown
              options={docTypeOptions.map(dt => ({ label: dt, value: dt }))}
              value={filterDocType ?? ''}
              onChange={v => setFilterDocType(typeof v === 'string' ? (v || null) : String(v))}
              placeholder="كل المستندات"
            />
          </div>
          <div className="tpl-lib-filter">
            <Dropdown
              options={paperSizeOptions.map(ps => ({ label: ps, value: ps }))}
              value={filterPaperSize ?? ''}
              onChange={v => setFilterPaperSize(typeof v === 'string' ? (v || null) : String(v))}
              placeholder="كل الأحجام"
            />
          </div>
          <div className="tpl-lib-filter">
            <Dropdown
              options={categoryOptions.map(cat => {
                const label = TEMPLATE_CATEGORIES.find(c => c.id === cat);
                return { label: label?.nameAr ?? cat, value: cat };
              })}
              value={filterCategory ?? ''}
              onChange={v => setFilterCategory(typeof v === 'string' ? (v || null) : String(v))}
              placeholder="كل التصنيفات"
            />
          </div>
          {countryOptions.length > 1 && (
            <div className="tpl-lib-filter">
              <Dropdown
                options={countryOptions.map(c => ({ label: c, value: c }))}
                value={filterCountry ?? ''}
                onChange={v => setFilterCountry(typeof v === 'string' ? (v || null) : String(v))}
                placeholder="كل البلدان"
              />
            </div>
          )}
          <Button
            variant={favoritesOnly ? 'primary' : 'gray'}
            size="sm"
            icon={<i className="ti ti-star" />}
            onClick={() => setFavoritesOnly(f => !f)}
          >
            المفضلة
          </Button>
          <Button
            variant="gray"
            size="sm"
            icon={<i className="ti ti-filter-off" />}
            onClick={resetFilters}
            title="إعادة ضبط الفلاتر"
          >
            {hasActiveFilters ? 'مسح الكل' : 'الفلاتر'}
          </Button>
        </div>

        {/* ── View toggle + counters ── */}
        <div className="tpl-lib-toolbar">
          <Tabs
            tabs={[
              { key: 'library', label: 'المكتبة', icon: <i className="ti ti-library" /> },
              { key: 'history', label: 'سجل التثبيت', icon: <i className="ti ti-history" /> },
            ]}
            active={view}
            onChange={k => setView(k as 'library' | 'history')}
          />
          <span className="tpl-lib-count">
            {view === 'library'
              ? `عرض ${filtered.length} قالب من أصل ${allTemplates.length}`
              : `${history.length} عملية تثبيت`}
          </span>
        </div>

        {/* ── Tag chips ── */}
        <div className="tpl-lib-tags">
          <span className="tpl-lib-tags-lab">الوسوم:</span>
          {availableTags.map(tag => (
            <Button
              key={tag}
              variant={filterTags.includes(tag) ? 'primary' : 'gray'}
              size="xs"
              icon={filterTags.includes(tag) ? <i className="ti ti-check" /> : undefined}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>

        {/* ── Recently installed ── */}
        {recentTemplates.length > 0 && !search && !favoritesOnly && view === 'library' && (
          <div className="tpl-lib-recent">
            <span className="tpl-lib-recent-lab">
              <i className="ti ti-clock" />
              المثبتة مؤخراً:
            </span>
            {recentTemplates.slice(0, 3).map(t => (
              <Button
                key={t.meta.id}
                variant="gray"
                size="xs"
                icon={<i className="ti ti-folder" />}
                onClick={() => {
                  setSearch('');
                  setFilterDocType(t.meta.documentType);
                }}
              >
                {t.meta.nameAr}
              </Button>
            ))}
          </div>
        )}

        {/* ── Library grid ── */}
        {view === 'library' ? (
          <div
            className="tpl-lib-grid"
            ref={gridRef}
            onKeyDown={e => {
              if ((e.target as HTMLElement).closest('input, select, textarea')) return;
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                if (!focusedId || filtered.length === 0) {
                  if (filtered.length) {
                    const first = filtered[0].meta.id;
                    setFocusedId(first);
                    const el = gridRef.current?.querySelector('#tpl-lib-card-' + first) as HTMLElement | null;
                    el?.focus();
                  }
                  return;
                }
                const idx = filtered.findIndex(entry => entry.meta.id === focusedId);
                if (idx === -1) return;
                const next = e.key === 'ArrowLeft' ? (idx + 1) % filtered.length : (idx - 1 + filtered.length) % filtered.length;
                const id = filtered[next].meta.id;
                setFocusedId(id);
                const el = gridRef.current?.querySelector('#tpl-lib-card-' + id) as HTMLElement | null;
                el?.focus();
              }
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ gridColumn: '1 / -1' }}>
              <EmptyState
                icon={<i className={`ti ${hasActiveFilters ? 'ti-files-off' : 'ti-folder-off'}`} />}
                title={hasActiveFilters ? 'لا توجد نتائج للبحث عن القوالب' : 'لا توجد قوالب جاهزة'}
                action={hasActiveFilters ? (
                  <Button
                    variant="gray"
                    size="sm"
                    icon={<i className="ti ti-filter-off" />}
                    onClick={resetFilters}
                  >
                    مسح الفلاتر
                  </Button>
                ) : undefined}
              />
            </div>
            ) : filtered.map(entry => {
              const { meta } = entry;
              const isBusy = installing === meta.id;
              const isFav = favorites.has(meta.id);
              const categoryObj = TEMPLATE_CATEGORIES.find(c => c.id === meta.category);
              const isFocused = focusedId === meta.id;

              return (
                <div
                  key={meta.id}
                  className={`tpl-lib-card ${isBusy ? '' : isFocused ? 'on' : ''}`}
                  id={`tpl-lib-card-${meta.id}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`تثبيت ${meta.nameAr}`}
                  onFocus={() => setFocusedId(meta.id)}
                  onBlur={() => setFocusedId(null)}
                  onKeyDown={e => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    if (e.target !== e.currentTarget) return;
                    e.preventDefault();
                    handleInstall(entry);
                  }}
                >
                  {/* Preview (click to zoom) */}
                  <div
                    className="tpl-lib-prev"
                    tabIndex={0}
                    role="button"
                    aria-label={`تكبير معاينة ${meta.nameAr}`}
                    onClick={() => setZoomEntry(entry)}
                    onKeyDown={e => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      if (e.target !== e.currentTarget) return;
                      e.preventDefault();
                      setZoomEntry(entry);
                    }}
                  >
                    <div className="tpl-lib-prev-inner">
                      <Suspense fallback={<PreviewFallback />}>
                        <UniversalPreview
                          tpl={entry.createConfig()}
                          data={mockDataRef.current!}
                        />
                      </Suspense>
                    </div>
                    <div className="tpl-lib-prev-ic">
                      <i className="ti ti-zoom-in" />
                    </div>
                    {/* Favorite toggle */}
                    <button
                      type="button"
                      className={`tpl-lib-fav ${isFav ? 'on' : ''}`}
                      onClick={e => { e.stopPropagation(); toggleFavorite(meta.id); }}
                      title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                    >
                      <i className={`ti ${isFav ? 'ti-star-filled' : 'ti-star'}`} />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="tpl-lib-body2">
                    <div className="tpl-lib-name">{meta.nameAr}</div>
                    <div className="tpl-lib-desc">{meta.descriptionAr}</div>
                    <div className="tpl-lib-tagsrow">
                      <Badge noDot variant="gray">
                        <i className="ti ti-file-text" />
                        {meta.documentType}
                      </Badge>
                      <Badge noDot variant="teal">
                        <i className="ti ti-dimensions" />
                        {meta.paperSize}
                      </Badge>
                      {categoryObj && (
                        <Badge noDot variant="purple">
                          <i className="ti ti-folder" />
                          {categoryObj.nameAr}
                        </Badge>
                      )}
                    </div>

                    {/* Install */}
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      fullWidth
                      disabled={isBusy}
                      icon={isBusy ? <i className="ti ti-loader-2 spin" /> : <i className="ti ti-download" />}
                      onClick={() => handleInstall(entry)}
                    >
                      {isBusy ? 'جارٍ التثبيت...' : 'تثبيت القالب'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── History view ── */
          <div className="tpl-lib-history">
            {history.length === 0 ? (
              <EmptyState
                icon={<i className="ti ti-history" />}
                title="لا توجد عمليات تثبيت بعد"
              />
            ) : (
              <>
                {history.map((h, idx) => {
                  const entry = entryById(h.templateId);
                  const missing = !entry;
                  const isBusy = installing === h.templateId;
                  return (
                    <div key={h.templateId + '-' + idx} className="tpl-lib-hist-row">
                      <div className="tpl-lib-hist-ic">
                        <i className={missing ? 'ti ti-file-x' : 'ti ti-file-check'} />
                      </div>
                      <div className="tpl-lib-hist-info">
                        <div className="tpl-lib-hist-name">
                          {missing ? `${h.templateNameAr} (غير متوفر)` : h.templateNameAr}
                        </div>
                        <div className="tpl-lib-hist-meta">
                          {h.version}
                          {h.createdTplId ? ` · id ${h.createdTplId}` : ''}
                        </div>
                        <div className="tpl-lib-hist-date">
                          {new Date(h.installedAt).toLocaleString('ar-DZ')}
                        </div>
                      </div>
                      <div className="tpl-lib-hist-actions">
                        {!missing && (
                          <Button
                            type="button"
                            variant="gray"
                            size="sm"
                            disabled={isBusy}
                            icon={isBusy ? <i className="ti ti-loader-2 spin" /> : <i className="ti ti-download" />}
                            onClick={() => reinstallFromHistory(h)}
                          >
                            إعادة التثبيت
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Button type="button" variant="ghost" size="sm" icon={<i className="ti ti-trash" />} onClick={clearHistory}>
                  مسح السجل
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Zoom modal (nested) ── */}
      <Modal
        open={Boolean(zoomEntry)}
        onClose={() => setZoomEntry(null)}
        title={
          zoomEntry
            ? <><i className="ti ti-zoom-in" /> {zoomEntry.meta.nameAr}</>
            : 'معاينة'
        }
        size="xl"
        resizable={false}
      >
        <div className="tpl-lib-zoom">
          {zoomEntry && (
            <Suspense fallback={<PreviewFallback />}>
              <UniversalPreview
                tpl={zoomEntry.createConfig()}
                data={mockDataRef.current!}
              />
            </Suspense>
          )}
        </div>
        <div className="tpl-lib-zoom-hint">
          المعاينة بالمقاس الحقيقي — أغلِق بالنقر خارج النافذة أو بمفتاح Esc
        </div>
      </Modal>
    </Modal>
  );
}