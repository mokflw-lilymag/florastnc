'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { TextBlock, useEditorStore } from '@/stores/design-store';
import { X } from 'lucide-react';

interface DraggableTextProps extends TextBlock {
  isSelected: boolean;
  zoom: number;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const DraggableText: React.FC<DraggableTextProps> = (props) => {
  const { id, text, x, y, fontSize, colorHex, fontFamily, textAlign, zIndex, isSelected, zoom, rotation, textShadow } = props;
  const { setSelectedBlockId, toggleBlockSelection, removeTextBlock } = useEditorStore();

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
    data: props,
    disabled: props.isLocked, // Disable dragging if locked
  });

  // Calculate pixel values based on mm and zoom
  const left = x * zoom;
  const top = y * zoom;
  
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${rotation || 0}deg)`
      : `rotate(${rotation || 0}deg)`, // Top-left origin for precise dragging
    textAlign: textAlign || 'left',
    color: colorHex,
    fontSize: `${fontSize * (zoom / 3)}px`, // Match the mm scaling (3px per mm)
    fontFamily: fontFamily || 'sans-serif',
    textShadow: textShadow,
    WebkitTextStroke: props.strokeWidth ? `${props.strokeWidth}px ${props.strokeColor || '#000'}` : 'none',
    paintOrder: 'stroke fill', // [중요] 테두리를 먼저 그려서 글자 내부가 겹쳐 보이지 않게 함
    whiteSpace: 'pre-wrap',
    cursor: props.isLocked ? 'default' : 'grab',
    userSelect: 'none',
    opacity: props.opacity ?? 1,
    padding: `${8 * (zoom / 3)}px`, // Larger padding for easier grabbing
    border: transform ? `${2 * (zoom / 3)}px dashed #3b82f6` : (isSelected ? `${2 * (zoom / 3)}px solid #3b82f6` : '1px solid transparent'),
    borderRadius: '4px',
    width: props.width ? `${props.width * zoom}px` : 'max-content',
    lineHeight: props.lineHeight ?? 1.6,
    wordBreak: 'keep-all',
    minWidth: '20px',
    boxSizing: 'border-box',
    transition: 'opacity 0.2s ease',
    // Ensure selected text is always on top for easier movement
    zIndex: isSelected ? 999 : (zIndex || 10), 
  };

  const uiScale = Math.max(0.6, Math.min(1.5, zoom / 3));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(props.isLocked ? {} : listeners)}
      {...(props.isLocked ? {} : attributes)}
      onContextMenu={props.onContextMenu}
      onClick={(e) => {
        e.stopPropagation();
        if (e.shiftKey) {
          toggleBlockSelection(id);
        } else {
          setSelectedBlockId(id);
        }
      }}
      className={transform ? 'bg-white/50 rounded z-50 shadow-lg' : 'hover:border-blue-300 rounded z-10'}
    >
      {isSelected && !props.isLocked && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeTextBlock(id);
          }}
          style={{
            width: `${20 * uiScale}px`,
            height: `${20 * uiScale}px`,
            top: `-${10 * uiScale}px`,
            right: `-${10 * uiScale}px`
          }}
          className="absolute bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition z-50"
        >
          <X size={12 * uiScale} />
        </button>
      )}
      {text}
    </div>
  );
};


