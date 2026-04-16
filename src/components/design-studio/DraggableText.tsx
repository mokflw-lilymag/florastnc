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

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
    data: props,
    disabled: props.isLocked || isEditing,
  });

  // Calculate pixel values based on mm and zoom
  const left = x * zoom;
  const top = y * zoom;
  
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    transform: `translate3d(${transform?.x || 0}px, ${transform?.y || 0}px, 0) ` +
               `translate(${textAlign === 'center' ? '-50%' : textAlign === 'right' ? '-100%' : '0'}, -50%) ` +
               `rotate(${rotation || 0}deg)`,
    transformOrigin: 'center center',
    textAlign: textAlign || 'left',
    color: colorHex,
    fontSize: `${fontSize * (zoom / 3)}px`, 
    fontFamily: fontFamily || 'sans-serif',
    textShadow: textShadow,
    WebkitTextStroke: props.strokeWidth ? `${props.strokeWidth}px ${props.strokeColor || '#000'}` : 'none',
    paintOrder: 'stroke fill',
    whiteSpace: 'pre-wrap',
    cursor: isEditing ? 'text' : (props.isLocked ? 'default' : 'grab'),
    userSelect: isEditing ? 'auto' : 'none',
    opacity: props.opacity ?? 1,
    // [교정] 편집 중에는 테두리도 제거하여 완전히 심리스하게 만듦
    border: isEditing ? '1px solid transparent' : (transform ? `${2 * (zoom / 3)}px dashed #3b82f6` : (isSelected ? `${2 * (zoom / 3)}px solid #3b82f6` : '1px solid transparent')),
    backgroundColor: 'transparent', 
    boxShadow: 'none',
    padding: '0', 
    borderRadius: '4px',
    width: props.width ? `${props.width * zoom}px` : 'max-content',
    lineHeight: props.lineHeight ?? 1.6,
    wordBreak: 'keep-all',
    minWidth: '40px',
    boxSizing: 'border-box',
    transition: 'opacity 0.2s ease, border-color 0.2s ease',
    zIndex: isSelected ? 999 : (zIndex || 10), 
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
        <button
          onClick={(e) => { e.stopPropagation(); removeTextBlock(id); }}
          style={{ width: `${20 * uiScale}px`, height: `${20 * uiScale}px`, top: `-${10 * uiScale}px`, right: `-${10 * uiScale}px` }}
          className="absolute bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition z-50"
        >
          <X size={12 * uiScale} />
        </button>
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
            background: 'transparent', // 인라인 스타일로 한 번 더 강제 투명화
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


