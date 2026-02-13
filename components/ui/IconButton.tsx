import React from 'react';

type IconButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  isActive?: boolean;
  title?: string;
  className?: string;
};

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  onClick,
  disabled,
  isActive,
  title,
  className = ''
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      aria-label={label}
      aria-pressed={isActive}
      className={`ui-icon-button ${isActive ? 'is-active' : ''} ${className}`.trim()}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};

export default IconButton;
