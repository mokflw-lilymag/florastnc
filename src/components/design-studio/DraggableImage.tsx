'use client';

import React, { useRef, useState } from 'react';
import { useEditorStore } from '@/stores/design-store';
import { Image as ImageIcon, X } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

interface DraggableImageProps {
  id: string;
  url: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  isPrintable: boolean;
  isSelected: boolean;
  zoom: number;
  rotation?: number;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const DraggableImage: React.FC<DraggableImageProps> = ({
  id,
  url,
  x,
  y,
  width,
  height,
  isPrintable,
  isSelected,
  zoom,
  rotation,
  onContextMenu
}) => {
  const { 
    setSelectedBlockId, 
    toggleBlockSelection,
    removeImageBlock 
  } = useEditorStore();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
    data: { id, url, x, y, width, height, isPrintable, isSelected, zoom, rotation },
  });

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${x * zoom}px`,
    top: `${y * zoom}px`,
    width: `${width * zoom}px`,
    height: `${height * zoom}px`,
    cursor: isDragging ? 'grabbing' : 'grab',
    border: transform ? '1px dashed transparent' : (isSelected ? '2px solid #3b82f6' : '1px dashed transparent'),
    transform: `translate3d(${transform?.x || 0}px, ${transform?.y || 0}px, 0) rotate(${rotation || 0}deg)`,
    transformOrigin: 'top left',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    boxSizing: 'content-box',
    overflow: 'visible',
    zIndex: isSelected ? 50 : 10
  };

  return (
    <div 
      ref={setNodeRef}
      style={style} 
      {...listeners}
      {...attributes}
      onContextMenu={onContextMenu}
      onClick={(e) => {
        e.stopPropagation();
        if (e.shiftKey) toggleBlockSelection(id);
        else setSelectedBlockId(id);
      }}
      className={transform ? 'bg-white/50 rounded shadow-lg' : 'hover:border-blue-300 rounded'}
    >
      {url ? (
        <img 
          src={url} 
          alt="User logo" 
          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
          draggable={false}
        />
      ) : (
        <div className={`w-full h-full flex flex-col items-center justify-center p-2 rounded-md ${isSelected ? 'bg-blue-50' : 'bg-gray-100'} border-2 border-dashed ${isSelected ? 'border-blue-300' : 'border-gray-300'}`}>
          <ImageIcon className={`${isSelected ? 'text-blue-400' : 'text-gray-400'} mb-1`} size={16} />
          <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">로고 자리</span>
          {!isPrintable && (
            <span className="text-[8px] text-red-400 font-bold mt-1 uppercase">화면 표시용</span>
          )}
        </div>
      )}

      {isSelected && !isDragging && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeImageBlock(id);
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition z-50"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
};


