// resources/js/pages/finance/components/ActionBtn.tsx

export default function ActionBtn({ icon, color, onClick, disabled }: {
    icon: string; color: string; onClick?: () => void; disabled?: boolean;
}) {
    return (
        <button onClick={onClick} disabled={disabled} title=""
            style={{
                width: 28, height: 28, borderRadius: 6,
                background: 'var(--bg3)', border: '1px solid var(--b2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? .6 : 1, transition: 'all .1s',
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg1)';
                (e.currentTarget as HTMLElement).style.borderColor = color;
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg3)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)';
            }}>
            <i className={`ti ${icon}`} style={{ fontSize: 13, color }} />
        </button>
    );
}
