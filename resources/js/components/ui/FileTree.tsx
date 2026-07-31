import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Folder,
  FolderOpen,
  File,
  FileText,
  FileCode,
  FileJson,
  FileSpreadsheet,
  FileArchive,
  Settings,
  Image,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FileTreeElement = {
  id: string;
  name: string;
  /** "folder" renders a collapsible branch; omit or "file" for leaf. */
  type?: 'folder' | 'file';
  children?: FileTreeElement[];
  /** Custom icon component (receives a `className` prop). */
  icon?: React.ComponentType<{ className?: string }>;
  /** Highlights the node name with accent color. */
  highlight?: boolean;
  /** Whether a folder starts expanded. */
  defaultOpen?: boolean;
};

// ─── Context ──────────────────────────────────────────────────────────────────

type FileTreeCtx = {
  highlightColor: string;
  indentSize: number;
  showIcons: boolean;
  defaultOpenIds: Set<string>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  highlightBounds: HighlightBounds | null;
  setHighlightBounds: React.Dispatch<React.SetStateAction<HighlightBounds | null>>;
};

type HighlightBounds = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const FileTreeContext = React.createContext<FileTreeCtx | null>(null);

function useFileTree() {
  const ctx = React.useContext(FileTreeContext);
  if (!ctx) throw new Error('FileTree components must be used within <FileTree />');
  return ctx;
}

type FolderCtx = {
  isOpen: boolean;
  toggle: () => void;
};

const FolderContext = React.createContext<FolderCtx | null>(null);

function useFolder() {
  const ctx = React.useContext(FolderContext);
  if (!ctx) throw new Error('Folder components must be used within a folder item');
  return ctx;
}

// ─── Icon resolution ──────────────────────────────────────────────────────────

const EXT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  tsx: FileCode,
  ts: FileCode,
  jsx: FileCode,
  js: FileCode,
  json: FileJson,
  md: FileText,
  mdx: FileText,
  txt: FileText,
  csv: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  xls: FileSpreadsheet,
  png: Image,
  jpg: Image,
  jpeg: Image,
  svg: Image,
  webp: Image,
  gif: Image,
  zip: FileArchive,
  tar: FileArchive,
  gz: FileArchive,
  config: Settings,
  toml: Settings,
  yaml: Settings,
  yml: Settings,
  env: Settings,
  php: FileCode,
  py: FileCode,
  rb: FileCode,
  go: FileCode,
  rs: FileCode,
  css: FileCode,
  scss: FileCode,
  html: FileCode,
  xml: FileCode,
};

function resolveFileIcon(
  name: string,
  custom?: React.ComponentType<{ className?: string; strokeWidth?: number }>,
): React.ComponentType<{ className?: string; strokeWidth?: number }> {
  if (custom) return custom;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_ICONS[ext] ?? File;
}

// ─── Shared highlight / collapse pieces ───────────────────────────────────────

function FileTreeHoverHighlight({ className }: { className?: string }) {
  const { highlightBounds } = useFileTree();

  return (
    <AnimatePresence>
      {highlightBounds && (
        <motion.div
          className={className}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            top: highlightBounds.top,
            left: highlightBounds.left,
            width: highlightBounds.width,
            height: highlightBounds.height,
          }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          style={{ position: 'absolute', pointerEvents: 'none', zIndex: 0 }}
        />
      )}
    </AnimatePresence>
  );
}

function useHighlightTarget() {
  const { containerRef, setHighlightBounds } = useFileTree();
  const ref = React.useRef<HTMLDivElement>(null);

  const onMouseEnter = React.useCallback(() => {
    const el = ref.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();

    setHighlightBounds({
      top: eRect.top - cRect.top,
      left: eRect.left - cRect.left,
      width: eRect.width,
      height: eRect.height,
    });
  }, [containerRef, setHighlightBounds]);

  return { ref, onMouseEnter };
}

function FolderIcon({
  closeIcon,
  openIcon,
}: {
  closeIcon: React.ReactNode;
  openIcon: React.ReactNode;
}) {
  const { isOpen } = useFolder();

  return (
    <span className="inline-flex shrink-0 relative size-[1.125rem]">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={isOpen ? 'open' : 'close'}
          className="inline-flex"
          initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotate: 15 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.8 }}
        >
          {isOpen ? openIcon : closeIcon}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function FolderContent({ children }: { children: React.ReactNode }) {
  const { isOpen } = useFolder();

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Node renderers ───────────────────────────────────────────────────────────

function FileTreeFile({ node }: { node: FileTreeElement }) {
  const { highlightColor, showIcons } = useFileTree();
  const Icon = resolveFileIcon(node.name, node.icon);
  const highlightTarget = useHighlightTarget();

  return (
    <div
      ref={highlightTarget.ref}
      className="relative z-10"
      onMouseEnter={highlightTarget.onMouseEnter}
    >
      <div
        className="flex items-center gap-2 py-[7px] px-2 pointer-events-none select-none"
        style={node.highlight ? { color: highlightColor } : undefined}
      >
        {showIcons && (
          <span className="inline-flex shrink-0 text-[var(--t3)]">
            <Icon className="size-[18px]" strokeWidth={1.7} />
          </span>
        )}
        <span className="text-[13px] truncate">{node.name}</span>
      </div>
    </div>
  );
}

function FileTreeFolder({ node }: { node: FileTreeElement }) {
  const { defaultOpenIds, highlightColor, indentSize, showIcons } = useFileTree();
  const highlightTarget = useHighlightTarget();
  const [isOpen, setIsOpen] = React.useState(
    node.defaultOpen ?? defaultOpenIds.has(node.id),
  );
  const toggle = React.useCallback(() => setIsOpen((o) => !o), []);

  return (
    <FolderContext.Provider value={{ isOpen, toggle }}>
      <div data-value={node.id} className="relative z-10">
        <button type="button" className="w-full text-start" onClick={toggle}>
          <div ref={highlightTarget.ref} onMouseEnter={highlightTarget.onMouseEnter}>
            <div className="flex items-center gap-2 py-[7px] px-2 pointer-events-none select-none">
              {showIcons && (
                <FolderIcon
                  closeIcon={<Folder className="size-[18px] text-[var(--em)]" strokeWidth={1.7} />}
                  openIcon={<FolderOpen className="size-[18px] text-[var(--em)]" strokeWidth={1.7} />}
                />
              )}

              <motion.span
                className="inline-flex shrink-0 text-[var(--t3)]"
                animate={{ rotate: isOpen ? 90 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <ChevronRight className="size-3.5" strokeWidth={2.2} />
              </motion.span>

              <span
                className="text-[13px] font-medium truncate"
                style={node.highlight ? { color: highlightColor } : undefined}
              >
                {node.name}
              </span>
            </div>
          </div>
        </button>

        <div
          className="relative ml-6 before:absolute before:-left-2 before:inset-y-0 before:w-px before:h-full before:bg-[var(--b2)]"
          style={indentSize !== 24 ? { marginLeft: indentSize } : undefined}
        >
          <FolderContent>
            {(node.children ?? []).map((child) => (
              <FileTreeNode key={child.id} node={child} />
            ))}
          </FolderContent>
        </div>
      </div>
    </FolderContext.Provider>
  );
}

function FileTreeNode({ node }: { node: FileTreeElement }) {
  if (node.type === 'folder') return <FileTreeFolder node={node} />;
  return <FileTreeFile node={node} />;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type FileTreeProps = {
  elements: FileTreeElement[];
  className?: string;
  /** Highlight color for items with `highlight: true`. Defaults to emerald. */
  highlightColor?: string;
  /** Horizontal indent per nesting level in px. Defaults to 24. */
  indentSize?: number;
  /** Whether to show file/folder icons. Defaults to true. */
  showIcons?: boolean;
  /** Folder ids that should be open on first render. */
  defaultOpenIds?: string[];
};

export function FileTree({
  elements,
  className,
  highlightColor = 'var(--em)',
  indentSize = 24,
  showIcons = true,
  defaultOpenIds = [],
}: FileTreeProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [highlightBounds, setHighlightBounds] =
    React.useState<HighlightBounds | null>(null);
  const defaultOpenIdSet = React.useMemo(
    () => new Set(defaultOpenIds),
    [defaultOpenIds],
  );

  return (
    <FileTreeContext.Provider
      value={{
        highlightColor,
        indentSize,
        showIcons,
        defaultOpenIds: defaultOpenIdSet,
        containerRef,
        highlightBounds,
        setHighlightBounds,
      }}
    >
      <div
        className={cn(
          'rounded-[var(--r3)] border border-[var(--b2)] overflow-hidden',
          'bg-[var(--bg2)]',
          className,
        )}
      >
        <div
          ref={containerRef}
          className="p-2 w-full relative isolate"
          onMouseLeave={() => setHighlightBounds(null)}
        >
          <FileTreeHoverHighlight className="rounded-[var(--r1)] border border-[var(--em)]/20 bg-[var(--em)]/5 z-0" />
          {elements.map((node) => (
            <FileTreeNode key={node.id} node={node} />
          ))}
        </div>
      </div>
    </FileTreeContext.Provider>
  );
}

export default FileTree;
