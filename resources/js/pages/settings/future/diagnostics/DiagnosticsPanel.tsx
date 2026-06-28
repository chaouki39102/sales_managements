import React, { useEffect, useState } from 'react';
import { diagnosticsService, type DiagnosticsReport } from './DiagnosticsService';

export const DiagnosticsPanel: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [reports, setReports] = useState<DiagnosticsReport[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setReports([...diagnosticsService.history()]);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const latest = reports[reports.length - 1];

  if (!diagnosticsService.enabled) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: expanded ? 0 : -300,
      right: 16,
      width: 360,
      background: '#1a1a2e',
      color: '#e0e0e0',
      borderRadius: '8px 8px 0 0',
      boxShadow: '0 -4px 16px rgba(0,0,0,0.3)',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: 11,
      transition: 'bottom 0.3s ease',
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          cursor: 'pointer',
          background: '#16213e',
          borderRadius: '8px 8px 0 0',
          userSelect: 'none',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 12 }}>ظأة Diagnostics</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {latest && (
            <>
              <span style={{ color: '#4fc3f7' }}>{latest.renderTime.toFixed(1)}ms</span>
              {latest.warnings.length > 0 && (
                <span style={{ color: '#ffa726' }}>ظأب {latest.warnings.length}</span>
              )}
              {latest.errors.length > 0 && (
                <span style={{ color: '#ef5350' }}>ظ£ـ {latest.errors.length}</span>
              )}
            </>
          )}
          <span style={{ fontSize: 10 }}>{expanded ? 'ظû╝' : 'ظû▓'}</span>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div style={{ padding: 8, maxHeight: 280, overflow: 'auto' }}>
          {latest && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
                <Metric label="Render" value={`${latest.renderTime.toFixed(1)}ms`} color="#4fc3f7" />
                <Metric label="Formula" value={`${latest.formulaTime.toFixed(1)}ms`} color="#81c784" />
                <Metric label="Rules" value={`${latest.ruleTime.toFixed(1)}ms`} color="#ffa726" />
                <Metric label="Layout" value={`${latest.layoutTime.toFixed(1)}ms`} color="#ba68c8" />
              </div>

              {latest.memoryEstimate > 0 && (
                <div style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>
                  Memory: ~{latest.memoryEstimate} MB ┬╖ Components: {latest.componentCount}
                </div>
              )}

              {/* Pipeline stages */}
              {latest.pipelineMetrics.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>Pipeline:</div>
                  {latest.pipelineMetrics.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '1px 4px' }}>
                      <span style={{ color: '#aaa' }}>{m.stage}</span>
                      <span style={{ color: '#4fc3f7' }}>{m.elapsedMs.toFixed(1)}ms</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {latest.warnings.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 10, color: '#ffa726', marginBottom: 2 }}>Warnings:</div>
                  {latest.warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: 9, color: '#ccc', padding: '1px 4px' }}>ظأب {w}</div>
                  ))}
                </div>
              )}

              {/* Errors */}
              {latest.errors.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: '#ef5350', marginBottom: 2 }}>Errors:</div>
                  {latest.errors.map((e, i) => (
                    <div key={i} style={{ fontSize: 9, color: '#ef9a9a', padding: '1px 4px' }}>ظ£ـ {e}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {reports.length === 0 && (
            <div style={{ color: '#666', fontSize: 10, textAlign: 'center', padding: 16 }}>
              No diagnostics data yet. Run a report render to see metrics.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    padding: '4px 6px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: 9, color: '#888' }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 600, color }}>{value}</div>
  </div>
);
