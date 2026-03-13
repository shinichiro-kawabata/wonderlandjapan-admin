
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  icon,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between pl-12 md:pl-16 pr-6 md:pr-8 py-3 md:py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] md:rounded-[2.5rem] text-xs md:text-sm font-bold outline-none focus:border-slate-900 shadow-inner transition-luxury text-left group"
      >
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400 group-hover:text-slate-900 transition-colors">
            {selectedOption?.icon || icon}
          </div>
          <span className={selectedOption ? 'text-slate-900' : 'text-slate-400'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-[100] w-[calc(100%-2rem)] left-4 mt-2 glass border border-white/20 rounded-[1.5rem] md:rounded-[2rem] shadow-luxury overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto no-scrollbar py-2">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-6 md:px-8 py-3 md:py-4 text-[10px] md:text-xs font-bold transition-luxury hover:bg-white/30 ${
                    value === option.id ? 'text-slate-900 bg-white/20' : 'text-slate-500'
                  }`}
                >
                  <div className="flex items-center space-x-3 md:space-x-4">
                    {option.icon && <span className="w-4 h-4 md:w-5 md:h-5 opacity-70">{option.icon}</span>}
                    <span className="uppercase tracking-widest">{option.label}</span>
                  </div>
                  {value === option.id && <Check className="w-3 h-3 md:w-4 md:h-4 text-red-700" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
