import React from 'react';

const SavedViews: React.FC = () => {
  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Saved Views</h2>
        <p className="text-muted-foreground">Manage your saved queries and filters</p>
      </div>
      
      <div className="text-center py-12">
        <p className="text-muted-foreground">No saved views yet</p>
        <p className="text-sm text-muted-foreground">Save a search from the Discover page to get started</p>
      </div>
    </div>
  );
};

export default SavedViews;