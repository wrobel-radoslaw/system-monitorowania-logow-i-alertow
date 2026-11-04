import { Outlet } from 'react-router';
import { Tabs, type TabItem } from '@/shared/ui/Tabs';

const tabs: TabItem[] = [
  { to: '/ai/summaries', label: 'Summaries' },
  { to: '/ai/anomalies', label: 'Anomalies' },
  { to: '/ai/root-cause', label: 'Root Cause' },
  { to: '/ai/assistant', label: 'Assistant' },
];

export function AiLayout() {
  return (
    <>
      <Tabs label="AI Analysis" items={tabs} />
      <Outlet />
    </>
  );
}
