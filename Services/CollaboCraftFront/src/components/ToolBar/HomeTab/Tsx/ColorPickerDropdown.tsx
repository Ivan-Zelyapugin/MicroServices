import React from 'react';
import { colorPalette } from '../Ts/constants';

interface Props {
  onSelect: (color: string) => void;
}

export const ColorPickerDropdown: React.FC<Props> = ({ onSelect }) => {
  return (
    <div
      className="absolute z-50 bg-white border rounded shadow p-2 grid grid-cols-5 gap-1"
      style={{ width: 220 }}
    >
      {colorPalette.flat().map((color) => (
        <button
          key={color}
          onClick={() => onSelect(color)}
          className="w-6 h-6 rounded"
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
};