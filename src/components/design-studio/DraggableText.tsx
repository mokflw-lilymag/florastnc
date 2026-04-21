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
  const { setSelectedBlockId, toggleBlockSelection, removeTextBlock, updateTextBlockContent } = useEditorStore();
  
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingText, setEditingText] = React.useState(text);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // 자동 높이 조절 로직
  React.useLayoutEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, editingText]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!props.isLocked) {
      setIsEditing(true);
      setEditingText(text);
      setSelectedBlockId(id);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editingText !== text) {
      updateTextBlockContent(id, { text: editingText });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) { 
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditingText(text);
    }
  };

  const [isResizing, setIsResizing] = React.useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
    data: props,
    disabled: props.isLocked || isEditing || isResizing, // 리사이징 중에는 이동(Drag) 비활성화
  });

  // Calculate pixel values based on mm and zoom
  const left = x * zoom;
  const top = y * zoom;
  
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    transform: `translate3d(${transform?.x || 0}px, ${transform?.y || 0}px, 0) ` +
               `rotate(${rotation || 0}deg)`,
    transformOrigin: 'top left', // 기준점을 왼쪽 상단으로 고정
    textAlign: textAlign || 'left',
    color: colorHex,
    fontSize: `${fontSize * (zoom / 3)}px`, 
    fontFamily: fontFamily || 'sans-serif',
    textShadow: textShadow,
    WebkitTextStrokeWidth: props.strokeWidth ? `${props.strokeWidth}px` : '0',
    WebkitTextStrokeColor: props.strokeColor && props.strokeColor !== 'transparent' ? props.strokeColor : '#000000',
    paintOrder: 'stroke fill',
    whiteSpace: 'pre-wrap',
    cursor: isEditing ? 'text' : (props.isLocked ? 'default' : 'grab'),
    userSelect: isEditing ? 'auto' : 'none',
    opacity: props.opacity ?? 1,
    border: isEditing ? '1px solid transparent' : (transform ? `${2 * (zoom / 3)}px dashed #3b82f6` : (isSelected ? `${2 * (zoom / 3)}px solid #3b82f6` : '1px solid transparent')),
    backgroundColor: 'transparent', 
    boxShadow: 'none',
    padding: '0', 
    borderRadius: '4px',
    width: props.width ? `${props.width * zoom}px` : 'max-content',
    minHeight: '10px',
    lineHeight: props.lineHeight ?? 1.6,
    letterSpacing: props.letterSpacing ? `${props.letterSpacing * zoom}px` : 'normal',
    wordBreak: 'keep-all',
    minWidth: '20px',
    boxSizing: 'border-box',
    transition: (isEditing || transform) ? 'none' : 'opacity 0.2s ease, border-color 0.2s ease',
    zIndex: isSelected ? 50 : (zIndex || 10), 
  };

  const uiScale = Math.max(0.6, Math.min(1.5, zoom / 3));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isEditing || props.isLocked ? {} : listeners)}
      {...(isEditing || props.isLocked ? {} : attributes)}
      onContextMenu={props.onContextMenu}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        e.stopPropagation();
        if (e.shiftKey) toggleBlockSelection(id);
        else setSelectedBlockId(id);
      }}
      className={transform ? 'bg-white/50 rounded z-50 shadow-lg' : 'hover:border-blue-300 rounded z-10'}
    >
      {isSelected && !props.isLocked && !isEditing && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); removeTextBlock(id); }}
            style={{ width: `${20 * uiScale}px`, height: `${20 * uiScale}px`, top: `-${10 * uiScale}px`, right: `-${10 * uiScale}px` }}
            className="absolute bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition z-50"
          >
            <X size={12 * uiScale} />
          </button>

          {/* 리사이즈 핸들 (우측 하단) */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsResizing(true); // 리사이징 시작 알림 (이동 기능 잠금)
              
              const startX = e.clientX;
              const startY = e.clientY;
              const startW = props.width || 100;
              const startH = props.height || 10;
              
              const onMouseMove = (moveEvent: MouseEvent) => {
                const deltaXMm = (moveEvent.clientX - startX) / zoom;
                const deltaYMm = (moveEvent.clientY - startY) / zoom;
                updateTextBlockContent(id, { 
                  width: Math.max(20, startW + deltaXMm),
                  height: Math.max(5, startH + deltaYMm)
                });
              };
              
              const onMouseUp = () => {
                setIsResizing(false); // 리사이징 종료 (이동 기능 해제)
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
              };
              
              window.addEventListener('mousemove', onMouseMove);
              window.addEventListener('mouseup', onMouseUp);
            }}
            style={{ width: `${12 * uiScale}px`, height: `${12 * uiScale}px`, bottom: `-${6 * uiScale}px`, right: `-${6 * uiScale}px` }}
            className="absolute bg-blue-600 border-2 border-white cursor-nwse-resize shadow-md hover:scale-125 transition-transform z-[100] rounded-full"
          />
        </>
      )}
      
      {isEditing ? (
        <textarea
          ref={textareaRef}
          autoFocus
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent border-none outline-none resize-none p-0 overflow-hidden block"
          style={{ 
            color: 'inherit', 
            fontSize: 'inherit', 
            fontFamily: 'inherit',
            textAlign: 'inherit',
            lineHeight: 'inherit',
            background: 'transparent',
            boxShadow: 'none',
            outline: 'none'
          }}
        />
      ) : (
        text
      )}
    </div>
  );
};


