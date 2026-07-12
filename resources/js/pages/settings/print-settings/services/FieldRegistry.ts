// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// reporting/data/FieldRegistry.ts
//
// Layer 2 â€” depends on UniversalDocumentData types only.
// Catalogs every entity field available for use in report formulas, rules, and
// template properties. The singleton `fieldRegistry` is the single source of
// truth for field discovery in the reporting framework.
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface FieldDefinition {
  path: string;
  label: string;
  group: string;
  type: 'string' | 'number' | 'boolean';
  /**
   * Primary aggregation hint for array-numeric fields:
   * - `'sum'` â€” supports SUM, AVG, COUNT
   * - `'count'` â€” supports COUNT only (string/boolean array fields)
   * - `null` â€” no aggregation
   */
  aggregate?: 'sum' | 'avg' | 'count' | null;
  description?: string;
}

export interface FieldGroup {
  id: string;
  label: string;
  fields: FieldDefinition[];
}

// â”€â”€â”€ Registry implementation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class FieldRegistry {
  private byPath = new Map<string, FieldDefinition>();
  private groups = new Map<string, FieldGroup>();

  constructor(fields: FieldDefinition[]) {
    const grouped = new Map<string, FieldDefinition[]>();

    fields.forEach(f => {
      this.byPath.set(f.path, f);
      const list = grouped.get(f.group) ?? [];
      list.push(f);
      grouped.set(f.group, list);
    });

    const groupLabels: Record<string, string> = {
      doc:      'ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ظ…ط³طھظ†ط¯',
      company:  'ط§ظ„ط´ط±ظƒط©',
      party:    'ط§ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯',
      lines:    'ط§ظ„ط£ط³ط·ط±',
      totals:   'ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹط§طھ',
      balance:  'ط§ظ„ط±طµظٹط¯',
      payments: 'ط§ظ„ظ…ط¯ظپظˆط¹ط§طھ',
      computed: 'ظ…ط­ط³ظˆط¨',
    };

    grouped.forEach((fields, id) => {
      this.groups.set(id, {
        id,
        label: groupLabels[id] ?? id,
        fields,
      });
    });
  }

  getGroup(groupId: string): FieldGroup {
    const g = this.groups.get(groupId);
    if (!g) throw new Error(`FieldRegistry: unknown group "${groupId}"`);
    return g;
  }

  getAllGroups(): FieldGroup[] {
    const order = ['doc', 'company', 'party', 'lines', 'totals', 'balance', 'payments', 'computed'];
    return order.reduce<FieldGroup[]>((acc, id) => {
      const g = this.groups.get(id);
      if (g) acc.push(g);
      return acc;
    }, []);
  }

  getByPath(path: string): FieldDefinition | undefined {
    return this.byPath.get(path);
  }

  search(query: string): FieldDefinition[] {
    const q = query.toLowerCase();
    const results: FieldDefinition[] = [];
    this.byPath.forEach(f => {
      if (f.path.toLowerCase().includes(q) || f.label.includes(q)) {
        results.push(f);
      }
    });
    return results;
  }

  register(field: FieldDefinition): void {
    if (this.byPath.has(field.path)) {
      throw new Error(`FieldRegistry: field "${field.path}" already registered`);
    }
    this.byPath.set(field.path, field);
    let group = this.groups.get(field.group);
    if (!group) {
      group = { id: field.group, label: field.group, fields: [] };
      this.groups.set(field.group, group);
    }
    group.fields.push(field);
  }
}

// â”€â”€â”€ All fields from UniversalDocumentData â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ALL_FIELDS: FieldDefinition[] = [
  // â”€â”€ doc (ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ظ…ط³طھظ†ط¯) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'doc.number',     label: 'ط±ظ‚ظ… ط§ظ„ظپط§طھظˆط±ط©',       group: 'doc', type: 'string', description: 'ط±ظ‚ظ… ط§ظ„ظ…ط³طھظ†ط¯ ط§ظ„ظپط±ظٹط¯' },
  { path: 'doc.date',       label: 'طھط§ط±ظٹط® ط§ظ„ظپط§طھظˆط±ط©',     group: 'doc', type: 'string', description: 'طھط§ط±ظٹط® ط§ظ„ظ…ط³طھظ†ط¯ ط¨طµظٹط؛ط© ISO' },
  { path: 'doc.dueDate',    label: 'طھط§ط±ظٹط® ط§ظ„ط§ط³طھط­ظ‚ط§ظ‚',    group: 'doc', type: 'string', description: 'طھط§ط±ظٹط® ط§ط³طھط­ظ‚ط§ظ‚ ط§ظ„ط¯ظپط¹' },
  { path: 'doc.time',       label: 'ط§ظ„ظˆظ‚طھ',              group: 'doc', type: 'string', description: 'ظˆظ‚طھ ط¥طµط¯ط§ط± ط§ظ„ظ…ط³طھظ†ط¯' },
  { path: 'doc.typeCode',   label: 'ط±ظ…ط² ط§ظ„ظ†ظˆط¹',          group: 'doc', type: 'string', description: 'ط±ظ…ط² ظ†ظˆط¹ ط§ظ„ظ…ط³طھظ†ط¯ (FV, BL, FA, POS)' },
  { path: 'doc.typeName',   label: 'ظ†ظˆط¹ ط§ظ„ظ…ط³طھظ†ط¯',        group: 'doc', type: 'string', description: 'ط§ظ„ط§ط³ظ… ط§ظ„ظ…ط­ظ„ظٹ ظ„ظ†ظˆط¹ ط§ظ„ظ…ط³طھظ†ط¯' },
  { path: 'doc.status',     label: 'ط§ظ„ط­ط§ظ„ط©',             group: 'doc', type: 'string', description: 'ط­ط§ظ„ط© ط§ظ„ظ…ط³طھظ†ط¯ (ظ…ط³ظˆط¯ط©, ظ…ط¤ظƒط¯ط©, ظ…ظ„ط؛ظٹط©)' },
  { path: 'doc.notes',      label: 'ظ…ظ„ط§ط­ط¸ط§طھ',            group: 'doc', type: 'string', description: 'ظ…ظ„ط§ط­ط¸ط§طھ ط¹ظ„ظ‰ ط§ظ„ظ…ط³طھظ†ط¯' },
  { path: 'doc.reference',  label: 'ط§ظ„ظ…ط±ط¬ط¹',             group: 'doc', type: 'string', description: 'ط±ظ‚ظ… ظ…ط±ط¬ط¹ظٹ ط®ط§ط±ط¬ظٹ' },

  // â”€â”€ warehouse طھط­طھ doc â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'warehouse.id',      label: 'ظ…ط¹ط±ظپ ط§ظ„ظ…ط³طھظˆط¯ط¹',     group: 'doc', type: 'number', description: 'ظ…ط¹ط±ظپ ط§ظ„ظ…ط³طھظˆط¯ط¹ ط§ظ„ط±ظ‚ظ…ظٹ' },
  { path: 'warehouse.name',    label: 'ط§ط³ظ… ط§ظ„ظ…ط³طھظˆط¯ط¹',      group: 'doc', type: 'string', description: 'ط§ط³ظ… ط§ظ„ظ…ط³طھظˆط¯ط¹ ط£ظˆ ط§ظ„ظپط±ط¹' },
  { path: 'warehouse.address', label: 'ط¹ظ†ظˆط§ظ† ط§ظ„ظ…ط³طھظˆط¯ط¹',    group: 'doc', type: 'string', description: 'ط¹ظ†ظˆط§ظ† ط§ظ„ظ…ط³طھظˆط¯ط¹' },
  { path: 'warehouse.code',    label: 'ط±ظ…ط² ط§ظ„ظ…ط³طھظˆط¯ط¹',      group: 'doc', type: 'string', description: 'ط±ظ…ط² ط§ظ„ظ…ط³طھظˆط¯ط¹' },

  // â”€â”€ session طھط­طھ doc â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'session.id',         label: 'ظ…ط¹ط±ظپ ط§ظ„ط¬ظ„ط³ط©',      group: 'doc', type: 'number', description: 'ظ…ط¹ط±ظپ ط¬ظ„ط³ط© ط§ظ„ط¨ظٹط¹' },
  { path: 'session.code',       label: 'ط±ظ…ط² ط§ظ„ط¬ظ„ط³ط©',       group: 'doc', type: 'string', description: 'ط±ظ‚ظ… ط§ظ„ط¬ظ„ط³ط©' },
  { path: 'session.openedAt',   label: 'ظˆظ‚طھ ط§ظ„ظپطھط­',        group: 'doc', type: 'string', description: 'ظˆظ‚طھ ظپطھط­ ط§ظ„ط¬ظ„ط³ط©' },
  { path: 'session.closedAt',   label: 'ظˆظ‚طھ ط§ظ„ط¥ط؛ظ„ط§ظ‚',      group: 'doc', type: 'string', description: 'ظˆظ‚طھ ط¥ط؛ظ„ط§ظ‚ ط§ظ„ط¬ظ„ط³ط©' },
  { path: 'session.cashierName', label: 'ط§ط³ظ… ط§ظ„ظƒط§ط´ظٹط±',     group: 'doc', type: 'string', description: 'ط§ط³ظ… ط£ظ…ظٹظ† ط§ظ„طµظ†ط¯ظˆظ‚' },

  // â”€â”€ currency طھط­طھ doc â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'currency.code',   label: 'ط±ظ…ط² ط§ظ„ط¹ظ…ظ„ط©',         group: 'doc', type: 'string', description: 'ط±ظ…ط² ط§ظ„ط¹ظ…ظ„ط© (DZD, EUR, USD)' },
  { path: 'currency.symbol', label: 'ط±ظ…ط² ط§ظ„ط¹ظ…ظ„ط©',         group: 'doc', type: 'string', description: 'ط±ظ…ط² ط§ظ„ط¹ظ…ظ„ط© ط§ظ„ظ…ط­ظ„ظٹ (ط¯ط¬)' },
  { path: 'currency.rate',   label: 'ط³ط¹ط± ط§ظ„طµط±ظپ',          group: 'doc', type: 'number', description: 'ط³ط¹ط± ط§ظ„طµط±ظپ ظ…ظ‚ط§ط¨ظ„ ط§ظ„ط¹ظ…ظ„ط© ط§ظ„ط£ط³ط§ط³ظٹط©' },

  // â”€â”€ company (ط§ظ„ط´ط±ظƒط©) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'company.name',    label: 'ط§ط³ظ… ط§ظ„ط´ط±ظƒط©',         group: 'company', type: 'string', description: 'ط§ط³ظ… ط§ظ„ط´ط±ظƒط© ط§ظ„ظ…ط·ط¨ظˆط¹ط© ط¹ظ„ظ‰ ط§ظ„ظ…ط³طھظ†ط¯' },
  { path: 'company.address', label: 'ط¹ظ†ظˆط§ظ† ط§ظ„ط´ط±ظƒط©',       group: 'company', type: 'string', description: 'ط¹ظ†ظˆط§ظ† ط§ظ„ط´ط±ظƒط©' },
  { path: 'company.phone',   label: 'ظ‡ط§طھظپ ط§ظ„ط´ط±ظƒط©',        group: 'company', type: 'string', description: 'ط±ظ‚ظ… ظ‡ط§طھظپ ط§ظ„ط´ط±ظƒط©' },
  { path: 'company.nif',     label: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ط¬ط¨ط§ط¦ظٹ',      group: 'company', type: 'string', description: 'ط±ظ‚ظ… ط§ظ„طھط¹ط±ظٹظپ ط§ظ„ط¬ط¨ط§ط¦ظٹ' },
  { path: 'company.rc',      label: 'ط§ظ„ط³ط¬ظ„ ط§ظ„طھط¬ط§ط±ظٹ',      group: 'company', type: 'string', description: 'ط±ظ‚ظ… ط§ظ„ط³ط¬ظ„ ط§ظ„طھط¬ط§ط±ظٹ' },
  { path: 'company.nis',     label: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ط¥ط­طµط§ط¦ظٹ',     group: 'company', type: 'string', description: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ط¥ط­طµط§ط¦ظٹ' },
  { path: 'company.article', label: 'ط§ظ„ظ…ط§ط¯ط©',             group: 'company', type: 'string', description: 'ط±ظ‚ظ… ط§ظ„ظ…ط§ط¯ط©' },
  { path: 'company.logoUrl', label: 'ط±ط§ط¨ط· ط§ظ„ط´ط¹ط§ط±',        group: 'company', type: 'string', description: 'ط±ط§ط¨ط· طµظˆط±ط© ط´ط¹ط§ط± ط§ظ„ط´ط±ظƒط©' },
  { path: 'company.email',   label: 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ',  group: 'company', type: 'string', description: 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ„ظ„ط´ط±ظƒط©' },
  { path: 'company.website', label: 'ط§ظ„ظ…ظˆظ‚ط¹ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ',  group: 'company', type: 'string', description: 'ط§ظ„ظ…ظˆظ‚ط¹ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ„ظ„ط´ط±ظƒط©' },

  // â”€â”€ party (ط§ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'party.id',              label: 'ظ…ط¹ط±ظپ ط§ظ„ط·ط±ظپ',           group: 'party', type: 'number', description: 'ط§ظ„ظ…ط¹ط±ظپ ط§ظ„ط±ظ‚ظ…ظٹ ظ„ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.name',            label: 'ط§ط³ظ… ط§ظ„ط¹ظ…ظٹظ„',           group: 'party', type: 'string', description: 'ط§ط³ظ… ط§ظ„ط¹ظ…ظٹظ„ ط£ظˆ ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.type',            label: 'ظ†ظˆط¹ ط§ظ„ط·ط±ظپ',            group: 'party', type: 'string', description: 'ظ†ظˆط¹ ط§ظ„ط·ط±ظپ: ط¹ظ…ظٹظ„ ط£ظˆ ظ…ظˆط±ط¯' },
  { path: 'party.nif',             label: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ط¬ط¨ط§ط¦ظٹ ظ„ظ„ط·ط±ظپ',  group: 'party', type: 'string', description: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ط¬ط¨ط§ط¦ظٹ ظ„ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.rc',              label: 'ط§ظ„ط³ط¬ظ„ ط§ظ„طھط¬ط§ط±ظٹ ظ„ظ„ط·ط±ظپ',  group: 'party', type: 'string', description: 'ط§ظ„ط³ط¬ظ„ ط§ظ„طھط¬ط§ط±ظٹ ظ„ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.nis',             label: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ط¥ط­طµط§ط¦ظٹ ظ„ظ„ط·ط±ظپ', group: 'party', type: 'string', description: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ط¥ط­طµط§ط¦ظٹ ظ„ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.phone',           label: 'ظ‡ط§طھظپ ط§ظ„ط·ط±ظپ',           group: 'party', type: 'string', description: 'ط±ظ‚ظ… ظ‡ط§طھظپ ط§ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.email',           label: 'ط¨ط±ظٹط¯ ط§ظ„ط·ط±ظپ',           group: 'party', type: 'string', description: 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ„ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.address',         label: 'ط¹ظ†ظˆط§ظ† ط§ظ„ط·ط±ظپ',          group: 'party', type: 'string', description: 'ط¹ظ†ظˆط§ظ† ط§ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.deliveryAddress', label: 'ط¹ظ†ظˆط§ظ† ط§ظ„طھظˆطµظٹظ„',        group: 'party', type: 'string', description: 'ط¹ظ†ظˆط§ظ† ط§ظ„طھظˆطµظٹظ„ ظ„ظ„ط¹ظ…ظٹظ„' },
  { path: 'party.cashierName',     label: 'ط§ط³ظ… ط§ظ„ظƒط§ط´ظٹط±',          group: 'party', type: 'string', description: 'ط§ط³ظ… ط£ظ…ظٹظ† ط§ظ„طµظ†ط¯ظˆظ‚ (ظ„ظ„ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظ†ظ‚ط¯ظٹط©)' },

  // â”€â”€ lines.* (ط§ظ„ط£ط³ط·ط±) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Wildcard paths â€” individual line fields accessible via lines.*.<field>
  { path: 'lines.*.rowNumber',   label: 'ط±ظ‚ظ… ط§ظ„ط³ط·ط±',     group: 'lines', type: 'number', aggregate: 'sum',  description: 'ط±ظ‚ظ… ط§ظ„ط³ط·ط± (1-based)' },
  { path: 'lines.*.ref',         label: 'ط§ظ„ظ…ط±ط¬ط¹',        group: 'lines', type: 'string', aggregate: 'count', description: 'ظ…ط±ط¬ط¹ ط§ظ„ظ…ظ†طھط¬ / SKU' },
  { path: 'lines.*.barcode',     label: 'ط§ظ„ط¨ط§ط±ظƒظˆط¯',      group: 'lines', type: 'string', aggregate: 'count', description: 'ط§ظ„ط¨ط§ط±ظƒظˆط¯' },
  { path: 'lines.*.name',        label: 'ط§ظ„ط¨ظٹط§ظ†',        group: 'lines', type: 'string', aggregate: 'count', description: 'ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬ ط£ظˆ ط§ظ„ط®ط¯ظ…ط©' },
  { path: 'lines.*.unit',        label: 'ط§ظ„ظˆط­ط¯ط©',        group: 'lines', type: 'string', aggregate: 'count', description: 'ظˆط­ط¯ط© ط§ظ„ظ‚ظٹط§ط³' },
  { path: 'lines.*.quantity',    label: 'ط§ظ„ظƒظ…ظٹط©',        group: 'lines', type: 'number', aggregate: 'sum',  description: 'ط§ظ„ظƒظ…ظٹط© ط§ظ„ظ…ط¨ط§ط¹ط©' },
  { path: 'lines.*.unitPriceHt', label: 'ط³ط¹ط± ط§ظ„ظˆط­ط¯ط©',    group: 'lines', type: 'number', aggregate: 'sum',  description: 'ط³ط¹ط± ط§ظ„ظˆط­ط¯ط© ط¨ط¯ظˆظ† ط§ظ„ط¶ط±ظٹط¨ط©' },
  { path: 'lines.*.unitPriceTtc', label: 'ط³ط¹ط± ط§ظ„ظˆط­ط¯ط© ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط©', group: 'lines', type: 'number', aggregate: 'sum', description: 'ط³ط¹ط± ط§ظ„ظˆط­ط¯ط© ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط©' },
  { path: 'lines.*.tvaRate',     label: 'ظ†ط³ط¨ط© ط§ظ„ط¶ط±ظٹط¨ط©',  group: 'lines', type: 'number', aggregate: 'sum',  description: 'ظ†ط³ط¨ط© ط§ظ„ط¶ط±ظٹط¨ط© (0.19)' },
  { path: 'lines.*.tvaPct',      label: 'ظ†ط³ط¨ط© ط§ظ„ط¶ط±ظٹط¨ط© %', group: 'lines', type: 'number', aggregate: 'sum', description: 'ظ†ط³ط¨ط© ط§ظ„ط¶ط±ظٹط¨ط© ط§ظ„ظ…ط¦ظˆظٹط© (19)' },
  { path: 'lines.*.discountPct', label: 'ظ†ط³ط¨ط© ط§ظ„ط®طµظ…',    group: 'lines', type: 'number', aggregate: 'sum',  description: 'ظ†ط³ط¨ط© ط§ظ„ط®طµظ… ط§ظ„ظ…ط¦ظˆظٹط©' },
  { path: 'lines.*.discountAmt', label: 'ظ‚ظٹظ…ط© ط§ظ„ط®طµظ…',    group: 'lines', type: 'number', aggregate: 'sum',  description: 'ظ‚ظٹظ…ط© ط§ظ„ط®طµظ… ط¨ط§ظ„ط¹ظ…ظ„ط©' },
  { path: 'lines.*.totalHt',     label: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط§ظ„ط®ط§ظ…', group: 'lines', type: 'number', aggregate: 'sum',  description: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط¨ط¯ظˆظ† ط§ظ„ط¶ط±ظٹط¨ط© ط¨ط¹ط¯ ط§ظ„ط®طµظ…' },
  { path: 'lines.*.totalTva',    label: 'ظ‚ظٹظ…ط© ط§ظ„ط¶ط±ظٹط¨ط©',  group: 'lines', type: 'number', aggregate: 'sum',  description: 'ظ‚ظٹظ…ط© ط§ظ„ط¶ط±ظٹط¨ط© ط¹ظ„ظ‰ ط§ظ„ط³ط·ط±' },
  { path: 'lines.*.totalTtc',    label: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط©', group: 'lines', type: 'number', aggregate: 'sum', description: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط©' },
  { path: 'lines.*.lot',         label: 'ط±ظ‚ظ… ط§ظ„ط¯ظپط¹ط©',    group: 'lines', type: 'string', aggregate: 'count', description: 'ط±ظ‚ظ… ط§ظ„ط¯ظپط¹ط© / ط§ظ„طھط³ظ„ط³ظ„' },
  { path: 'lines.*.notes',       label: 'ظ…ظ„ط§ط­ط¸ط§طھ',       group: 'lines', type: 'string', aggregate: 'count', description: 'ظ…ظ„ط§ط­ط¸ط§طھ ط¹ظ„ظ‰ ط§ظ„ط³ط·ط±' },

  // â”€â”€ totals (ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹط§طھ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'totals.totalHt',       label: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط§ظ„ط®ط§ظ…',             group: 'totals', type: 'number', description: 'ظ…ط¬ظ…ظˆط¹ ظƒظ„ ط§ظ„ط£ط³ط·ط± ط¨ط¯ظˆظ† ط§ظ„ط¶ط±ظٹط¨ط©' },
  { path: 'totals.totalTva',      label: 'ظ…ط¬ظ…ظˆط¹ ط§ظ„ط¶ط±ظٹط¨ط©',            group: 'totals', type: 'number', description: 'ظ…ط¬ظ…ظˆط¹ ط§ظ„ط¶ط±ظٹط¨ط© ط¹ظ„ظ‰ ط§ظ„ظ‚ظٹظ…ط© ط§ظ„ظ…ط¶ط§ظپط©' },
  { path: 'totals.totalTtc',      label: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط©',     group: 'totals', type: 'number', description: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط§ظ„ظ†ظ‡ط§ط¦ظٹ ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط©' },
  { path: 'totals.fiscalStamp',   label: 'ط§ظ„ط·ط§ط¨ط¹ ط§ظ„ط¬ط¨ط§ط¦ظٹ',           group: 'totals', type: 'number', description: 'ط§ظ„ط·ط§ط¨ط¹ ط§ظ„ط¬ط¨ط§ط¦ظٹ (1% ط¨ظ‚ظٹظ…ط© 2500 ط¯ط¬ ظƒط­ط¯ ط£ظ‚طµظ‰)' },
  { path: 'totals.totalDiscount', label: 'ظ…ط¬ظ…ظˆط¹ ط§ظ„ط®طµظ…',              group: 'totals', type: 'number', description: 'ظ…ط¬ظ…ظˆط¹ ط§ظ„ط®طµظ… ط¹ظ„ظ‰ ظƒظ„ ط§ظ„ط£ط³ط·ط±' },
  { path: 'totals.paid',          label: 'ط§ظ„ظ…ط¯ظپظˆط¹',                  group: 'totals', type: 'number', description: 'ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…ط¯ظپظˆط¹ ظپط¹ظ„ط§ظ‹' },
  { path: 'totals.change',        label: 'ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…ط±طھط¬ط¹',           group: 'totals', type: 'number', description: 'ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…ط±طھط¬ط¹ ظ„ظ„ط¹ظ…ظٹظ„' },
  { path: 'totals.remaining',     label: 'ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…طھط¨ظ‚ظٹ',           group: 'totals', type: 'number', description: 'ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…طھط¨ظ‚ظٹ ظ„ظ„ط¯ظپط¹' },

  // â”€â”€ taxBreakdown.* طھط­طھ totals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'taxBreakdown.*.rate',   label: 'ظ†ط³ط¨ط© ط§ظ„ط¶ط±ظٹط¨ط©',        group: 'totals', type: 'number', aggregate: 'sum', description: 'ظ†ط³ط¨ط© ط§ظ„ط¶ط±ظٹط¨ط©' },
  { path: 'taxBreakdown.*.baseHt', label: 'ط§ظ„ط£ط³ط§ط³ ط§ظ„ط®ط§ط¶ط¹',       group: 'totals', type: 'number', aggregate: 'sum', description: 'ط§ظ„ط£ط³ط§ط³ ط§ظ„ط®ط§ط¶ط¹ ظ„ظ„ط¶ط±ظٹط¨ط©' },
  { path: 'taxBreakdown.*.tva',    label: 'ظ‚ظٹظ…ط© ط§ظ„ط¶ط±ظٹط¨ط©',        group: 'totals', type: 'number', aggregate: 'sum', description: 'ظ‚ظٹظ…ط© ط§ظ„ط¶ط±ظٹط¨ط© ظ„ظ„ط´ط±ظٹط­ط©' },
  { path: 'taxBreakdown.*.ttc',    label: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط©', group: 'totals', type: 'number', aggregate: 'sum', description: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط© ظ„ظ„ط´ط±ظٹط­ط©' },

  // â”€â”€ payments (ط§ظ„ظ…ط¯ظپظˆط¹ط§طھ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'payments.*.mode',      label: 'ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹',     group: 'payments', type: 'string', aggregate: 'count', description: 'ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹ (ظ†ظ‚ط¯ط§ظ‹, طھط­ظˆظٹظ„ ط¨ظ†ظƒظٹ)' },
  { path: 'payments.*.amount',    label: 'ط§ظ„ظ…ط¨ظ„ط؛',          group: 'payments', type: 'number', aggregate: 'sum',  description: 'ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…ط¯ظپظˆط¹ ط¹ط¨ط± ظ‡ط°ظ‡ ط§ظ„ط·ط±ظٹظ‚ط©' },
  { path: 'payments.*.reference', label: 'ظ…ط±ط¬ط¹ ط§ظ„ط¯ظپط¹',     group: 'payments', type: 'string', aggregate: 'count', description: 'ط§ظ„ظ…ط±ط¬ط¹ ط§ظ„ظ…طµط±ظپظٹ ظ„ظ„ط¯ظپط¹' },
  { path: 'payments.*.date',      label: 'طھط§ط±ظٹط® ط§ظ„ط¯ظپط¹',     group: 'payments', type: 'string', aggregate: 'count', description: 'طھط§ط±ظٹط® ط§ظ„ط¯ظپط¹' },

  // â”€â”€ balance (ط§ظ„ط±طµظٹط¯) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'balance.previous', label: 'ط§ظ„ط±طµظٹط¯ ط§ظ„ط³ط§ط¨ظ‚',   group: 'balance', type: 'number', description: 'ط±طµظٹط¯ ط§ظ„ط¹ظ…ظٹظ„ ظ‚ط¨ظ„ ظ‡ط°ظ‡ ط§ظ„ظپط§طھظˆط±ط©' },
  { path: 'balance.movement', label: 'ط§ظ„ط­ط±ظƒط©',          group: 'balance', type: 'number', description: 'طµط§ظپظٹ ط§ظ„ط­ط±ظƒط© ظ…ظ† ظ‡ط°ظ‡ ط§ظ„ظپط§طھظˆط±ط©' },
  { path: 'balance.current',  label: 'ط§ظ„ط±طµظٹط¯ ط§ظ„ط­ط§ظ„ظٹ',    group: 'balance', type: 'number', description: 'ط±طµظٹط¯ ط§ظ„ط¹ظ…ظٹظ„ ط¨ط¹ط¯ ظ‡ط°ظ‡ ط§ظ„ظپط§طھظˆط±ط©' },
  { path: 'balance.due',      label: 'ط§ظ„ظ…ط³طھط­ظ‚',          group: 'balance', type: 'number', description: 'ط§ظ„ط±طµظٹط¯ ط§ظ„ظ…ط³طھط­ظ‚ ظپظٹ طھط§ط±ظٹط® ط§ظ„ط§ط³طھط­ظ‚ط§ظ‚' },

  // â”€â”€ computed (ظ…ط­ط³ظˆط¨) â€” future / formula-engine fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'computed.amountInWords', label: 'ط§ظ„ظ…ط¨ظ„ط؛ ظƒطھط§ط¨ط©',     group: 'computed', type: 'string',  description: 'ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ ظƒطھط§ط¨ط© ط¨ط§ظ„ط¹ط±ط¨ظٹ' },
  { path: 'computed.profit',        label: 'ط§ظ„ط±ط¨ط­',            group: 'computed', type: 'number',  description: 'ط§ظ„ط±ط¨ط­ ظپظٹ ط§ظ„ظپط§طھظˆط±ط© (ظ…ط­ط³ظˆط¨)' },
];

// â”€â”€â”€ Legacy / convenience aliases (identical to real paths for field lookup) â”€â”€
// These are NOT registered â€” they exist conceptually but resolve to existing paths.
// The labels here are for documentation only:
//   prevBalance â†’ balance.previous
//   newBalance  â†’ balance.current
//   amountInWords â†’ computed.amountInWords
//   profit â†’ computed.profit

// â”€â”€â”€ Singleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const fieldRegistry = new FieldRegistry(ALL_FIELDS);
