import React from 'react';

type TooltipProps = {
  text: string;
  children: React.ReactNode;
};

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  return <span title={text}>{children}</span>;
};

export default Tooltip;
