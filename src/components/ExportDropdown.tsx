import React, { useState, useRef, useEffect } from 'react';
import './ExportDropdown.css';

interface ExportDropdownProps {
  onExportSTL: () => void;
  onExportGeneric3MF: () => void;
  onExportPrusa3MF: () => void;
  onExportBambu3MF: () => void;
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({ 
  onExportSTL, 
  onExportGeneric3MF, 
  onExportPrusa3MF,
  onExportBambu3MF 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="export-dropdown" ref={dropdownRef}>
      <button 
        className="export-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        Export
      </button>
      {isOpen && (
        <div className="dropdown-content">
          <button onClick={() => {
            onExportSTL();
            setIsOpen(false);
          }}>
            Export STL
          </button>
          <button onClick={() => {
            onExportGeneric3MF();
            setIsOpen(false);
          }}>
            Export 3MF (Generic)
          </button>
          <button onClick={() => {
            onExportPrusa3MF();
            setIsOpen(false);
          }}>
            Export 3MF (PrusaSlicer)
          </button>
          <button onClick={() => {
            onExportBambu3MF();
            setIsOpen(false);
          }}>
            Export 3MF (Bambu Studio)
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportDropdown;
