import { useState, useMemo, useRef, useEffect, type FC } from 'react';
import { ChevronUpDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SearchableSelectProps {
  options: { id: string; name: string }[];
  value: string;
  onChange: (value: { id: string; name: string } | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const SearchableSelect: FC<SearchableSelectProps> = ({ options, value, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: { id: string; name: string }) => {
    onChange(option);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={isOpen ? searchTerm : value}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          {value && !disabled && (
            <button type="button" onClick={handleClear} className="p-1 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
          <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {isOpen && !disabled && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <li key={option.id} onClick={() => handleSelect(option)} className="px-4 py-2 cursor-pointer hover:bg-blue-50">
                {option.name}
              </li>
            ))
          ) : (
            <li className="px-4 py-2 text-gray-500">Aucun résultat</li>
          )}
        </ul>
      )}
    </div>
  );
};