'use client';

import React, { useRef, useState } from 'react';
import { useEditorStore } from '@/stores/design-store';
import { Image as ImageIcon, X } from 'lucide-react';

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
    updateImageBlockPosition, 
    setSelectedBlockId, 
    toggleBlockSelection,
    selectedBlockIds,
    moveSelectedBlocks,
    removeImageBlock 
  } = useEditorStore();
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.shiftKey) {
      toggleBlockSelection(id);
    } else {
      setSelectedBlockId(id);
    }

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - x * zoom,
      y: e.clientY - y * zoom,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const currentX = (e.clientX - dragStartRef.current.x) / zoom;
    const currentY = (e.clientY - dragStartRef.current.y) / zoom;
    
    const dx = currentX - x;
    const dy = currentY - y;
    
    if (selectedBlockIds.includes(id)) {
      moveSelectedBlocks(dx, dy);
    } else {
      updateImageBlockPosition(id, currentX, currentY);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${x * zoom}px`,
    top: `${y * zoom}px`,
    width: `${width * zoom}px`,
    height: `${height * zoom}px`,
    cursor: isDragging ? 'grabbing' : 'grab',
    border: isSelected ? '2px solid #3b82f6' : '1px dashed transparent',
    transform: `translate(-50%, -50%) rotate(${rotation || 0}deg)`, // Center anchored
    transformOrigin: 'center center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    boxSizing: 'content-box',
    overflow: 'visible',
    zIndex: 50
  };

  return (
    <div style={style} onMouseDown={handleMouseDown} onContextMenu={onContextMenu}>
      {url ? (
        <img 
          src={url} 
          alt="User logo" 
          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
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

      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeImageBlock(id);
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
};


