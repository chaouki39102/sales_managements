import React from 'react';

interface DeliveryProgressBarProps {
  quantity:           number;
  deliveredQuantity:  number;
  returnedQuantity:   number;
}

export function DeliveryProgressBar({
  quantity,
  deliveredQuantity,
  returnedQuantity,
}: DeliveryProgressBarProps) {
  const remaining = quantity - deliveredQuantity - returnedQuantity;
  const deliveredPct = quantity > 0 ? Math.min(100, (deliveredQuantity / quantity) * 100) : 0;
  const returnedPct  = quantity > 0 ? Math.min(100, (returnedQuantity  / quantity) * 100) : 0;

  const isFullyDelivered = remaining <= 0;

  return (
    <div style={{ minWidth: 160 }}>
      <div style={{
        height: 6, borderRadius: 99, background: 'var(--b2)',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${deliveredPct}%`,
          background: 'var(--em)',
          transition: 'width .3s',
          position: 'absolute', right: 0, top: 0,
        }} />
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${returnedPct}%`,
          background: 'var(--purple)',
          transition: 'width .3s',
          position: 'absolute', right: 0, top: 0,
          opacity: 0.6,
        }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: 'var(--t4)', marginTop: 2,
      }}>
        <span>
          {deliveredQuantity > 0 && (
            <span style={{ color: 'var(--em)', fontWeight: 600 }}>
              {deliveredQuantity}
            </span>
          )}
          {returnedQuantity > 0 && (
            <span style={{ color: 'var(--purple)', fontWeight: 600, marginRight: 4 }}>
              (مرتجع {returnedQuantity})
            </span>
          )}
          <span style={{ marginRight: 4 }}>
            / {quantity}
          </span>
        </span>
        <span style={{
          fontWeight: 700,
          color: isFullyDelivered ? 'var(--green)' : 'var(--orange)',
        }}>
          {isFullyDelivered ? 'مُسلَّم كلياً' : `${Math.round(100 - (remaining / quantity) * 100)}%`}
        </span>
      </div>
    </div>
  );
}
