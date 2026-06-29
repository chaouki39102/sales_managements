import type { PrintTemplate, ColumnKey } from '../types';

export type Updater = <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;

const ALL_COLS: { key: ColumnKey; label: string }[] = [
  { key: 'rowNumber', label: 'رقم السطر'  },
  { key: 'barcode',   label: 'باركود'      },
  { key: 'ref',       label: 'المرجع'       },
  { key: 'name',      label: 'المنتج'       },
  { key: 'unit',      label: 'الوحدة'       },
  { key: 'quantity',  label: 'الكمية'       },
  { key: 'price',     label: 'السعر'        },
  { key: 'discount',  label: 'الخصم'        },
  { key: 'tva',       label: 'TVA'          },
  { key: 'total',     label: 'الإجمالي'    },
];

const miniBtn: React.CSSProperties = {
  width: 20, height: 20, borderRadius: 4, border: '1px solid var(--b2)',
  background: 'var(--bg3)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', fontSize: 10,
  color: 'var(--t3)', padding: 0, flexShrink: 0,
};

export function ColumnManager({ tpl, update }: { tpl: PrintTemplate; update: Updater }) {
  const toggleCol = (key: ColumnKey, show: boolean) => {
    update('col_show', { ...tpl.col_show, [key]: show });
    if (show && !tpl.col_order.includes(key))
      update('col_order', [...tpl.col_order, key]);
  };
  const moveCol = (key: ColumnKey, dir: -1 | 1) => {
    const arr = [...tpl.col_order];
    const idx = arr.indexOf(key);
    if (idx < 0) return;
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    update('col_order', arr);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {ALL_COLS.map(col => {
        const visible = tpl.col_show[col.key] !== false;
        const idx     = tpl.col_order.indexOf(col.key);
        return (
          <div
            key={col.key}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 6px',
              borderRadius: 'var(--r1)',
              background: visible ? 'var(--emb)' : 'var(--bg3)',
              border: `1px solid ${visible ? 'var(--embo)' : 'var(--b1)'}`,
            }}
          >
            <div
              onClick={() => toggleCol(col.key, !visible)}
              style={{
                width: 28, height: 15, borderRadius: 8, flexShrink: 0,
                background: visible ? 'var(--em)' : 'var(--bg5)',
                border: `1px solid ${visible ? 'var(--em)' : 'var(--b3)'}`,
                position: 'relative', cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute', top: 1.5,
                left: visible ? 12 : 1.5,
                width: 10, height: 10, borderRadius: '50%', background: '#fff',
                transition: 'left .15s',
              }} />
            </div>

            <span style={{
              flex: 1, fontSize: 11.5, fontWeight: 600, color: 'var(--t2)',
              minWidth: 0,
            }}>
              {col.label}
              {visible && idx >= 0 && (
                <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 4 }}>#{idx + 1}</span>
              )}
            </span>

            <button onClick={() => moveCol(col.key, -1)} disabled={idx <= 0}
              style={{ ...miniBtn, opacity: idx <= 0 ? .3 : 1 }} type="button">
              <i className="ti ti-chevron-right" />
            </button>
            <button onClick={() => moveCol(col.key, 1)}
              disabled={idx >= tpl.col_order.length - 1}
              style={{ ...miniBtn, opacity: idx >= tpl.col_order.length - 1 ? .3 : 1 }} type="button">
              <i className="ti ti-chevron-left" />
            </button>

            {visible && (
              <>
                <input
                  type="range" min={5} max={60} step={1}
                  value={tpl.col_widths[col.key] ?? 20}
                  onChange={e => update('col_widths', { ...tpl.col_widths, [col.key]: Number(e.target.value) })}
                  style={{ width: 44, height: 3, accentColor: 'var(--em)', flexShrink: 0 }}
                />
                <span style={{ fontSize: 10, color: 'var(--t4)', minWidth: 22 }}>
                  {tpl.col_widths[col.key] ?? 20}%
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
