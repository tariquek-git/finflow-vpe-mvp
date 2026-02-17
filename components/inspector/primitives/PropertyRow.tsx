import React from 'react';

type PropertyRowProps = {
  label: string;
  htmlFor?: string;
  helper?: string;
  helperId?: string;
  children?: React.ReactNode;
};

const PropertyRow: React.FC<PropertyRowProps> = ({ label, htmlFor, helper, helperId, children }) => {
  return (
    <div className="inspector-field">
      <label className="inspector-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {helper ? (
        <span id={helperId} className="inspector-helper">
          {helper}
        </span>
      ) : null}
    </div>
  );
};

export default React.memo(PropertyRow);
