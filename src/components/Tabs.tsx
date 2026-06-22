export function Tabs<T extends string>({
  active,
  onChange,
  tabs
}: {
  active: T;
  onChange: (tab: T) => void;
  tabs: [T, string][];
}) {
  return (
    <div className="tabs">
      {tabs.map(([key, label]) => (
        <button key={key} className={active === key ? "active" : ""} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  );
}
