import React from 'react';

interface CaseStatsChartProps {
  data: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   '#fbdcab',
  confirmed: '#dff3e7',
  cancelled: '#fbe4e2',
  completed: '#e7f2fd',
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  pending:   '#7a4f00',
  confirmed: '#1a6b3a',
  cancelled: '#8b1a14',
  completed: '#0d4a7a',
};

const CaseStatsChart: React.FC<CaseStatsChartProps> = ({ data }) => {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);

  return (
    <div className="chart-content">
      <div className="chart-pie">
        {Object.entries(data).map(([status, count]) => {
          const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
          const bg = STATUS_COLORS[status.toLowerCase()] || '#f0f0f0';
          const textColor = STATUS_TEXT_COLORS[status.toLowerCase()] || '#333';
          const label = status.charAt(0).toUpperCase() + status.slice(1);

          return (
            <div key={status} className="pie-item" title={`${percentage}%`}>
              <div
                className="pie-segment"
                style={{ backgroundColor: bg, color: textColor }}
                data-pct={`${percentage}%`}
              >
                <span className="pie-label">{label}</span>
                <span className="pie-count">{count}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CaseStatsChart;
