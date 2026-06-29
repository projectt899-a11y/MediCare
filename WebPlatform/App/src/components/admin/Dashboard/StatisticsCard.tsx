import React from 'react';

interface StatisticsCardProps {
  title: string;
  value: number;
  icon: string;       // emoji OR Font Awesome class e.g. "fa-solid fa-users"
  color: 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'red' | 'yellow';
}

const isFaIcon = (icon: string) => icon.startsWith('fa-') || icon.startsWith('fas ') || icon.startsWith('fa-solid') || icon.startsWith('fa-regular');

const StatisticsCard: React.FC<StatisticsCardProps> = ({ title, value, icon, color }) => {
  return (
    <div className={`statistics-card ${color}`}>
      <div className="card-icon">
        {isFaIcon(icon)
          ? <i className={icon}></i>
          : icon}
      </div>
      <div className="card-content">
        <h4 className="card-title">{title}</h4>
        <p className="card-value">{value.toLocaleString()}</p>
      </div>
    </div>
  );
};

export default StatisticsCard;
