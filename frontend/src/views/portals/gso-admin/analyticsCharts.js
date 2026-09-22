import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Title, Tooltip, Legend, Filler
);

export const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 350 },
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11 } } },
    tooltip: { padding: 10, cornerRadius: 8 }
  }
};

export const forecastChartOptions = {
  ...baseChartOptions,
  interaction: { mode: 'index', intersect: false },
  scales: {
    x: { grid: { display: false }, ticks: { maxTicksLimit: 12, font: { size: 10 } } },
    y: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { precision: 0 } }
  }
};

export function buildForecastChartData(rows = [], fill = true) {
  return {
    labels: rows.map(item => item.date),
    datasets: [
      { label: 'Van history', data: rows.map(item => item.van_hist), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.10)', fill, tension: .3, spanGaps: true },
      { label: 'Facility history', data: rows.map(item => item.fac_hist), borderColor: '#059669', backgroundColor: 'rgba(5,150,105,.10)', fill, tension: .3, spanGaps: true },
      { label: 'Van projection', data: rows.map(item => item.van_fore), borderColor: '#2563eb', borderDash: [6, 5], backgroundColor: 'rgba(37,99,235,.35)', tension: .3, spanGaps: true },
      { label: 'Facility projection', data: rows.map(item => item.fac_fore), borderColor: '#059669', borderDash: [6, 5], backgroundColor: 'rgba(5,150,105,.35)', tension: .3, spanGaps: true }
    ]
  };
}
