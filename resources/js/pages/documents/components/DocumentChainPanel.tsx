import { useState } from 'react';
import { fmtDZD, fmtDate } from '../utils/document.utils';
import { STATUS_CONFIG } from '../types/document.types';
import type { DocumentChain, ChainNode } from '../hooks/useDocumentChain';

interface TargetType {
  code: string;
  name: string;
}

interface DocumentChainPanelProps {
  chain:           DocumentChain | null | undefined;
  isLoading:       boolean;
  currentId:       number;
  allowedTargets:  TargetType[];
  onConvert:       (targetCode: string) => void;
  onNavigate:      (node: ChainNode) => void;
  isReadOnly:      boolean;
}

function ChainNodeCard({
  node, isCurrent, onNavigate,
}: { node: ChainNode; isCurrent: boolean; onNavigate: (node: ChainNode) => void }) {
  const statusCfg = STATUS_CONFIG[node.status] ?? { label: node.status_label, color: 'var(--t4)', bg: 'var(--bg3)' };

  return (
    <div
      onClick={() => !isCurrent && onNavigate(node)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', borderRadius: 'var(--r2)',
        border: isCurrent
          ? '1px solid var(--em)'
          : '1px solid var(--b2)',
        background: isCurrent ? 'var(--emb)' : 'var(--bg2)',
        cursor: isCurrent ? 'default' : 'pointer',
        transition: 'all .15s',
        minWidth: 0,
        opacity: node.is_cancellation ? 0.65 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontWeight: 700, fontSize: 12,
            color: isCurrent ? 'var(--em)' : 'var(--t1)',
          }}>
            {node.document_number}
          </span>
          <span style={{
            padding: '1px 5px', borderRadius: 99, fontSize: 9, fontWeight: 700,
            background: statusCfg.bg, color: statusCfg.color,
          }}>
            {node.status_label}
          </span>
          {node.is_cancellation && (
            <span style={{ fontSize: 9, color: 'var(--red)' }}>مرتجع</span>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 1 }}>
          {node.document_type} · {node.type_name} · {fmtDate(node.document_date)} · {fmtDZD(node.net_to_pay)} دج
        </div>
      </div>
      {!isCurrent && (
        <i className="ti ti-external-link" style={{ fontSize: 11, color: 'var(--t4)', flexShrink: 0 }} />
      )}
    </div>
  );
}

function NodeWithChildren({
  node, isCurrent, onNavigate,
}: { node: ChainNode; isCurrent: boolean; onNavigate: (node: ChainNode) => void }) {
  return (
    <div>
      <ChainNodeCard node={node} isCurrent={isCurrent} onNavigate={onNavigate} />
      {node.children && node.children.length > 0 && (
        <div style={{ marginTop: 4, marginRight: 16, borderRight: '2px solid var(--b2)', paddingRight: 8 }}>
          {node.children.map(child => (
            <div key={child.id} style={{ marginTop: 4 }}>
              <NodeWithChildren node={child} isCurrent={isCurrent && child.id === -1} onNavigate={onNavigate} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentChainPanel({
  chain, isLoading, currentId: _currentId, allowedTargets, onConvert, onNavigate, isReadOnly,
}: DocumentChainPanelProps) {
  const [showConvert, setShowConvert] = useState(false);

  if (isLoading) {
    return (
      <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--t4)', display: 'flex', gap: 6, alignItems: 'center' }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
        جاري تحميل سلسلة المستندات...
      </div>
    );
  }

  if (!chain) return null;

  const hasRelations = chain.ancestors.length > 0 || chain.descendants.length > 0;

  return (
    <div style={{
      marginBottom: 14, padding: '10px 14px',
      background: 'var(--bg2)', borderRadius: 'var(--r2)',
      border: '1px solid var(--b2)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: hasRelations ? 10 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>
          <i className="ti ti-link" style={{ fontSize: 12 }} />
          سلسلة المستندات
          {hasRelations && (
            <span style={{
              padding: '1px 6px', borderRadius: 99, fontSize: 10,
              background: 'var(--bg3)', color: 'var(--t4)',
            }}>
              {chain.ancestors.length + chain.descendants.length} مستند مرتبط
            </span>
          )}
        </div>

        {!isReadOnly && allowedTargets.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowConvert(!showConvert)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 'var(--r2)',
                border: '1px solid var(--blue)', background: 'var(--blueb)',
                color: 'var(--blue)', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              }}
            >
              <i className="ti ti-arrows-exchange" style={{ fontSize: 12 }} />
              تحويل إلى...
              <i className={`ti ti-chevron-${showConvert ? 'up' : 'down'}`} style={{ fontSize: 10 }} />
            </button>

            {showConvert && (
              <div style={{
                position: 'absolute', left: 0, top: '100%', marginTop: 4,
                background: 'var(--bg1)', border: '1px solid var(--b2)',
                borderRadius: 'var(--r2)', boxShadow: '0 4px 16px rgba(0,0,0,.2)',
                zIndex: 100, minWidth: 160, overflow: 'hidden',
              }}>
                {allowedTargets.map(t => (
                  <button
                    key={t.code}
                    onClick={() => { setShowConvert(false); onConvert(t.code); }}
                    style={{
                      width: '100%', padding: '8px 12px', textAlign: 'right',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, color: 'var(--t1)',
                      borderBottom: '1px solid var(--b1)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {t.code} · {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {hasRelations && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {chain.ancestors.map((ancestor, _i) => (
            <div key={ancestor.id}>
              <ChainNodeCard node={ancestor} isCurrent={false} onNavigate={onNavigate} />
              <div style={{ marginRight: 16, borderRight: '2px solid var(--b2)', height: 6 }} />
            </div>
          ))}

          <ChainNodeCard node={chain.current} isCurrent onNavigate={onNavigate} />

          {chain.descendants.length > 0 && (
            <div style={{ marginRight: 16, borderRight: '2px solid var(--b2)', paddingRight: 8, marginTop: 4 }}>
              {chain.descendants.map(desc => (
                <div key={desc.id} style={{ marginTop: 4 }}>
                  <NodeWithChildren node={desc} isCurrent={false} onNavigate={onNavigate} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasRelations && (
        <div style={{ fontSize: 11, color: 'var(--t4)' }}>
          لا توجد مستندات مرتبطة
        </div>
      )}
    </div>
  );
}
