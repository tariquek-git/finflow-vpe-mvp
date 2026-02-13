import React from 'react';

type SectionHeaderProps = {
  title: string;
  rightSlot?: React.ReactNode;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, rightSlot }) => {
  return (
    <div className="ui-section-header">
      <h3 className="ui-section-title">{title}</h3>
      {rightSlot}
    </div>
  );
};

export default SectionHeader;
