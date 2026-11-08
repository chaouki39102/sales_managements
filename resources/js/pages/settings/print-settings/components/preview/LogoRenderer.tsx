import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';

function resolveLogoUrl(tpl: PrintTemplate, data: UniversalDocumentData): string | null {
  if (tpl.logo_source === 'custom') return tpl.custom_logo_url || null;
  if (tpl.logo_source === 'default') return null;
  return data.company?.logoUrl || null;
}

export function renderLogo(tpl: PrintTemplate, data: UniversalDocumentData) {
  const logoUrl = resolveLogoUrl(tpl, data);
  // No logo → print nothing. The old fallback painted a solid black square
  // with the company's first letter on every document of a company without a
  // logo (a fake logo, a block of toner, and ~20mm of header height).
  // The freeform designer still needs something to grab and position, so a
  // dashed slot is rendered hidden and only revealed inside the active
  // designer stage (`[data-ff-stage] .ps-logo-placeholder` in
  // print-settings.css) — never in previews, popups or on paper.
  if (!logoUrl) {
    return (
      <div className="ps-logo-placeholder" style={{
        display: 'none',
        width: tpl.logo_size, height: tpl.logo_size,
        border: '1px dashed #94a3b8', borderRadius: `${tpl.logo_border_radius}%`,
        alignItems: 'center', justifyContent: 'center',
        color: '#94a3b8', fontSize: 10,
      }}>
        الشعار
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: tpl.logo_align === 'right' ? 'flex-start' : tpl.logo_align === 'left' ? 'flex-end' : 'center',
      marginBottom: 4,
    }}>
      <img src={logoUrl} alt="logo"
        style={{
          width: tpl.logo_size, height: tpl.logo_size,
          objectFit: 'contain',
          borderRadius: `${tpl.logo_border_radius}%`,
        }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    </div>
  );
}
