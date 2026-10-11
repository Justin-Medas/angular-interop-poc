// Public API of @poc/ui: the design system's contract with feature code (NFR-ARCH2).
// Only our components are exported; AG Grid types never leak through here.

export { PocBadge } from './lib/badge/poc-badge';
export { PocButton } from './lib/button/poc-button';
export { PocCard } from './lib/card/poc-card';
export { PocLineChart, type PocChartPoint } from './lib/line-chart/poc-line-chart';
export { PocTabs, type PocTab } from './lib/tabs/poc-tabs';
export {
  PocDataTable,
  type PocColumn,
  type PocRowContextMenu,
} from './lib/data-table/poc-data-table';
