import React, { useRef, useEffect } from 'react';
import { Command, CommandMode } from '../types';

interface CommandDropdownProps {
  commandMode: CommandMode;
  filteredCommands: Command[];
  selectedIndex: number;
  onExecuteCommand: (command: Command) => void;
}

export const CommandDropdown: React.FC<CommandDropdownProps> = ({
  commandMode,
  filteredCommands,
  selectedIndex,
  onExecuteCommand
}) => {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Ensure the currently selected command is scrolled into view
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <div 
      className="fixed w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto"
      style={{
        left: commandMode.coords?.x || 0,
        top: commandMode.coords?.y || 0,
      }}
    >
      <div className="p-2 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>💫</span>
          <span>Type to filter commands</span>
          <span className="ml-auto">ESC to cancel</span>
        </div>
      </div>
      
      {filteredCommands.length > 0 ? (
        <div className="py-1">
          {filteredCommands.map((command, index) => (
            <button
              key={command.id}
              onClick={() => onExecuteCommand(command)}
              ref={el => {
                itemRefs.current[index] = el;
              }}
              className={`w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{command.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm">
                    {command.label}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {command.description}
                  </div>
                </div>
                {index === selectedIndex && (
                  <div className="text-xs text-blue-600 font-medium">
                    ENTER
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-3 text-center text-gray-500 text-sm">
          <span>🔍</span>
          <p>No commands found for "{commandMode.query}"</p>
        </div>
      )}
      
      <div className="p-2 border-t border-gray-100 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          💡 Try: split, rename, duplicate, merge, clear
        </div>
      </div>
    </div>
  );
};

export default CommandDropdown; 