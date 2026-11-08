// ════════════════════════════════════════════════════════════════════════════
// pos-pro/mobile/components/MobileCustomerSheet.tsx — Sheet الزبائن
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import type { PosAggregatedLookups } from '@/lib/api/endpoints/lookups';
import type { Party } from '@/types';
import { avatarColor, initials } from '../mobileFormat';
import PPMSheet from './PPMSheet';
import CustomerPreview from './CustomerPreview';

type LookupCustomer = PosAggregatedLookups['customers'][number];

export interface MobileCustomerSheetProps {
  open: boolean;
  onClose: () => void;
  searchRef: React.RefObject<HTMLInputElement>;
  search: string;
  setSearch: (q: string) => void;
  client: Party | null;
  clientBalanceVal: number;
  visibleCustomers: LookupCustomer[];
  onSelect: (c: LookupCustomer) => void;
}

export default function MobileCustomerSheet({
  open, onClose, searchRef, search, setSearch, client, clientBalanceVal, visibleCustomers, onSelect,
}: MobileCustomerSheetProps) {
  return (
    <PPMSheet
      open={open}
      title="اختيار الزبون"
      onClose={onClose}
    >
      <div className="ppm-csearch">
        <i className="ti ti-search" />
        <input
          ref={searchRef}
          placeholder="بحث بالاسم / الرمز / الهاتف…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="ppm-csheet-body">
        {client && (
          <CustomerPreview
            name={client.name}
            phone={client.phone}
            balance={clientBalanceVal}
            isDebtor={clientBalanceVal < -0.004}
          />
        )}
        <div className="ppm-clist">
          {visibleCustomers.map((c) => (
            <button key={c.id} className="ppm-crow" onClick={() => onSelect(c)}>
              <span className="ppm-av" style={{ background: avatarColor(c.name) }}>{initials(c.name)}</span>
              <span className="ppm-info">
                <span className="ppm-n">{c.name}</span>
              </span>
              <i className="ti ti-chevron-left" />
            </button>
          ))}
          {visibleCustomers.length === 0 && (
            <div className="ppm-cart-empty"><span className="ppm-t">لا يوجد زبائن</span></div>
          )}
        </div>
      </div>
    </PPMSheet>
  );
}
