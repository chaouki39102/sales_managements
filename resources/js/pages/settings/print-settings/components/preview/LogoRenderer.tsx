import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';

function resolveLogoUrl(tpl: PrintTemplate, data: UniversalDocumentData): string | null {
  if (tpl.logo_source === 'custom') return tpl.custom_logo_url || null;
  if (tpl.logo_source === 'default') return null;
  return data.company?.logoUrl || null;
}

export function renderLogo(tpl: PrintTemplate, data: UniversalDocumentData) {
  const logoUrl = resolveLogoUrl(tpl, data);
  const companyName = data.company?.name || '';

  return (
    <div style={{
      display: 'flex',
      justifyContent: tpl.logo_align === 'right' ? 'flex-start' : tpl.logo_align === 'left' ? 'flex-end' : 'center',
      marginBottom: 4,
    }}>
      {logoUrl ? (
        <img src={logoUrl} alt="logo"
          style={{
            width: tpl.logo_size, height: tpl.logo_size,
            objectFit: 'contain',
            borderRadius: `${tpl.logo_border_radius}%`,
          }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div style={{
          width: tpl.logo_size, height: tpl.logo_size,
          background: '#111',
          borderRadius: `${tpl.logo_border_radius}%`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: tpl.logo_size * 0.35, fontWeight: 900,
        }}>
          {companyName.charAt(0)}
        </div>
      )}
    </div>
  );
}
