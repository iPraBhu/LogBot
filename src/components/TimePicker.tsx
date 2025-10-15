import React from 'react';

const TimePicker: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <select className="px-3 py-1 border border-input rounded text-sm bg-background">
        <option>Last 15 minutes</option>
        <option>Last 1 hour</option>
        <option>Last 4 hours</option>
        <option>Last 24 hours</option>
        <option>Last 7 days</option>
        <option>Custom range</option>
      </select>
    </div>
  );
};

export default TimePicker;