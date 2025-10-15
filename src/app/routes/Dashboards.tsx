import React from 'react';

const Dashboards: React.FC = () => {
  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Dashboards</h2>
        <p className="text-muted-foreground">Analytics and visualizations</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 border border-border rounded-lg">
          <h3 className="font-medium mb-2">Log Volume</h3>
          <p className="text-sm text-muted-foreground">Coming soon...</p>
        </div>
        
        <div className="p-6 border border-border rounded-lg">
          <h3 className="font-medium mb-2">Error Rate</h3>
          <p className="text-sm text-muted-foreground">Coming soon...</p>
        </div>
        
        <div className="p-6 border border-border rounded-lg">
          <h3 className="font-medium mb-2">Top Files</h3>
          <p className="text-sm text-muted-foreground">Coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboards;