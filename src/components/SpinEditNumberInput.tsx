import React, { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

interface SpinEditNumberInputProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  quickValues?: number[];
  unitLabel?: string;
}

export const SpinEditNumberInput: React.FC<SpinEditNumberInputProps> = ({
  value,
  onChange,
  min = 1,
  max = 1000,
  step = 1,
  disabled = false,
  quickValues,
  unitLabel = 'units'
}) => {
  const [inputValue, setInputValue] = useState<string>(String(value));

  // Sync internal input string when external value changes
  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const handleDecrement = () => {
    if (disabled) return;
    const next = Math.max(min, value - step);
    onChange(next);
    setInputValue(String(next));
  };

  const handleIncrement = () => {
    if (disabled) return;
    const next = Math.min(max, value + step);
    onChange(next);
    setInputValue(String(next));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strictly strip non-digits to disallow decimal points (.), negative signs (-), and commas (,)
    const cleanDigits = e.target.value.replace(/\D/g, '');
    setInputValue(cleanDigits);

    if (cleanDigits !== '') {
      const parsed = parseInt(cleanDigits, 10);
      if (!Number.isNaN(parsed)) {
        // Update parent live if within bounds or valid number
        const clamped = Math.max(min, Math.min(max, parsed));
        onChange(clamped);
      }
    }
  };

  const handleBlur = () => {
    if (inputValue === '' || Number.isNaN(parseInt(inputValue, 10))) {
      onChange(min);
      setInputValue(String(min));
      return;
    }
    const parsed = parseInt(inputValue, 10);
    const clamped = Math.max(min, Math.min(max, parsed));
    onChange(clamped);
    setInputValue(String(clamped));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Strict block of decimal points, commas, exponent 'e', and +/- signs
    if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
      return;
    }

    // Keyboard navigation: ArrowUp increments, ArrowDown decrements
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
    } else if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {/* Spin Edit Control Bar */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1.5px solid #CBD5E1',
        borderRadius: 'var(--radius-lg)',
        background: '#FFFFFF',
        overflow: 'hidden',
        height: 46,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        width: '100%',
        maxWidth: 240,
        transition: 'border-color 0.15s ease'
      }}>
        {/* Minus Button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          style={{
            width: 46,
            height: '100%',
            border: 'none',
            borderRight: '1px solid #E2E8F0',
            background: value <= min || disabled ? '#F8FAFC' : '#F1F5F9',
            color: value <= min || disabled ? '#94A3B8' : '#0F172A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: value <= min || disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
          title="Decrease quantity"
          aria-label="Decrease quantity"
        >
          <Minus size={18} strokeWidth={2.5} />
        </button>

        {/* Integer Input (Direct whole number entry, no decimals) */}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={String(min)}
          style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            border: 'none',
            textAlign: 'center',
            fontSize: '1.15rem',
            fontWeight: 800,
            color: '#0F172A',
            background: disabled ? '#F8FAFC' : '#FFFFFF',
            outline: 'none',
            padding: '0 6px'
          }}
        />

        {/* Plus Button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          style={{
            width: 46,
            height: '100%',
            border: 'none',
            borderLeft: '1px solid #E2E8F0',
            background: value >= max || disabled ? '#F8FAFC' : '#F1F5F9',
            color: value >= max || disabled ? '#94A3B8' : '#0F172A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: value >= max || disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
          title="Increase quantity"
          aria-label="Increase quantity"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Quick Integer Preset Pills */}
      {quickValues && quickValues.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {quickValues.map((quickVal) => {
            const isSelected = value === quickVal;
            return (
              <button
                type="button"
                key={quickVal}
                onClick={() => {
                  onChange(quickVal);
                  setInputValue(String(quickVal));
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected ? '1.5px solid #2C82C9' : '1px solid #CBD5E1',
                  background: isSelected ? '#EDF4FA' : '#FFFFFF',
                  color: isSelected ? '#2C82C9' : '#475569',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {quickVal} {unitLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
