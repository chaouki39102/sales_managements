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
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
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

    </div>
  );
};

export default FileUploader;
