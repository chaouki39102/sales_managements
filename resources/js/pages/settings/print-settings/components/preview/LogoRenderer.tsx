import type { PrintTemplate } from '../../types';
import type { CompanyData } from './shared';

export function renderLogo(tpl: PrintTemplate, co: CompanyData) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: tpl.logo_align === 'right' ? 'flex-start' : tpl.logo_align === 'left' ? 'flex-end' : 'center',
      marginBottom: 4,
    }}>
      {co.logoUrl ? (
        <img src={co.logoUrl} alt="logo"
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
          {co.name.charAt(0)}
        </div>
      )}
    </div>
  );
}
