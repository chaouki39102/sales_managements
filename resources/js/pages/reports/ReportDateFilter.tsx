import React from 'react';

interface ReportDateFilterProps {
  fromDate: string;
  toDate: string;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
}

export default function ReportDateFilter({ fromDate, toDate, onChangeFrom, onChangeTo }: ReportDateFilterProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <span style={{ fontWeight: 600, fontSize: 13 }}>من:</span>
      <input type="date" className="form-control" style={{ width: 170 }} value={fromDate} onChange={e => onChangeFrom(e.target.value)} />
      <span style={{ fontWeight: 600, fontSize: 13 }}>إلى:</span>
      <input type="date" className="form-control" style={{ width: 170 }} value={toDate} onChange={e => onChangeTo(e.target.value)} />
    </div>
  );
}
