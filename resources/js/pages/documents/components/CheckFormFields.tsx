interface CheckFormFieldsProps {
  checkNumber?: string;
  checkBank?:   string;
  checkDueDate?: string;
  onChange:     (fields: { check_number?: string; check_bank?: string; check_due_date?: string }) => void;
}

export function CheckFormFields({
  checkNumber = '',
  checkBank = '',
  checkDueDate = '',
  onChange,
}: CheckFormFieldsProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8,
      marginTop: 8,
      padding: '10px 12px',
      borderRadius: 'var(--r2)',
      background: 'color-mix(in srgb, var(--purple) 6%, var(--bg2))',
      border: '1px solid color-mix(in srgb, var(--purple) 20%, transparent)',
    }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--purple)', marginBottom: 4 }}>
          <i className="ti ti-numbers" style={{ marginLeft: 4, fontSize: 10 }} />
          رقم الشيك
        </div>
        <input
          type="text"
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b3)',
            background: 'var(--bg1)', color: 'var(--t1)',
            fontSize: 12, fontFamily: 'Tajawal, sans-serif',
            outline: 'none', boxSizing: 'border-box',
          }}
          value={checkNumber}
          onChange={(e) => onChange({ check_number: e.target.value })}
          placeholder="رقم الشيك"
        />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--purple)', marginBottom: 4 }}>
          <i className="ti ti-building-bank" style={{ marginLeft: 4, fontSize: 10 }} />
          البنك
        </div>
        <input
          type="text"
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b3)',
            background: 'var(--bg1)', color: 'var(--t1)',
            fontSize: 12, fontFamily: 'Tajawal, sans-serif',
            outline: 'none', boxSizing: 'border-box',
          }}
          value={checkBank}
          onChange={(e) => onChange({ check_bank: e.target.value })}
          placeholder="اسم البنك"
        />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--purple)', marginBottom: 4 }}>
          <i className="ti ti-calendar-due" style={{ marginLeft: 4, fontSize: 10 }} />
          تاريخ الاستحقاق
        </div>
        <input
          type="date"
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b3)',
            background: 'var(--bg1)', color: 'var(--t1)',
            fontSize: 12, fontFamily: 'Tajawal, sans-serif',
            outline: 'none', boxSizing: 'border-box',
          }}
          value={checkDueDate}
          onChange={(e) => onChange({ check_due_date: e.target.value })}
        />
      </div>
    </div>
  );
}
