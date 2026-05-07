import React, { useRef, useState, useId } from 'react';

interface FileUploaderProps {
  onChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // bytes
  maxFiles?: number;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onChange,
  accept,
  multiple = false,
  maxSize,
  maxFiles = 10,
  label,
  hint,
  error,
  disabled = false,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [localErrors, setLocalErrors] = useState<string[]>([]);
  const id = useId();

  const validate = (rawFiles: File[]): { valid: File[]; errors: string[] } => {
    const errors: string[] = [];
    const valid: File[] = [];
    const combined = multiple ? [...files, ...rawFiles] : rawFiles;

    if (multiple && combined.length > maxFiles) {
      errors.push(`الحد الأقصى ${maxFiles} ملفات`);
      return { valid, errors };
    }

    for (const f of rawFiles) {
      if (maxSize && f.size > maxSize) {
        errors.push(`${f.name}: الحجم يتجاوز ${formatBytes(maxSize)}`);
        continue;
      }
      valid.push(f);
    }
    return { valid, errors };
  };

  const addFiles = (rawFiles: FileList | null) => {
    if (!rawFiles || disabled) return;
    const { valid, errors } = validate(Array.from(rawFiles));
    setLocalErrors(errors);
    if (!valid.length) return;
    const updated = multiple ? [...files, ...valid] : valid;
    setFiles(updated);
    onChange(updated);
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onChange(updated);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className={`fu-wrapper ${className}`}>
      {label && <label className="fu-label" htmlFor={id}>{label}</label>}

      <div
        className={`fu-zone ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''} ${error || localErrors.length ? 'has-error' : ''}`}
        onDragOver={e => { e.preventDefault(); !disabled && setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="منطقة رفع الملفات"
        onKeyDown={e => e.key === 'Enter' && !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          className="fu-input"
          onChange={e => addFiles(e.target.files)}
          disabled={disabled}
        />

        <div className="fu-zone__content">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="fu-zone__icon">
            <path d="M16 4v16M9 11l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 24h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".5"/>
            <path d="M4 28h24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".3"/>
          </svg>
          <p className="fu-zone__text">
            {dragging ? 'أفلت الملف هنا' : 'اسحب وأفلت أو'}
            {!dragging && <span className="fu-zone__link"> انقر للاختيار</span>}
          </p>
          {hint && <p className="fu-zone__hint">{hint}</p>}
          {maxSize && <p className="fu-zone__hint">الحد الأقصى: {formatBytes(maxSize)}</p>}
        </div>
      </div>

      {/* Errors */}
      {(error || localErrors.length > 0) && (
        <div className="fu-errors">
          {error && <p className="fu-error">{error}</p>}
          {localErrors.map((e, i) => <p key={i} className="fu-error">{e}</p>)}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="fu-list">
          {files.map((file, i) => (
            <li key={i} className="fu-file">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="fu-file__icon">
                <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              <div className="fu-file__info">
                <span className="fu-file__name">{file.name}</span>
                <span className="fu-file__size">{formatBytes(file.size)}</span>
              </div>
              <button
                type="button"
                className="fu-file__remove"
                onClick={e => { e.stopPropagation(); removeFile(i); }}
                aria-label={`حذف ${file.name}`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .fu-wrapper { display: flex; flex-direction: column; gap: 6px; }
        .fu-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
        .fu-input { display: none; }
        .fu-zone {
          border: 2px dashed var(--color-border-secondary);
          border-radius: 10px; padding: 28px 20px;
          cursor: pointer; transition: border-color .15s, background .15s;
          text-align: center; outline: none;
        }
        .fu-zone:hover:not(.disabled), .fu-zone:focus:not(.disabled) { border-color: var(--color-text-info, #3b82f6); background: color-mix(in srgb, var(--color-text-info, #3b82f6) 4%, transparent); }
        .fu-zone.dragging { border-color: var(--color-text-info, #3b82f6); background: color-mix(in srgb, var(--color-text-info, #3b82f6) 8%, transparent); }
        .fu-zone.has-error { border-color: var(--color-text-danger, #ef4444); }
        .fu-zone.disabled { opacity: .5; cursor: not-allowed; }
        .fu-zone__content { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .fu-zone__icon { color: var(--color-text-tertiary); margin-bottom: 4px; }
        .fu-zone__text { margin: 0; font-size: 14px; color: var(--color-text-secondary); }
        .fu-zone__link { color: var(--color-text-info, #3b82f6); font-weight: 500; }
        .fu-zone__hint { margin: 0; font-size: 12px; color: var(--color-text-tertiary); }
        .fu-errors { display: flex; flex-direction: column; gap: 2px; }
        .fu-error { margin: 0; font-size: 12px; color: var(--color-text-danger, #ef4444); }
        .fu-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
        .fu-file {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px; border-radius: 8px;
          background: var(--color-background-secondary);
          border: 1px solid var(--color-border-tertiary);
        }
        .fu-file__icon { color: var(--color-text-secondary); flex-shrink: 0; }
        .fu-file__info { flex: 1; overflow: hidden; }
        .fu-file__name { display: block; font-size: 13px; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .fu-file__size { font-size: 12px; color: var(--color-text-tertiary); }
        .fu-file__remove {
          flex-shrink: 0; display: flex; align-items: center; justify-content: center;
          width: 24px; height: 24px; border: none; background: none;
          border-radius: 4px; cursor: pointer; color: var(--color-text-secondary);
        }
        .fu-file__remove:hover { background: var(--color-background-primary); color: var(--color-text-danger, #ef4444); }
      `}</style>
    </div>
  );
};

export default FileUploader;
