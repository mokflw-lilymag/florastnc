"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
    MessageCircle, X, Send, User, Building2, Clock, 
    ChevronRight, ChevronLeft, Bell, RefreshCw, Paperclip, Shield,
    Archive, History, Inbox, Info
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, parseISO, isAfter, addDays } from "date-fns";
import { toast } from "sonner";

export function QuickChat() {
    const supabase = createClient();
    const { tenantId, user, profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [rooms, setRooms] = useState<any[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [unreadRooms, setUnreadRooms] = useState<Set<string>>(new Set());
    const [showClosed, setShowClosed] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const selectedRoomRef = useRef<any>(null);

    const isSuperAdmin = profile?.role === 'super_admin';
    const ADMIN_TENANT_ID = "50551f4c-0b6b-45ab-8db9-047ca3ff88de";

    useEffect(() => {
        selectedRoomRef.current = selectedRoom;
        if (selectedRoom) {
            setUnreadRooms(prev => {
                const updated = new Set(prev);
                updated.delete(selectedRoom.id);
                return updated;
            });
        }
    }, [selectedRoom]);

    const fetchRooms = useCallback(async () => {
        if (!tenantId) return;
        
        const statusToFetch = showClosed ? 'closed' : 'active';
        const { data, error } = await supabase
            .from('chat_participants')
            .select(`
                room:chat_rooms!inner(
                    *, 
                    participants:chat_participants(tenant:tenants(name, logo_url)),
                    last_msg:chat_messages(content, created_at)
                )
            `)
            .eq('tenant_id', tenantId)
            .eq('room.status', statusToFetch);

        if (!error && data) {
            const sortedRooms = data.map((d: any) => {
                const r = d.room;
                const lastMessage = r.last_msg?.sort((a: any, b: any) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0];
                return { ...r, lastMessage };
            }).sort((a: any, b: any) => {
                const timeA = a.lastMessage?.created_at || a.created_at;
                const timeB = b.lastMessage?.created_at || b.created_at;
                return new Date(timeB).getTime() - new Date(timeA).getTime();
            });
            setRooms(sortedRooms);
        }
    }, [tenantId, supabase, showClosed]);

    const handleEndChat = async () => {
        if (!selectedRoom) return;
        try {
            const { error } = await supabase
                .from('chat_rooms')
                .update({ status: 'closed' })
                .eq('id', selectedRoom.id);
            
            if (error) throw error;
            
            toast.success("상담이 종료되었습니다.");
            setSelectedRoom(null);
            fetchRooms();
        } catch (err) {
            toast.error("상담 종료 실패");
        }
    };

    const fetchMessages = useCallback(async (roomId: string) => {
        const { data, error } = await supabase
            .from('chat_messages')
            .select(`*, sender_tenant:tenants(name, logo_url)`)
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setMessages(data);
            setTimeout(() => {
                const container = document.getElementById('chat-messages-container');
                const containerUser = document.getElementById('chat-messages-container-user');
                if (container) container.scrollTop = container.scrollHeight;
                if (containerUser) containerUser.scrollTop = containerUser.scrollHeight;
            }, 100);
        }
    }, [supabase]);

    useEffect(() => {
        if (isOpen && tenantId) {
            fetchRooms();
            
            const participantChannel = supabase
                .channel(`tenant-rooms-${tenantId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_participants',
                    filter: `tenant_id=eq.${tenantId}`
                }, () => {
                    fetchRooms();
                })
                .subscribe();

            const msgChannel = supabase
                .channel(`global-msgs-${tenantId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages'
                }, async (payload) => {
                    const msgRoomId = payload.new.room_id;
                    const isNewFromOther = payload.new.sender_id !== user?.id;

                    if (isNewFromOther) {
                        await supabase
                            .from('chat_rooms')
                            .update({ status: 'active' })
                            .eq('id', msgRoomId);
                        
                        fetchRooms();

                        if (selectedRoomRef.current?.id !== msgRoomId) {
                            setUnreadRooms(prev => new Set(prev).add(msgRoomId));
                            toast("새 문의가 도착했습니다", {
                                description: payload.new.content?.substring(0, 30),
                                action: {
                                    label: "열기",
                                    onClick: () => {
                                        supabase.from('chat_rooms')
                                          .select('*, participants:chat_participants(tenant:tenants(name, logo_url))')
                                          .eq('id', msgRoomId)
                                          .single()
                                          .then(({data}) => {
                                            if (data) setSelectedRoom(data);
                                        });
                                    }
                                }
                            });
                        }
                    } else {
                        fetchRooms();
                    }
                })
                .subscribe();

            return () => { 
                supabase.removeChannel(participantChannel); 
                supabase.removeChannel(msgChannel);
            };
        }
    }, [isOpen, tenantId, fetchRooms, supabase, user?.id]);

    useEffect(() => {
        if (selectedRoom) {
            fetchMessages(selectedRoom.id);
            const channel = supabase
                .channel(`chat-room-${selectedRoom.id}`)
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'chat_messages',
                    filter: `room_id=eq.${selectedRoom.id}`
                }, () => {
                    fetchMessages(selectedRoom.id);
                    fetchRooms();
                })
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [selectedRoom, fetchMessages, fetchRooms, supabase]);

    const handleSendMessage = async (imageUrl?: string) => {
        if (!inputValue.trim() && !imageUrl || !selectedRoom || !tenantId || !user) return;
        try {
            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    room_id: selectedRoom.id,
                    sender_id: user.id,
                    sender_tenant_id: tenantId,
                    content: inputValue.trim(),
                    image_url: imageUrl,
                    origin_url: window.location.href
                });
            if (error) throw error;
            setInputValue("");
        } catch (err) {
            toast.error("전송 실패");
        }
    };

    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 1024;
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else resolve(file);
                    }, 'image/jpeg', 0.7);
                };
            };
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tenantId) return;
        setLoading(true);
        try {
            // Wise Storage: Compress before upload
            const compressedBlob = await compressImage(file);
            const filePath = `${tenantId}/${Math.random()}.jpg`;
            const { error } = await supabase.storage.from('chat_attachments').upload(filePath, compressedBlob, {
                contentType: 'image/jpeg'
            });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('chat_attachments').getPublicUrl(filePath);
            await handleSendMessage(publicUrl);
        } catch (err) {
            toast.error("업로드 실패");
        } finally { setLoading(false); }
    };

    const startSupportChat = async () => {
        if (!tenantId || !user) return;
        setLoading(true);
        try {
            const { data: existing } = await supabase
                .from('chat_rooms')
                .select('*, participants:chat_participants!inner(*)')
                .eq('type', 'support')
                .eq('participants.tenant_id', tenantId)
                .maybeSingle();

            if (existing) {
                await supabase.from('chat_rooms').update({ status: 'active' }).eq('id', existing.id);
                setSelectedRoom(existing);
                return;
            }

            const { data: newRoom, error: roomError } = await supabase
                .from('chat_rooms')
                .insert({ type: 'support', metadata: { title: '관리자 상담' }, status: 'active' })
                .select().single();

            if (roomError) throw roomError;

            await supabase.from('chat_participants').insert([
                { room_id: newRoom.id, tenant_id: tenantId, user_id: user.id },
                { room_id: newRoom.id, tenant_id: ADMIN_TENANT_ID }
            ]);

            setSelectedRoom(newRoom);
            fetchRooms();
        } finally { setLoading(false); }
    };

    const RoomItem = ({ room }: { room: any }) => {
        const other = room.participants?.find((p: any) => p.tenant_id !== tenantId);
        const isSelected = selectedRoom?.id === room.id;
        const hasUnread = unreadRooms.has(room.id);
        const lastMsg = room.lastMessage?.content || "대화 내역이 있습니다.";

        return (
            <div 
                className={cn(
                    "p-4 mx-2 my-1 rounded-2xl cursor-pointer transition-all flex items-center gap-3 relative",
                    isSelected ? "bg-white shadow-sm border border-slate-100" : "hover:bg-slate-100/50"
                )} 
                onClick={() => setSelectedRoom(room)}
            >
                {hasUnread && (
                    <span className="absolute top-4 right-4 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-sm shadow-rose-200" />
                )}
                <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center overflow-hidden shrink-0 border border-slate-100">
                    {other?.tenant?.logo_url ? <img src={other.tenant.logo_url} className="w-full h-full object-cover" /> : <Building2 className="text-slate-400" size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                        <span className={cn("text-xs truncate", isSelected || hasUnread ? "font-bold text-slate-900" : "font-medium text-slate-600")}>
                            {other?.tenant?.name || '상담 대기'}
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate leading-relaxed">{lastMsg}</p>
                </div>
                {isSelected && <ChevronRight className="w-3 h-3 text-slate-300" />}
            </div>
        );
    };

    const getPeerName = () => {
        if (!selectedRoom) return "";
        const other = selectedRoom.participants?.find((p: any) => p.tenant_id !== tenantId);
        return other?.tenant?.name || "상담 고객";
    }

    return (
        <>
            <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[100]">
                <Button 
                    variant="default" 
                    className={cn(
                        "w-14 h-14 md:w-16 md:h-16 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl transition-all duration-500",
                        isOpen ? "bg-slate-900 rotate-90" : "bg-indigo-600"
                    )}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X className="w-6 h-6 md:w-8 md:h-8" /> : <MessageCircle className="w-6 h-6 md:w-8 md:h-8" />}
                </Button>
            </div>

            {isOpen && (
                <div 
                    className={cn(
                        "fixed bottom-40 md:bottom-28 right-4 md:right-8 bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl z-[100] overflow-hidden flex flex-col border border-slate-100 animate-in slide-in-from-bottom-5 transition-all duration-500",
                        isSuperAdmin ? "w-[850px] h-[650px]" : "w-[calc(100vw-2rem)] max-w-[400px] h-[600px] max-h-[70vh] md:max-h-[600px]"
                    )}
                >
                    {/* Header */}
                    <div className="bg-slate-900 p-6 text-white shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {(!isSuperAdmin && selectedRoom) && (
                                <Button variant="ghost" size="sm" className="p-0 w-8 h-8 text-white/50 hover:text-white" onClick={() => setSelectedRoom(null)}>
                                    <ChevronLeft size={20} />
                                </Button>
                            )}
                            <div>
                                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                                    {isSuperAdmin ? (
                                        <>
                                            <Shield className="w-5 h-5 text-indigo-400" />
                                            <span>실시간 상담 관제 센터</span>
                                        </>
                                    ) : (
                                        selectedRoom ? '관리자 1:1 상담' : '메시지 센터'
                                    )}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase">
                                        {selectedRoom && isSuperAdmin ? `${getPeerName()} 참여 중` : 'Online'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {selectedRoom && isSuperAdmin && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-rose-500/10 hover:bg-rose-500 border-rose-500/20 text-rose-400 hover:text-white rounded-xl text-xs font-black shadow-sm"
                                onClick={handleEndChat}
                            >
                                <Clock size={14} className="mr-2" /> 상담 종료
                            </Button>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 flex min-h-0 bg-slate-50 relative overflow-hidden">
                        {isSuperAdmin ? (
                            <>
                                {/* ADMIN SIDEBAR */}
                                <div className="w-[280px] border-r border-slate-200 bg-slate-50/50 flex flex-col pt-4">
                                    <div className="px-6 mb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            {showClosed ? <History size={12} /> : <Inbox size={12} />}
                                            <h5 className="text-[10px] font-black uppercase tracking-widest">
                                                {showClosed ? '상담 기록' : '상담 목록'}
                                            </h5>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className={cn(
                                                "h-6 px-2 text-[9px] font-black rounded-lg transition-colors capitalize",
                                                showClosed 
                                                  ? "bg-slate-200 text-slate-600 hover:bg-slate-300" 
                                                  : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                            )}
                                            onClick={() => {
                                                setShowClosed(!showClosed);
                                                setSelectedRoom(null);
                                            }}
                                        >
                                            {showClosed ? '← 목록 보기' : '기록 보기'}
                                        </Button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto pb-4 scrollbar-hide">
                                        {rooms.map((room) => <RoomItem key={room.id} room={room} />)}
                                        {rooms.length === 0 && (
                                            <div className="flex flex-col items-center justify-center pt-20 px-4 text-center">
                                                <Archive className="w-8 h-8 text-slate-200 mb-2" />
                                                <p className="text-[11px] text-slate-400 italic">
                                                    {showClosed ? '아직 종료된 상담이 없습니다.' : '진행 중인 상담이 없습니다.'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* CHAT WINDOW */}
                                <div className="flex-1 flex flex-col bg-white">
                                    {selectedRoom ? (
                                        <div className="flex-1 flex flex-col min-h-0">
                                            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">상담대상:</span>
                                                    <span className="text-sm font-black text-slate-900">{getPeerName()}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex-1 overflow-y-auto px-6 pt-4" id="chat-messages-container">
                                                <div className="space-y-4 pb-6">
                                                    {messages.map((msg) => {
                                                        const isMe = msg.sender_id === user?.id || msg.sender_tenant_id === tenantId;
                                                        const messageDate = parseISO(msg.created_at);
                                                        const isOld = isAfter(new Date(), addDays(messageDate, 7));
                                                        return (
                                                            <div key={msg.id} className={cn("flex flex-col mb-1", isMe ? "items-end" : "items-start")}>
                                                                <div className={cn(
                                                                    "max-w-[85%] p-3 px-4 rounded-2xl text-[13px] font-medium shadow-sm",
                                                                    isMe ? "bg-slate-900 text-white rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                                                                )}>
                                                                    {msg.image_url && !isOld && (
                                                                        <img src={msg.image_url} className="rounded-xl mb-2 max-h-40 w-full object-cover cursor-pointer" onClick={() => window.open(msg.image_url, '_blank')} />
                                                                    )}
                                                                    <p className="whitespace-pre-wrap leading-relaxed">{isOld ? "일주일이 경과된 메시지입니다." : msg.content}</p>
                                                                </div>
                                                                <span className="text-[9px] text-slate-300 font-bold mt-1 px-1">
                                                                    {!isMe && `${msg.sender_tenant?.name || '시스템'} • `}{format(messageDate, 'HH:mm')}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                    <div ref={scrollRef} />
                                                </div>
                                            </div>

                                            <ChatInput 
                                                value={inputValue} 
                                                onChange={setInputValue} 
                                                onSend={handleSendMessage} 
                                                onFile={handleFileUpload} 
                                                loading={loading} 
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-slate-400">
                                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                                <MessageCircle className="w-8 h-8 opacity-20" />
                                            </div>
                                            <h4 className="text-sm font-bold text-slate-600 mb-1">
                                                {showClosed ? '상담 기록을 확인하세요' : '상담을 시작하세요'}
                                            </h4>
                                            <p className="text-xs max-w-[200px] leading-relaxed">
                                                {showClosed 
                                                  ? '왼쪽 상담 기록에서 화원사를 선택하여 대화 내용을 열람하실 수 있습니다.'
                                                  : '왼쪽 목록에서 화원사를 선택하여 실시간 채팅을 시작하실 수 있습니다.'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col w-full min-h-0">
                                {!selectedRoom ? (
                                    <div className="flex-1 overflow-y-auto p-6">
                                        <div className="space-y-6">
                                            {/* Consultation Hours Banner */}
                                            <div className="bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                                        <Clock size={16} />
                                                    </div>
                                                    <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">본사 상담 업무 시간</h5>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-400">
                                                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                                        <p className="text-slate-900 font-black mb-0.5 uppercase tracking-tighter italic mr-1">Weekdays</p>
                                                        <p>09:00 - 18:00</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                                        <p className="text-slate-900 font-black mb-0.5 uppercase tracking-tighter italic mr-1">Weekend/Holiday</p>
                                                        <p>Closed</p>
                                                    </div>
                                                </div>
                                                <div className="pt-2 flex items-start gap-2 text-[9px] font-bold text-slate-400 leading-normal border-t border-slate-50">
                                                    <Info size={12} className="shrink-0 text-amber-500 mt-0.5" />
                                                    <p>상담 기록 및 전송 이미지는 개인정보 보안 및 서버 용량 최적화를 위해 <span className="text-amber-600 font-black">7일 경과 후 자동 파기</span>됩니다. 중요한 정보는 미리 확인해 주세요.</p>
                                                </div>
                                            </div>

                                            <Button className="w-full h-auto p-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] justify-start gap-4 shadow-xl" onClick={startSupportChat} disabled={loading}>
                                                <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                                    {loading ? <RefreshCw className="animate-spin" size={20} /> : <MessageCircle size={20} />}
                                                </div>
                                                <div className="flex flex-col items-start">
                                                    <span className="font-black text-sm">상담원 연결하기 (1:1)</span>
                                                    <span className="text-[9px] font-medium text-white/50 uppercase tracking-widest">Connect to Admin Support</span>
                                                </div>
                                            </Button>
                                            <div className="flex items-center gap-4 px-1">
                                                <h5 className="text-[10px] font-black text-slate-300 uppercase tracking-widest shrink-0">Recent Conversations</h5>
                                                <div className="h-px w-full bg-slate-100" />
                                            </div>
                                            {rooms.map((room) => <RoomItem key={room.id} room={room} />)}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col bg-white min-h-0">
                                        <div className="flex-1 overflow-y-auto px-6 pt-6 scrollbar-thin scrollbar-thumb-slate-200" id="chat-messages-container-user">
                                            <div className="space-y-6 pb-6">
                                                {messages.map((msg) => {
                                                    const isMe = msg.sender_id === user?.id || msg.sender_tenant_id === tenantId;
                                                    const messageDate = parseISO(msg.created_at);
                                                    return (
                                                        <div key={msg.id} className={cn("flex flex-col mb-2", isMe ? "items-end" : "items-start")}>
                                                            <div className={cn("max-w-[85%] p-4 rounded-3xl text-sm font-medium shadow-sm", isMe ? "bg-slate-900 text-white rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none border border-slate-100")}>
                                                                <p className="whitespace-pre-wrap leading-relaxed">{isAfter(new Date(), addDays(messageDate, 7)) ? "일주일이 경과된 메시지입니다" : msg.content}</p>
                                                            </div>
                                                            <span className="text-[9px] text-slate-300 font-bold mt-1 px-2">{format(messageDate, 'HH:mm')}</span>
                                                        </div>
                                                    );
                                                })}
                                                <div ref={scrollRef} />
                                            </div>
                                        </div>
                                        <ChatInput value={inputValue} onChange={setInputValue} onSend={handleSendMessage} onFile={handleFileUpload} loading={loading} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

function ChatInput({ value, onChange, onSend, onFile, loading }: { value: string, onChange: (v: string) => void, onSend: () => void, onFile: (e: any) => void, loading: boolean }) {
    return (
        <div className="p-4 bg-white border-t border-slate-100 shrink-0 z-[50]">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <div className="shrink-0">
                    <input type="file" id="chat-file-input-dynamic" className="hidden" accept="image/*" onChange={onFile} disabled={loading} />
                    <Button variant="ghost" size="sm" className="w-10 h-10 p-0 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-white" onClick={() => document.getElementById('chat-file-input-dynamic')?.click()}>
                        {loading ? <RefreshCw size={18} className="animate-spin text-indigo-500" /> : <Paperclip size={18} />}
                    </Button>
                </div>
                <input className="flex-1 bg-transparent border-none outline-none text-[13px] px-2 text-slate-900 placeholder:text-slate-400 font-medium min-w-0" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !loading && onSend()} placeholder="메시지를 입력하세요..." disabled={loading} />
                <Button variant="default" size="sm" className="shrink-0 h-10 bg-indigo-600 hover:bg-indigo-700 rounded-xl px-4" onClick={onSend} disabled={loading || !value.trim()}>
                    <Send size={16} />
                </Button>
            </div>
        </div>
    );
}
