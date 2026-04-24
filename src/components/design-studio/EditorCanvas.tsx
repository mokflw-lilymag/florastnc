'use client';

import React from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  useSensor, 
  useSensors, 
  PointerSensor 
} from '@dnd-kit/core';
import { useEditorStore } from '@/stores/design-store';
import { DraggableText } from './DraggableText';
import { DraggableImage } from './DraggableImage';
import { Trash2, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const EditorCanvas: React.FC = () => {
  const { 
    currentDimension, 
    textBlocks, 
    imageBlocks,
    zoom,
    updateTextBlockPosition, 
    updateImageBlockPosition,
    setSelectedBlockId,
    backgroundUrl,
    frontBackgroundUrl,
    backBackgroundUrl,
    margins,
    selectedBlockId,
    foldType,
    showFoldingGuide,
    orientation,
    activePage,
    removeTextBlock,
    removeImageBlock,
    selectedBlockIds,
    toggleBlockSelection,
    moveSelectedBlocks,
    isGenerating // 추가: 구조 분해 할당으로 꺼내오기
  } = useEditorStore();

  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
    visible: boolean;
    targetId: string;
    type: 'text' | 'image';
  }>({ x: 0, y: 0, visible: false, targetId: '', type: 'text' });

  const handleContextMenu = (e: React.MouseEvent, id: string, type: 'text' | 'image') => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate position relative to the container
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visible: true,
      targetId: id,
      type
    });
    
    setSelectedBlockId(id);
  };

  // Close context menu on click anywhere
  React.useEffect(() => {
    const closeMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (active && delta) {
      const blockId = active.id as string;
      
      // [정밀 보정] 줌 배율을 고려하여 실제 mm 단위 이동량을 소수점까지 계산
      // (캡틴: 이제 글자가 마우스를 놓는 순간 튀지 않고 정확히 그 자리에 안착합니다!)
      const dx = delta.x / zoom;
      const dy = delta.y / zoom;

      // 1mm 이하의 아주 미세한 움직임은 무시하지 않고 그대로 반영하여 정밀도 향상
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;

      if (selectedBlockIds.includes(blockId)) {
        moveSelectedBlocks(dx, dy);
      } else {
        const tBlock = textBlocks.find(b => b.id === blockId);
        const iBlock = imageBlocks.find(b => b.id === blockId);
        
        if (tBlock) {
          updateTextBlockPosition(blockId, tBlock.x + dx, tBlock.y + dy);
        } else if (iBlock) {
          updateImageBlockPosition(blockId, iBlock.x + dx, iBlock.y + dy);
        }
      }
    }
  };

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.altKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const currentZoom = useEditorStore.getState().zoom;
        const newZoom = Math.max(1, Math.min(10, currentZoom + delta));
        useEditorStore.getState().setZoom(newZoom);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // mm 단위를 줌 배수를 적용하여 화면 표시
  const canvasWidthPx = currentDimension.widthMm * zoom;
  const canvasHeightPx = currentDimension.heightMm * zoom;

  const isLandscape = orientation === 'landscape';

  // Add sensor to distinguish clicks from drags (solves hard selection issue)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // minimum 5px move before a drag starts
      },
    })
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div 
        ref={containerRef}
        className={`flex-1 w-full flex justify-center items-center p-3 sm:p-8 lg:p-12 ${isFullscreen ? 'bg-slate-200/90' : 'bg-slate-100 rounded-2xl sm:rounded-[40px] shadow-inner'} overflow-auto relative group transition-all min-h-[200px]`}
      >
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-[90] p-2.5 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm text-slate-500 hover:text-indigo-600 hover:scale-110 transition-all border border-slate-200"
          title={isFullscreen ? "원래 화면으로 축소" : "전체 모니터 꽉 차게 보기"}
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div
            onClick={() => useEditorStore.getState().setSelectedBlockId(null)}
            style={{
              position: 'relative',
              width: `${canvasWidthPx}px`,
              height: `${canvasHeightPx}px`,
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15), 0 0 10px rgba(0,0,0,0.03)',
              overflow: 'hidden',
              // [추가] 정밀 작업용 mm 그리드 배경
              backgroundImage: `
                linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px),
                linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)
              `,
              backgroundSize: `
                ${zoom}px ${zoom}px,
                ${zoom}px ${zoom}px,
                ${zoom * 10}px ${zoom * 10}px,
                ${zoom * 10}px ${zoom * 10}px
              `,
            }}
            className="ring-1 ring-slate-900/5 transition-all duration-300"
          >
            {/* Background Layers */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, display: 'flex', flexDirection: isLandscape ? 'row' : 'column', backgroundColor: '#ffffff' }}>
              {foldType === 'half' ? (
                // 접이식 카드
                activePage === 'outside' ? (
                  // 표지: 실제 앞면/뒷면 배경 출력
                  <>
                    <div style={{ 
                      flex: 1, 
                      backgroundImage: backBackgroundUrl ? `url('${backBackgroundUrl}')` : undefined, 
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: '#f8fafc',
                      borderRight: isLandscape ? '1px solid rgba(0,0,0,0.05)' : 'none',
                      borderBottom: !isLandscape ? '1px solid rgba(0,0,0,0.05)' : 'none'
                    }} />
                    <div style={{ 
                      flex: 1, 
                      backgroundImage: frontBackgroundUrl ? `url('${frontBackgroundUrl}')` : undefined, 
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: '#f1f5f9',
                      position: 'relative'
                    }} />
                  </>
                ) : (
                  // 내지: 깨끗한 배경 혹은 내지용 배경(backgroundUrl) 출력
                  <div style={{ 
                    flex: 1, 
                    backgroundImage: backgroundUrl ? `url('${backgroundUrl}')` : 'none',
                    backgroundColor: backgroundUrl ? 'transparent' : '#ffffff',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative'
                  }}>
                     <div className="absolute top-2 left-2 text-[8px] font-black text-gray-200 uppercase tracking-widest z-[10]">Inside Page</div>
                  </div>
                )
              ) : (
                // 일반 카드 (Flat)
                <div style={{ 
                  flex: 1, 
                  backgroundImage: backgroundUrl ? `url('${backgroundUrl}')` : undefined, 
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: '#f8fafc'
                }} />
              )}
            </div>

            {/* Margin Guides */}
            {activePage === 'inside' && foldType === 'half' ? (
              <>
                {/* First Page Safe Area (Left for Landscape, Top for Portrait) */}
                <div 
                  style={{
                    position: 'absolute',
                    top: `${margins.top * zoom}px`,
                    left: `${margins.left * zoom}px`,
                    width: isLandscape ? `${(currentDimension.widthMm / 2 - margins.left) * zoom}px` : undefined,
                    right: isLandscape ? undefined : `${margins.right * zoom}px`,
                    height: !isLandscape ? `${(currentDimension.heightMm / 2 - margins.top) * zoom}px` : undefined,
                    bottom: isLandscape ? `${margins.bottom * zoom}px` : undefined,
                    border: '1px dashed rgba(59, 130, 246, 0.4)',
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                />
                {/* Second Page Safe Area (Right for Landscape, Bottom for Portrait) */}
                <div 
                  style={{
                    position: 'absolute',
                    top: isLandscape ? `${margins.top * zoom}px` : `${(currentDimension.heightMm / 2) * zoom}px`,
                    left: isLandscape ? `${(currentDimension.widthMm / 2) * zoom}px` : `${margins.left * zoom}px`,
                    right: `${margins.right * zoom}px`,
                    bottom: `${margins.bottom * zoom}px`,
                    border: '1px dashed rgba(59, 130, 246, 0.4)',
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                />
              </>
            ) : activePage === 'inside' ? (
              <div 
                style={{
                  position: 'absolute',
                  top: `${margins.top * zoom}px`,
                  left: `${margins.left * zoom}px`,
                  right: `${margins.right * zoom}px`,
                  bottom: `${margins.bottom * zoom}px`,
                  border: '1px dashed rgba(59, 130, 246, 0.3)',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              />
            ) : null}
            {textBlocks.map(block => (
              <DraggableText 
                key={block.id} 
                {...block} 
                isSelected={selectedBlockIds.includes(block.id)}
                zoom={zoom}
                onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, block.id, 'text')}
              />
            ))}

            {imageBlocks.map(block => (
              <DraggableImage 
                key={block.id} 
                {...block} 
                isSelected={selectedBlockIds.includes(block.id)}
                zoom={zoom}
                onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, block.id, 'image')}
              />
            ))}

            {/* 접지 가이드 (Fold Line Only) */}
            {foldType === 'half' && showFoldingGuide && (
              <div 
                style={{
                  position: 'absolute',
                  left: isLandscape ? '50%' : 0,
                  top: !isLandscape ? '50%' : 0,
                  right: 0,
                  bottom: 0,
                  width: isLandscape ? '1px' : '100%',
                  height: !isLandscape ? '1px' : '100%',
                  borderLeft: isLandscape ? '1px dashed #d1d5db' : undefined,
                  borderTop: !isLandscape ? '1px dashed #d1d5db' : undefined,
                  pointerEvents: 'none',
                  zIndex: 5
                }}
              />
            )}

            {/* AI Generation Loading Overlay - Improved Visual Feedback */}
            {isGenerating && (
              <div className="absolute inset-0 z-[100] bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="text-indigo-600 animate-pulse" size={24} />
                  </div>
                </div>
                <div className="mt-4 flex flex-col items-center gap-1">
                  <p className="text-sm font-black text-indigo-900 tracking-tighter animate-bounce">AI 아티스트가 그리는 중...</p>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest opacity-60">Masterpiece in progress</p>
                </div>
              </div>
            )}
          </div>
        </DndContext>
      </div>

      {/* Context Menu Overlay */}
      {contextMenu.visible && (
        <div 
          className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            left: `${contextMenu.x}px`, 
            top: `${contextMenu.y}px`,
            minWidth: '120px'
          }}
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (contextMenu.type === 'text') removeTextBlock(contextMenu.targetId);
              else removeImageBlock(contextMenu.targetId);
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
            className="w-full px-4 py-3 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors text-xs font-bold"
          >
            <Trash2 size={14} />
            삭제하기
          </button>
        </div>
      )}

      {/* 하단 영역 안내 레이블 (캔버스 밖으로 이동) */}
      {foldType === 'half' && showFoldingGuide && (
        <div 
          className="flex mx-auto" 
          style={{ 
            width: `${canvasWidthPx}px`, 
            flexDirection: isLandscape ? 'row' : 'column',
            marginTop: '-10px' // p-8로 인한 간격 조정
          }}
        >
          <div className="flex-1 flex items-center justify-center p-2">
            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
              {activePage === 'outside' ? '뒷면 (BACK)' : isLandscape ? '내지 왼쪽' : '내지 위쪽'}
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center p-2 border-l border-gray-100" style={{ borderLeft: isLandscape ? '1px solid #f3f4f6' : 'none', borderTop: !isLandscape ? '1px solid #f3f4f6' : 'none' }}>
            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
              {activePage === 'outside' ? '앞면 (FRONT)' : isLandscape ? '내지 오른쪽' : '내지 아래쪽'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};


