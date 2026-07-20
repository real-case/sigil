import type { ReactNode } from "react";

export interface HeaderKpi {
  /** Formatted headline number, e.g. "52.9K". */
  value: string;
  /** Short muted caption under the value, e.g. "total". */
  caption?: string;
}

interface ChartHeaderProps {
  title: string;
  /** Derived headline stat shown on the right, before the toolbar. */
  kpi?: HeaderKpi;
  /** Toolbar (or any right-aligned controls). */
  children?: ReactNode;
}

/** Widget header: title on the left, derived KPI + toolbar on the right. */
export function ChartHeader({ title, kpi, children }: ChartHeaderProps) {
  return (
    <div className="sigil-header">
      <h2 className="sigil-title">{title}</h2>
      {(kpi || children) && (
        <div className="sigil-header-right">
          {kpi && (
            <div className="sigil-kpi">
              <div className="sigil-kpi-value">{kpi.value}</div>
              {kpi.caption && (
                <div className="sigil-kpi-caption">{kpi.caption}</div>
              )}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
