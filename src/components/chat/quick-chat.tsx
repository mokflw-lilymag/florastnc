"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { 
    MessageCircle, X, Send, User, Building2, Clock, 
    ChevronRight, ChevronLeft, Bell, RefreshCw, Paperclip, Shield,
    Archive, History, Inbox, Info, Search
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, parseISO, isAfter, addDays, differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import { FLOXYNC_FLOATING_UI_EVENT, type FloxyncFloatingUiDetail } from "@/lib/floating-ui-bridge";

const inquirySoundUrl = "https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3";
const messageSoundUrl = "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3";
let inquiryAudio: HTMLAudioElement | null = null;
let messageAudio: HTMLAudioElement | null = null;

if (typeof window !== 'undefined') {
    inquiryAudio = new Audio(inquirySoundUrl);
    messageAudio = new Audio(messageSoundUrl);
    inquiryAudio.preload = 'auto';
    messageAudio.preload = 'auto';
}

export function QuickChat() {
    const supabase = createClient();
    const pathname = usePathname();
    const { tenantId, user, profile } = useAuth();
    /** 새 주문 모바일: 하단 고정 요약·주문하기 바 위로 FAB 올려 겹침 완화 */
    const orderNewMobileBoost =
        typeof pathname === "string" && pathname.includes("/dashboard/orders/new");
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
    const [isAILoading, setIsAILoading] = useState(false);
    // FAQ 봇 관련 상태
    const [faqCategories, setFaqCategories] = useState<string[]>([]);
    const [faqData, setFaqData] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [faqAnswer, setFaqAnswer] = useState<{q: string, a: string} | null>(null);
    const [faqSuggestions, setFaqSuggestions] = useState<any[]>([]); // 실시간 제안
    /** 카메라 권한 등: Android 오버레이 감지 완화를 위해 플로팅 UI 일시 숨김 */
    const [overlaysSuppressed, setOverlaysSuppressed] = useState(false);

    useEffect(() => {
        const onFloatingUi = (e: Event) => {
            const ce = e as CustomEvent<FloxyncFloatingUiDetail>;
            if (typeof ce.detail?.suppressOverlays === "boolean") {
                setOverlaysSuppressed(ce.detail.suppressOverlays);
            }
        };
        window.addEventListener(FLOXYNC_FLOATING_UI_EVENT, onFloatingUi as EventListener);
        return () => window.removeEventListener(FLOXYNC_FLOATING_UI_EVENT, onFloatingUi as EventListener);
    }, []);

    useEffect(() => {
        if (overlaysSuppressed) setIsOpen(false);
    }, [overlaysSuppressed]);

    // [수정 핵심] 강력하고 독특한 프리미엄 알림음 (Max Volume, Preloaded)
    const playNewInquirySound = () => {
        if (inquiryAudio) {
            inquiryAudio.volume = 1.0;
            inquiryAudio.currentTime = 0;
            inquiryAudio.play().catch(() => {});
        }
    };
    const playNewMessageSound = () => {
        if (messageAudio) {
            messageAudio.volume = 1.0;
            messageAudio.currentTime = 0;
            messageAudio.play().catch(() => {});
        }
    };

    const isSuperAdmin = profile?.role === 'super_admin';
    const ADMIN_TENANT_ID = "50551f4c-0b6b-45ab-8db9-047ca3ff88de";
    const AI_BOT_USER_ID = "00000000-0000-0000-0000-000000000001"; // AI 전용 고정 UUID

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

    // FAQ 데이터 로드
    const fetchFaq = useCallback(async () => {
        const { data } = await supabase
            .from('support_faq')
            .select('*')
            .eq('is_active', true)
            .order('category_order')
            .order('question_order');
        if (data) {
            setFaqData(data);
            const cats = Array.from(new Set(data.map((d: any) => d.category))) as string[];
            setFaqCategories(cats);
        }
    }, [supabase]);

    useEffect(() => {
        if (isOpen && !isSuperAdmin) fetchFaq();
    }, [isOpen, isSuperAdmin, fetchFaq]);

    const fetchRooms = useCallback(async () => {
        if (!tenantId) return;
        
        const statusToFetch = showClosed ? 'closed' : 'active';
        const { data, error } = await supabase
            .from('chat_participants')
            .select(`
                room:chat_rooms!inner(
                    *, 
                    participants:chat_participants(tenant:tenants(name, logo_url)),
                    last_msg:chat_messages(id, content, created_at, sender_id)
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
            
            setRooms(prev => {
                if (prev.length > 0) {
                    let shouldPlayInquirySound = false;

                    for (const r of sortedRooms) {
                        const prevRoom = prev.find(p => p.id === r.id);
                        if (!prevRoom) {
                            // New room entirely
                            shouldPlayInquirySound = true;
                        } else if (r.lastMessage && prevRoom.lastMessage) {
                            if (r.lastMessage.id !== prevRoom.lastMessage.id && r.lastMessage.sender_id !== user?.id) {
                                // New message in an existing room
                                if (selectedRoomRef.current?.id !== r.id) {
                                    shouldPlayInquirySound = true;
                                    setUnreadRooms(ur => new Set(ur).add(r.id));
                                }
                            }
                        } else if (r.lastMessage && !prevRoom.lastMessage && r.lastMessage.sender_id !== user?.id) {
                            shouldPlayInquirySound = true;
                            if (selectedRoomRef.current?.id !== r.id) {
                                setUnreadRooms(ur => new Set(ur).add(r.id));
                            }
                        }
                    }

                    if (shouldPlayInquirySound) playNewInquirySound();
                }

                return sortedRooms;
            });
        }
    }, [tenantId, supabase, showClosed, user?.id]);

    const handleEndChat = async (reason?: string) => {
        if (!selectedRoom) return;
        try {
            const { error } = await supabase
                .from('chat_rooms')
                .update({ 
                    status: 'closed',
                    last_activity_at: new Date().toISOString()
                })
                .eq('id', selectedRoom.id);
            
            if (error) throw error;

            if (reason === 'timeout') {
                await supabase.from('chat_messages').insert({
                    room_id: selectedRoom.id,
                    sender_tenant_id: ADMIN_TENANT_ID,
                    is_ai: true,
                    ai_sender_name: 'Flora AI 비서',
                    content: "사장님, 오랫동안 응답이 없으셔서 상담을 종료하겠습니다. 나중에 더 궁금한 점이 생기시면 언제든 다시 찾아주세요! 감사합니다. 💐"
                });
            }
            
            toast.success(reason === 'timeout' ? "무응답으로 인해 상담이 종료되었습니다." : "상담이 정중히 종료되었습니다.");
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
            setMessages(prev => {
                const prevLastId = prev[prev.length - 1]?.id;
                const newLastId = data[data.length - 1]?.id;
                
                if (prev.length !== data.length || prevLastId !== newLastId) {
                    if (prev.length > 0) {
                        const newMsgs = data.filter(d => !prev.some(p => p.id === d.id));
                        const hasNewFromOther = newMsgs.some(m => m.sender_id !== user?.id);
                        if (hasNewFromOther) {
                            playNewMessageSound();
                        }
                    }

                    setTimeout(() => {
                        const container = document.getElementById('chat-messages-container');
                        const containerUser = document.getElementById('chat-messages-container-user');
                        if (container) {
                            container.scrollTop = container.scrollHeight;
                        }
                        if (containerUser) {
                            containerUser.scrollTop = containerUser.scrollHeight;
                        }
                    }, 100);
                    return data;
                }
                return prev;
            });
        }
    }, [supabase, user?.id]);

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
                }, (payload) => {
                    const msgRoomId = payload.new.room_id;
                    const isNewFromOther = payload.new.sender_id !== user?.id;

                    if (isNewFromOther) {
                        if (selectedRoomRef.current?.id !== msgRoomId) {
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
                        
                        supabase
                            .from('chat_rooms')
                            .update({ status: 'active' })
                            .eq('id', msgRoomId)
                            .then(() => fetchRooms());
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
            setMessages([]); // 방 이동 시 이전 메시지 즉시 비우기 (잔상 제거)
            fetchMessages(selectedRoom.id);

            // 🚀 대화방 전용 고속도로 (직통 수신)
            const roomChannel = supabase
                .channel(`chat-room-${selectedRoom.id}`)
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'chat_messages'
                }, (payload) => {
                    const msgRoomId = payload.new.room_id;
                    if (msgRoomId !== selectedRoom.id) return;

                    const isFromOther = payload.new.sender_id !== user?.id;
                    if (isFromOther) {
                        fetchMessages(selectedRoom.id);
                        fetchRooms();
                    }
                })
                .subscribe();

            return () => { supabase.removeChannel(roomChannel); };
        }
    }, [selectedRoom, fetchMessages, fetchRooms, supabase, user?.id]);

    // [Fallback Polling] 웹소켓이 슬립 모드로 들어가거나 끊겼을 때를 대비한 견고한 폴링 (3~5초 간격)
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            fetchRooms();
        }, 5000);
        return () => clearInterval(interval);
    }, [isOpen, fetchRooms]);

    useEffect(() => {
        if (!isOpen || !selectedRoom || !selectedRoom.id || selectedRoom.status === 'closed') return;
        const interval = setInterval(() => {
            fetchMessages(selectedRoom.id);
        }, 3000);
        return () => clearInterval(interval);
    }, [isOpen, selectedRoom, fetchMessages]);

    const triggerAIResponse = async (roomId: string, userContent: string, history: any[]) => {
        setIsAILoading(true);
        try {
            const historyPayload = Array.isArray(history) ? history.slice(-5).map(m => ({ 
                role: m.is_ai ? 'model' : (m.sender_id === user?.id ? 'user' : 'user'), 
                content: m.content || ''
            })) : [];

            const response = await fetch('/api/ai/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: userContent,
                    history: historyPayload,
                    tenantId,
                    userName: profile?.name
                })
            });
            const data = await response.json();
            
            // API 에러여도 content가 있으면 표시 (에러 안내 메시지)
            const aiContent = data.content;
            if (!aiContent) {
                console.error('[AI] No content in response:', data);
                return;
            }

            // AI 답변 DB 저장 (sender_id 없음 - DB에서 nullable 처리 필요)
            const { error: insertError } = await supabase.from('chat_messages').insert({
                room_id: roomId,
                sender_tenant_id: ADMIN_TENANT_ID,
                is_ai: true,
                ai_sender_name: 'Flora AI 비서',
                content: aiContent
            });

            if (insertError) {
                console.error('[AI] Message insert error:', insertError);
                toast.error('AI 답변 저장 실패: ' + insertError.message);
                return;
            }

            // 룸 상태 업데이트
            if (data.status === 'success') {
                await supabase.from('chat_rooms').update({
                    needs_human: data.needsHuman || false,
                    last_activity_at: new Date().toISOString()
                }).eq('id', roomId);
                
                if (data.needsHuman) {
                    toast.info("상담원 연결이 필요하여 관리자에게 알림을 보냈습니다.");
                }
            }

            // 메시지 새로고침
            fetchMessages(roomId);
        } catch (err: any) {
            console.error("AI Response Error:", err);
            toast.error('AI 응답 오류: ' + (err?.message || '알 수 없는 에러'));
        } finally {
            setIsAILoading(false);
        }
    };

    // [3분 자동 종료 타이머]
    useEffect(() => {
        if (!isOpen || !selectedRoom || selectedRoom.status === 'closed') return;
        
        const checkTimeout = () => {
            const lastActivity = selectedRoom.last_activity_at;
            if (!lastActivity) return;
            const diff = differenceInMinutes(new Date(), new Date(lastActivity));
            if (diff >= 3) {
                handleEndChat('timeout');
            }
        };

        const interval = setInterval(checkTimeout, 20000); // 20초마다 체크
        return () => clearInterval(interval);
    }, [isOpen, selectedRoom]);

    const handleSendMessage = async (imageUrl?: string) => {
        if (!inputValue.trim() && !imageUrl || !selectedRoom || !tenantId || !user) return;
        
        const tempContent = inputValue.trim();
        const tempId = Math.random().toString();
        
        // 1. 낙관적 업데이트: 서버 응답 기다리지 않고 화면에 즉시 표시
        const newMessage = {
            id: tempId,
            room_id: selectedRoom.id,
            sender_id: user.id,
            sender_tenant_id: tenantId,
            content: tempContent,
            image_url: imageUrl,
            created_at: new Date().toISOString(),
            sender_tenant: profile?.tenants // 현재 내 정보 미리 넣어주기
        };

        setMessages(prev => [...prev, newMessage]);
        setInputValue("");
        setFaqSuggestions([]); // 제안 캐시 초기화
        
        // 즉시 스크롤 처리
        setTimeout(() => {
            const container = document.getElementById('chat-messages-container');
            const containerUser = document.getElementById('chat-messages-container-user');
            if (container) container.scrollTop = container.scrollHeight;
            if (containerUser) containerUser.scrollTop = containerUser.scrollHeight;
        }, 10);

        try {
            const { data: savedMsg, error } = await supabase
                .from('chat_messages')
                .insert({
                    room_id: selectedRoom.id,
                    sender_id: user.id,
                    sender_tenant_id: tenantId,
                    content: tempContent,
                    image_url: imageUrl,
                    origin_url: window.location.href
                })
                .select('*, sender_tenant:tenants(*)')
                .single();

            if (error) {
                setMessages(prev => prev.filter(m => m.id !== tempId));
                throw error;
            }

            // [AI 자동 응답 트리거] AI 모드일 때만 작동
            if (savedMsg && (selectedRoom.active_counselor === 'ai' || !selectedRoom.active_counselor)) {
                const currentHistory = [...messages, savedMsg];
                
                // ★ FAQ 먼저 확인: 키워드 매칭
                const lowerInput = tempContent.toLowerCase();
                const faqMatch = faqData.find(f => 
                    f.question.includes(tempContent) ||
                    tempContent.split(' ').some((word: string) => word.length > 1 && f.question.includes(word)) ||
                    f.answer.toLowerCase().includes(lowerInput.slice(0, 10))
                );
                
                if (faqMatch) {
                    // FAQ 매칭 성공: AI 호출 없이 바로 저장
                    const { error: faqInsertError } = await supabase.from('chat_messages').insert({
                        room_id: selectedRoom.id,
                        sender_tenant_id: ADMIN_TENANT_ID,
                        is_ai: true,
                        ai_sender_name: 'Flora AI 비서',
                        content: `**${faqMatch.question}**\n\n${faqMatch.answer}\n\n---\n*더 궁금한 점이 있으시면 더 자세히 묻어보세요!*`
                    });
                    if (!faqInsertError) {
                        fetchMessages(selectedRoom.id);
                        return; // AI 호출 안 함
                    }
                }
                
                // FAQ 매칭 없으면 AI 호출
                console.log('[QuickChat] Triggering AI Response with history count:', currentHistory.length);
                triggerAIResponse(selectedRoom.id, tempContent, currentHistory);
            }

            // 활동 시간 업데이트
            await supabase.from('chat_rooms').update({
                last_activity_at: new Date().toISOString()
            }).eq('id', selectedRoom.id);

            if (savedMsg) {
                setMessages(prev => prev.map(m => m.id === tempId ? savedMsg : m));
            }
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
            // 1. [동시 상담 제한 체크] 활성 상담 룸 개수 확인
            const { count } = await supabase
                .from('chat_rooms')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active');
            
            if (count && count >= 10) {
                toast.warning("현재 상담량이 많아 대기가 필요합니다.", {
                    description: "잠시 후 다시 시도해 주시거나 잠시 기다려 주세요."
                });
                // return; // 사용자 요청에 따라 "대기 메시지 남겨주기"로 처리 가능
            }

            const { data: existing } = await supabase
                .from('chat_rooms')
                .select('*, participants:chat_participants!inner(*)')
                .eq('type', 'support')
                .eq('participants.tenant_id', tenantId)
                .maybeSingle();

            if (existing) {
                await supabase.from('chat_rooms').update({ 
                    status: 'active',
                    last_activity_at: new Date().toISOString()
                }).eq('id', existing.id);
                setSelectedRoom(existing);
                return;
            }

            const { data: newRoom, error: roomError } = await supabase
                .from('chat_rooms')
                .insert({ 
                    type: 'support', 
                    metadata: { title: '관리자 상담' }, 
                    status: 'active',
                    active_counselor: 'ai',
                    last_activity_at: new Date().toISOString()
                })
                .select().single();

            if (roomError) throw roomError;

            await supabase.from('chat_participants').insert([
                { room_id: newRoom.id, tenant_id: tenantId, user_id: user.id },
                { room_id: newRoom.id, tenant_id: ADMIN_TENANT_ID }
            ]);

            // 첫 환영 메시지 (AI - sender_id 없음, DB에서 nullable)
            const { error: welcomeError } = await supabase.from('chat_messages').insert({
                room_id: newRoom.id,
                sender_tenant_id: ADMIN_TENANT_ID,
                is_ai: true,
                ai_sender_name: 'Flora AI 비서',
                content: "안녕하세요 사장님! 플록싱크 헬프데스크에 오신 것을 정중히 환영합니다. 꽃집을 운영하시면서 생기는 궁금증이나 불편한 점을 제가 친절하게 해결해 드릴게요. 무엇부터 도와드릴까요? 🌸"
            });
            if (welcomeError) console.error('[AI] Welcome message error:', welcomeError);

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

    if (!tenantId && !isSuperAdmin) {
        return null;
    }

    if (overlaysSuppressed) {
        return null;
    }

    return (
        <>
            <div
                className={cn(
                    "fixed right-4 z-[100] md:bottom-8 md:right-8",
                    orderNewMobileBoost ? "bottom-[12.75rem]" : "bottom-24"
                )}
            >
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
                        "fixed right-4 bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl z-[100] overflow-hidden flex flex-col border border-slate-100 animate-in slide-in-from-bottom-5 transition-all duration-500",
                        orderNewMobileBoost ? "bottom-[17.25rem]" : "bottom-40",
                        "md:bottom-28 md:right-8",
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
                                        {selectedRoom?.active_counselor === 'human' ? '상담원 직접 개입 중' : 'AI 비서 정중히 응대 중'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {selectedRoom && (
                            <div className="flex items-center gap-2">
                                {isSuperAdmin && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className={cn(
                                            "rounded-xl text-[10px] font-black shadow-sm h-8",
                                            selectedRoom.active_counselor === 'ai' 
                                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500 hover:text-white"
                                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
                                        )}
                                        onClick={async () => {
                                            const nextMode = selectedRoom.active_counselor === 'ai' ? 'human' : 'ai';
                                            const { error } = await supabase
                                                .from('chat_rooms')
                                                .update({ active_counselor: nextMode })
                                                .eq('id', selectedRoom.id);
                                            if (!error) {
                                                setSelectedRoom({...selectedRoom, active_counselor: nextMode});
                                                toast.success(nextMode === 'ai' ? "AI 비서에게 상담을 다시 맡겼습니다." : "상담사가 직접 개입합니다.");
                                            }
                                        }}
                                    >
                                        {selectedRoom.active_counselor === 'ai' ? '상담사 개입' : 'AI에게 다시 맡기기'}
                                    </Button>
                                )}
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="bg-rose-500/10 hover:bg-rose-500 border-rose-500/20 text-rose-400 hover:text-white rounded-xl text-xs font-black shadow-sm h-8"
                                    onClick={() => {
                                        if (confirm("상담을 정말 종료하시겠습니까?")) {
                                            handleEndChat();
                                        }
                                    }}
                                >
                                    <Clock size={14} className="mr-2" /> 상담 종료
                                </Button>
                            </div>
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
                                                        const isAI = msg.is_ai === true || msg.sender_id === AI_BOT_USER_ID;
                                                        const messageDate = msg.created_at ? parseISO(msg.created_at) : new Date();
                                                        return (
                                                            <div key={msg.id} className={cn("flex flex-col mb-1", isAI ? "items-start" : isMe ? "items-end" : "items-start")}>
                                                                <div className={cn(
                                                                    "max-w-[85%] p-3 px-4 rounded-2xl text-[13px] font-medium shadow-sm",
                                                                    isAI ? "bg-indigo-600 text-white rounded-tl-none"
                                                                    : isMe ? "bg-slate-900 text-white rounded-tr-none" 
                                                                    : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                                                                )}>
                                                                    {msg.image_url && (
                                                                        <img src={msg.image_url} className="rounded-xl mb-2 max-h-40 w-full object-cover cursor-pointer" onClick={() => window.open(msg.image_url, '_blank')} />
                                                                    )}
                                                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                                </div>
                                                                <span className="text-[9px] text-slate-300 font-bold mt-1 px-1">
                                                                    {isAI ? (msg.ai_sender_name || 'Flora AI') : !isMe && `${msg.sender_tenant?.name || ''}`} • {format(messageDate, 'HH:mm')}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                    {isAILoading && (
                                                        <div className="flex items-center gap-2 text-indigo-500 animate-pulse text-[10px] font-bold uppercase tracking-widest pl-2">
                                                            <RefreshCw size={12} className="animate-spin" />
                                                            AI 비서가 정중히 답변을 작성 중입니다...
                                                        </div>
                                                    )}
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
                                                {showClosed ? '상담 기록을 확인하세요' : '사장님들을 정중히 모십니다'}
                                            </h4>
                                            <p className="text-xs max-w-[200px] leading-relaxed">
                                                {showClosed 
                                                  ? '왼쪽 상담 기록에서 화원사를 선택하여 대화 내용을 열람하실 수 있습니다.'
                                                  : '왼쪽 목록에서 화원사를 선택하여 실시간 기술 지원을 시작하세요.'}
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

                                            {/* FAQ 바로 찾기 섹션 */}
                                            {faqAnswer ? (
                                                <div className="bg-indigo-50 border border-indigo-100 rounded-[1.5rem] p-5 space-y-3">
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-lg">🤖</span>
                                                        <div>
                                                            <p className="text-[11px] font-black text-indigo-600 mb-1 uppercase tracking-widest">AI 빠른 답변</p>
                                                            <p className="text-xs font-bold text-slate-700 mb-2">{faqAnswer.q}</p>
                                                            <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">{faqAnswer.a}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 pt-2 border-t border-indigo-100">
                                                        <Button size="sm" variant="outline" className="flex-1 text-[10px] font-black h-8 rounded-xl"
                                                            onClick={() => { setFaqAnswer(null); setSelectedCategory(null); }}>
                                                            ← 다른 질문
                                                        </Button>
                                                        <Button size="sm" className="flex-1 text-[10px] font-black h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                                                            onClick={() => { setFaqAnswer(null); startSupportChat(); }}>
                                                            AI에게 더 묻기
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : selectedCategory ? (
                                                // [2단계] 선택된 카테고리 질문만 표시
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <button className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-indigo-600 transition-colors"
                                                            onClick={() => setSelectedCategory(null)}>
                                                            ← 카테고리로 돌아가기
                                                        </button>
                                                        <span className="text-[9px] text-slate-400">{faqData.filter(f => f.category === selectedCategory).length}개 항목</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 pb-1">
                                                        <span className="text-base">{faqData.find((f:any) => f.category === selectedCategory)?.category_icon}</span>
                                                        <p className="text-[12px] font-black text-slate-800">{selectedCategory}</p>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {faqData.filter((f:any) => f.category === selectedCategory).map((faq: any) => (
                                                            <button key={faq.id}
                                                                className="w-full text-left p-3.5 rounded-2xl bg-white border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-[12px] font-medium text-slate-700 shadow-sm flex items-start gap-2"
                                                                onClick={() => setFaqAnswer({ q: faq.question, a: faq.answer })}>
                                                                <span className="text-indigo-400 font-black shrink-0 text-[10px] mt-0.5">Q</span>
                                                                <span>{faq.question}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 text-center pt-1">원하는 답변이 없으면 아래 AI 상담을 이용하세요</p>
                                                </div>
                                            ) : (
                                                // [1단계] 카테고리 그리드만 표시
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base">⚡</span>
                                                        <p className="text-[11px] font-black text-slate-700">무엇을 도와드릴까요?</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {faqData.reduce((acc: any[], f: any) => {
                                                            if (!acc.find((a: any) => a.category === f.category)) acc.push(f);
                                                            return acc;
                                                        }, []).map((faq: any) => (
                                                            <button key={faq.category}
                                                                className="p-3.5 rounded-2xl bg-white border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md transition-all text-left shadow-sm group"
                                                                onClick={() => setSelectedCategory(faq.category)}>
                                                                <span className="text-xl block mb-1.5">{faq.category_icon}</span>
                                                                <span className="text-[11px] font-black text-slate-700 group-hover:text-indigo-700 block">{faq.category}</span>
                                                                <span className="text-[9px] text-slate-400">{faqData.filter((d:any) => d.category === faq.category).length}개 질문</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <Button className="w-full h-auto p-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] justify-start gap-4 shadow-xl" onClick={startSupportChat} disabled={loading}>
                                                <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                                    {loading ? <RefreshCw className="animate-spin" size={20} /> : <MessageCircle size={20} />}
                                                </div>
                                                <div className="flex flex-col items-start">
                                                    <span className="font-black text-sm">찾는 답변이 없다면? AI 상담</span>
                                                    <span className="text-[9px] font-medium text-white/50 uppercase tracking-widest">AI + 상담원 하이브리드 지원</span>
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
                                                    const isMe = msg.sender_id === user?.id;
                                                    const isAI = msg.is_ai === true || msg.sender_id === '00000000-0000-0000-0000-000000000001';
                                                    const isImage = msg.content?.startsWith('https://') && (msg.content.includes('.png') || msg.content.includes('.jpg') || msg.content.includes('.jpeg') || msg.content.includes('.gif') || msg.content.includes('.webp'));
                                                    const messageDate = msg.created_at ? parseISO(msg.created_at) : new Date();

                                                    return (
                                                        <div key={msg.id} className={cn("flex flex-col mb-2", isMe ? "items-end" : "items-start")}>
                                                            <div className={cn(
                                                                "max-w-[85%] p-4 rounded-3xl text-sm font-medium shadow-sm transition-all hover:scale-[1.01]", 
                                                                isAI ? "bg-indigo-600 text-white rounded-tl-none shadow-indigo-600/10"
                                                                : isMe ? "bg-slate-900 text-white rounded-tr-none shadow-slate-900/10" 
                                                                : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                                                            )}>
                                                                {isImage ? (
                                                                    <div className="relative group cursor-zoom-in">
                                                                        <img src={msg.content} alt="Chat image" className="rounded-2xl max-w-full h-auto border border-slate-100" />
                                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                            <Search className="text-white" size={20} />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className="whitespace-pre-wrap leading-relaxed">
                                                                        {msg.content}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className="text-[9px] text-slate-300 font-bold mt-1 px-2 uppercase tracking-tighter">
                                                                {isAI ? (msg.ai_sender_name || 'Flora AI') : 'Me'} • {format(messageDate, 'HH:mm')}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                {isAILoading && (
                                                    <div className="flex items-center gap-2 text-indigo-500 animate-pulse text-[9px] font-bold uppercase tracking-widest pl-2">
                                                        <RefreshCw size={10} className="animate-spin" />
                                                        AI 비서가 답변을 작성 중입니다...
                                                    </div>
                                                )}
                                                <div ref={scrollRef} />
                                            </div>
                                        </div>
                                        <div className="px-4 pb-1">
                                            {/* 실시간 FAQ 제안 첨 */}
                                            {faqSuggestions.length > 0 && !isAILoading && (
                                                <div className="flex flex-wrap gap-1.5 mb-2">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest w-full">💡 이런 내용을 묻는 건가요?</span>
                                                    {faqSuggestions.slice(0, 3).map((faq: any) => (
                                                        <button
                                                            key={faq.id}
                                                            className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors truncate max-w-[200px]"
                                                            onClick={async () => {
                                                                setFaqSuggestions([]);
                                                                setInputValue('');
                                                                // 선택한 FAQ 답변을 AI 메시지로 저장
                                                                await supabase.from('chat_messages').insert({
                                                                    room_id: selectedRoom.id,
                                                                    sender_tenant_id: ADMIN_TENANT_ID,
                                                                    is_ai: true,
                                                                    ai_sender_name: 'Flora AI 비서',
                                                                    content: `**${faq.question}**\n\n${faq.answer}`
                                                                });
                                                                fetchMessages(selectedRoom.id);
                                                            }}
                                                        >
                                                            {faq.question}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <ChatInput
                                            value={inputValue}
                                            onChange={(val: string) => {
                                                setInputValue(val);
                                                // 실시간 FAQ 매칭
                                                if (val.trim().length >= 2 && faqData.length > 0) {
                                                    const lower = val.toLowerCase();
                                                    const matched = faqData.filter(f =>
                                                        f.question.toLowerCase().includes(lower) ||
                                                        val.split(' ').filter((w:string) => w.length > 1)
                                                            .some((word: string) => f.question.includes(word))
                                                    );
                                                    setFaqSuggestions(matched.slice(0, 3));
                                                } else {
                                                    setFaqSuggestions([]);
                                                }
                                            }}
                                            onSend={handleSendMessage}
                                            onFile={handleFileUpload}
                                            loading={loading}
                                        />
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
                <input 
                    className="flex-1 bg-transparent border-none outline-none text-[13px] px-2 text-slate-900 placeholder:text-slate-400 font-medium min-w-0" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                    onKeyDown={(e) => {
                        // 한글 입력 중(isComposing)일 때는 엔터로 전송되지 않도록 방어 (글자가 안 남는 현상 방지)
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing && !loading) {
                            e.preventDefault(); 
                            onSend();
                        }
                    }} 
                    placeholder="메시지를 입력하세요..." 
                    disabled={loading} 
                />
                <Button variant="default" size="sm" className="shrink-0 h-10 bg-indigo-600 hover:bg-indigo-700 rounded-xl px-4" onClick={onSend} disabled={loading || !value.trim()}>
                    <Send size={16} />
                </Button>
            </div>
        </div>
    );
}
