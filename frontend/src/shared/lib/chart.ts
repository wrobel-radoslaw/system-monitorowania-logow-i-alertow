import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';

// Chart.js registration + dark defaults. Any component that renders a chart (react-chartjs-2)
// must `import '@/shared/lib/chart'` so this runs first. It is not imported in main.tsx so that
// Chart.js stays out of the initial bundle.
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Legend,
  Title,
  Tooltip,
);

// Dark defaults matching the design tokens.
Chart.defaults.color = '#A1A1A1';
Chart.defaults.borderColor = '#1F1F1F';
Chart.defaults.backgroundColor = '#089925';
Chart.defaults.font.family =
  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif";
Chart.defaults.animation = false;
Chart.defaults.elements.bar.borderRadius = 0;
Chart.defaults.plugins.tooltip.cornerRadius = 0;
Chart.defaults.plugins.tooltip.backgroundColor = '#000000';
Chart.defaults.plugins.tooltip.borderColor = '#1F1F1F';
Chart.defaults.plugins.tooltip.borderWidth = 1;

export { Chart };
