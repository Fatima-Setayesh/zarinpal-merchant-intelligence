import type { KeyboardEvent } from "react";

export type DashboardTab = "overview" | "insights";

const tabs: Array<{ id: DashboardTab; label: string }> = [
  { id: "overview", label: "نمای کلی" },
  { id: "insights", label: "بینش‌ها" },
];

export function DashboardTabs({
  selected,
  onChange,
  idBase = "dashboard",
}: {
  selected: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  idBase?: string;
}) {
  const activateFromKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
  ): void => {
    const current = tabs.findIndex((tab) => tab.id === selected);
    let next = current;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else if (event.key === "ArrowLeft") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowRight")
      next = (current - 1 + tabs.length) % tabs.length;
    else return;
    event.preventDefault();
    onChange(tabs[next]?.id ?? selected);
    document.getElementById(`${idBase}-tab-${tabs[next]?.id}`)?.focus();
  };
  return (
    <div className="preview-tabs" role="tablist" aria-label="بخش‌های داشبورد">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`${idBase}-tab-${tab.id}`}
          type="button"
          role="tab"
          tabIndex={selected === tab.id ? 0 : -1}
          aria-selected={selected === tab.id}
          aria-controls={`${idBase}-panel-${tab.id}`}
          data-active={selected === tab.id}
          onClick={() => onChange(tab.id)}
          onKeyDown={activateFromKeyboard}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
