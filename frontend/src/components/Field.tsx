type Props = {
  label: string;
  children: React.ReactNode;
  hint?: string;
};

export default function Field({ label, children, hint }: Props) {
  return (
    <div>
      <label>{label}</label>
      {children}
      {hint ? (
        <div className="muted small" style={{ marginTop: 6 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}
