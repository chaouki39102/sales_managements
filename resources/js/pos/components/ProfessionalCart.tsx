import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { CartItem, CartTotals, Party, PriceLevel } from '@/types';
import { formatDZD } from '../utils/calculations';
import CartRow from './CartRow';

interface ProfessionalCartProps {
  items:       CartItem[];
  totals:      CartTotals;
  client:      Party | null;
  customers:   Party[];
  priceLevels: PriceLevel[];
  selectedPriceLevelId: number | null;
  note:        string;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onQty:       (id: string, qty: number) => void;
  onDiscount:  (id: string, pct: number) => void;
  onPrice:     (id: string, price: number) => void;
  onRemove:    (id: string) => void;
  onSetClient: (c: Party | null) => void;
  onPriceLevelChange: (plId: number | null) => void;
  onNoteChange: (n: string) => void;
  onHold:      () => void;
  onSell:      () => void;
  onClear:     () => void;
  onHeld:      () => void;
  totalTtcFinal: number;
  invoiceDiscountPct?: number;
  onInvoiceDiscountChange?: (pct: number) => void;
  invoiceDiscountAmount?: number;
}

export default function ProfessionalCart({
  items, totals, client, customers, priceLevels, selectedPriceLevelId,
  note, selectedItemId, onSelectItem,
  onQty, onDiscount, onPrice, onRemove, onSetClient, onPriceLevelChange,
  onNoteChange, onHold, onSell, onClear, onHeld, totalTtcFinal,
  invoiceDiscountPct = 0, onInvoiceDiscountChange, invoiceDiscountAmount = 0,
}: ProfessionalCartProps) {
  const [showNote,      setShowNote]    = useState(false);
  const [clientSearch,  setClientSearch] = useState('');
  const [openClient,    setOpenClient]  = useState(false);
  const clientRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node))
        setOpenClient(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filteredCustomers = useMemo(() =>
    customers.filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase())),
    [customers, clientSearch]
  );

  const isEmpty = !items.length;

  return (
    <div className="pos-cart" id="pos-cart">

      <div className="cart-top">
        <div className="cart-top-row">
          <div className="cart-ttl">
            <i className="ti ti-shopping-cart" style={{ fontSize: 15 }} />
            فاتورة البيع
            <span className={`cart-pill ${totals.items_count > 0 ? 'on' : ''}`}>
              {totals.items_count}
            </span>
          </div>
          <div className="cart-acts2">
            <button className="btn btn-xs" onClick={onHeld} title="الفواتير المعلقة (F7)">
              <i className="ti ti-clock-pause" />
            </button>
            <button
              className={`btn btn-xs ${note ? 'btn-p' : ''}`}
              onClick={() => setShowNote(s => !s)}
              title="ملاحظة على الفاتورة"
            >
              <i className="ti ti-notes" />
            </button>
            <button
              className="btn btn-xs btn-r"
              onClick={onClear}
              disabled={isEmpty}
              title="مسح السلة — F12"
            >
              <i className="ti ti-trash" />
            </button>
          </div>
        </div>

        {showNote && (
          <div className="cart-note-wrap">
            <input
              value={note}
              onChange={e => onNoteChange(e.target.value)}
              placeholder="ملاحظة تظهر على الفاتورة..."
              autoFocus
              className="cart-note-inp"
            />
          </div>
        )}

        {priceLevels.length > 0 && (
          <div className="cart-modes2">
            <button
              className={`cmode ${selectedPriceLevelId === null ? 'on' : ''}`}
              onClick={() => onPriceLevelChange(null)}
              title="السعر الافتراضي"
            >
              <i className="ti ti-tag" /> عادي
            </button>
            {priceLevels.map(pl => (
              <button
                key={pl.id}
                className={`cmode ${selectedPriceLevelId === pl.id ? 'on' : ''}`}
                onClick={() => onPriceLevelChange(pl.id)}
                title={pl.discount_percent ? `خصم ${pl.discount_percent}%` : undefined}
              >
                <i className="ti ti-tag" />
                {pl.name}
                {pl.discount_percent ? <span className="cmode-disc">-{pl.discount_percent}%</span> : null}
              </button>
            ))}
          </div>
        )}

        <div className="cart-client" ref={clientRef}>
          <div
            className={`client-trigger ${openClient ? 'open' : ''} ${client ? 'has-client' : ''}`}
            onClick={() => setOpenClient(s => !s)}
          >
            <i className="ti ti-user-search" style={{ fontSize: 14, opacity: 0.6 }} />
            <span className="ct-name">
              {client ? client.name : 'زبون عابر'}
            </span>
            {client?.balance !== undefined && client.balance > 0 && (
              <span className="ct-debt" title="رصيد الدين">
                <i className="ti ti-alert-circle" style={{ fontSize: 10 }} />
                {formatDZD(client.balance)}
              </span>
            )}
            <i className="ti ti-chevron-down" style={{ fontSize: 11, opacity: 0.4, marginRight: 'auto' }} />
          </div>

          {openClient && (
            <div className="client-dropdown">
              <div className="cd-search">
                <input
                  type="text"
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="🔍 ابحث عن زبون..."
                  autoFocus
                />
              </div>
              <div className="cd-list">
                <div
                  className={`cd-opt ${!client ? 'sel' : ''}`}
                  onClick={() => { onSetClient(null); setClientSearch(''); setOpenClient(false); }}
                >
                  <span className="co-av">👤</span>
                  <span className="co-nm">زبون عابر</span>
                </div>
                {filteredCustomers.map(c => (
                  <div
                    key={c.id}
                    className={`cd-opt ${client?.id === c.id ? 'sel' : ''}`}
                    onClick={() => { onSetClient(c); setClientSearch(''); setOpenClient(false); }}
                  >
                    <span className="co-av">{c.name[0]}</span>
                    <div className="co-info">
                      <span className="co-nm">{c.name}</span>
                      {c.phone && <span className="co-ph">{c.phone}</span>}
                    </div>
                    {c.balance !== undefined && c.balance > 0 && (
                      <span className="co-debt">{formatDZD(c.balance)}</span>
                    )}
                  </div>
                ))}
                {!filteredCustomers.length && clientSearch && (
                  <div className="cd-empty">لا توجد نتائج</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="cart-items">
        {isEmpty ? (
          <div className="cart-empty">
            <div className="ce-ico"><i className="ti ti-shopping-cart-off" /></div>
            <div className="ce-ttl">السلة فارغة</div>
            <div className="ce-sub">ابحث عن منتج أو امسح الباركود</div>
          </div>
        ) : (
          items.map((item, idx) => (
            <CartRow
              key={item.id}
              item={item}
              idx={idx}
              isSelected={selectedItemId === item.id}
              onSelect={() => onSelectItem(item.id)}
              onQty={qty => onQty(item.id, qty)}
              onDiscount={pct => onDiscount(item.id, pct)}
              onPrice={price => onPrice(item.id, price)}
              onRemove={() => onRemove(item.id)}
            />
          ))
        )}
      </div>

      {!isEmpty && (
        <div className="cart-totals">
          <div className="ct-row">
            <span>المجموع HT</span>
            <span>{formatDZD(totals.total_ht)}</span>
          </div>
          {totals.total_discount > 0 && (
            <div className="ct-row ct-disc">
              <span>إجمالي الخصم</span>
              <span>- {formatDZD(totals.total_discount)}</span>
            </div>
          )}
          <div className="ct-row">
            <span>TVA</span>
            <span>{formatDZD(totals.total_tva)}</span>
          </div>
          {onInvoiceDiscountChange && (
            <div className="ct-row ct-disc">
              <span>خصم الفاتورة</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number"
                  className="ct-disc-inp"
                  value={invoiceDiscountPct}
                  onChange={e => onInvoiceDiscountChange(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  min={0}
                  max={100}
                  step={1}
                  style={{ width: 50, padding: '2px 4px', borderRadius: 'var(--r1)', border: '1px solid var(--b2)', background: 'var(--bg3)', fontFamily: 'Tajawal,sans-serif', fontSize: 12, textAlign: 'center', outline: 'none' }}
                />
                <span style={{ fontSize: 11 }}>%</span>
                {invoiceDiscountAmount > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>-{formatDZD(invoiceDiscountAmount)}</span>
                )}
              </div>
            </div>
          )}
          {totals.fiscal_stamp > 0 && (
            <div className="ct-row">
              <span>طابع مالي</span>
              <span>{formatDZD(totals.fiscal_stamp)}</span>
            </div>
          )}
          <div className="ct-row ct-grand">
            <span>الإجمالي TTC</span>
            <strong className="grand-amount">{formatDZD(totalTtcFinal)}</strong>
          </div>
        </div>
      )}

      <div className="cart-actions">
        <button
          className="btn btn-sm"
          onClick={onHold}
          disabled={isEmpty}
          title="تعليق الفاتورة — F5"
        >
          <i className="ti ti-clock-pause" /> تعليق
        </button>
        <button
          className="cart-sell-btn"
          onClick={onSell}
          disabled={isEmpty}
          title="دفع والإتمام — F4"
        >
          <i className="ti ti-circle-check" />
          <span>
            {isEmpty ? 'السلة فارغة' : `دفع — ${formatDZD(totalTtcFinal)}`}
          </span>
          <kbd className="sell-kbd">F4</kbd>
        </button>
      </div>
    </div>
  );
}
