// SectionTitle — small uppercase section heading
export default function SectionTitle({ icon, label }: { icon: string; label: string }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                fontWeight: 800,
                color: "var(--t4)",
                textTransform: "uppercase",
                letterSpacing: 1.2,
                marginBottom: 12,
                marginTop: 4,
                paddingBottom: 8,
                borderBottom: "1px solid var(--b1)",
            }}
        >
            <i
                className={`ti ${icon}`}
                style={{ fontSize: 13, color: "var(--em)", opacity: 0.7 }}
            />
            {label}
        </div>
    );
}
