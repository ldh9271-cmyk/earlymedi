'use client';

export function PrintButton({ label }: { label: string }): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        border: '1px solid #dddddd', background: '#fff', borderRadius: 8,
        padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );
}
