import React from 'react';
import { useAppStore } from '@/store';

const FilterPills: React.FC = () => {
  const { query, removeFilter } = useAppStore();

  if (query.filters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {query.filters.map((filter, index) => (
        <div
          key={index}
          className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
        >
          <span>{filter.field}:{String(filter.value)}</span>
          <button
            onClick={() => removeFilter(index)}
            className="hover:bg-primary/20 rounded p-0.5"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default FilterPills;