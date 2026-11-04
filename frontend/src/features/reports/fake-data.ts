// Fake data for designing the Raports page. There is no reports API yet.

export const fakeReports = [
  {
    name: 'Daily health digest',
    schedule: 'Every day · 08:00',
    description: 'Error rates, top incidents and AI summary for all services.',
    lastRun: 'today 08:00',
  },
  {
    name: 'Weekly SLA report',
    schedule: 'Mondays · 09:00',
    description: 'Availability and latency per service against SLO targets.',
    lastRun: 'Nov 2',
  },
  {
    name: 'Security events',
    schedule: 'Every day · 07:00',
    description: 'Failed logins, token anomalies and permission changes.',
    lastRun: 'today 07:00',
  },
  {
    name: 'Monthly cost & volume',
    schedule: '1st of month',
    description: 'Log volume per source and storage cost trend.',
    lastRun: 'Nov 1',
  },
];
