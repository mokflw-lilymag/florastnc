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
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

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

function chatTr(baseLocale: string) {
    return (
        ko: string,
        en: string,
        vi?: string,
        ja?: string,
        zh?: string,
        es?: string,
        pt?: string,
        fr?: string,
        de?: string,
        ru?: string,
    ) => pickUiText(baseLocale, ko, en, vi, ja, zh, es, pt, fr, de, ru);
}

export function QuickChat() {
    const supabase = createClient();
    const pathname = usePathname();
    const { tenantId, user, profile } = useAuth();
    const locale = usePreferredLocale();
    const baseLocale = toBaseLocale(locale);
    const tr = chatTr(baseLocale);
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
    const localizeFaqCategory = useCallback(
        (category: string) => {
            if (baseLocale === "ko") return category;
            const mapVi: Record<string, string> = {
                "계정/로그인": "Tài khoản / Đăng nhập",
                "주문/결제": "Đơn hàng / Thanh toán",
                "리본프린터": "Máy in ruy băng",
                "카드디자인": "Thiết kế thiệp",
                "정산/세무": "Quyết toán / Thuế",
                "배송/픽업": "Giao hàng / Lấy hàng",
                "재고/상품": "Tồn kho / Sản phẩm",
                "고객관리": "Quản lý khách hàng",
                "권한/직원": "Quyền / Nhân viên",
                "설정/연동": "Cài đặt / Tích hợp",
                "오류/장애": "Lỗi / Sự cố",
                "기타": "Khác",
            };
            const mapEn: Record<string, string> = {
                "계정/로그인": "Account / Login",
                "주문/결제": "Orders / Payments",
                "리본프린터": "Ribbon Printer",
                "카드디자인": "Card Design",
                "정산/세무": "Settlement / Tax",
                "배송/픽업": "Delivery / Pickup",
                "재고/상품": "Inventory / Products",
                "고객관리": "Customer Management",
                "권한/직원": "Permissions / Staff",
                "설정/연동": "Settings / Integrations",
                "오류/장애": "Errors / Issues",
                "기타": "General",
            };
            const map = baseLocale === "vi" ? mapVi : mapEn;
            return map[category] ?? category;
        },
        [baseLocale]
    );

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
                    ai_sender_name: tr(
                        'Flora AI 비서',
                        'Flora AI Assistant',
                        'Trợ lý AI Flora',
                        'Flora AI アシスタント',
                        'Flora AI 助手',
                        'Asistente Flora AI',
                        'Assistente Flora AI',
                        'Assistant Flora AI',
                        'Flora‑AI‑Assistent',
                        'Ассистент Flora AI',
                    ),
                    content: tr(
                        "사장님, 오랫동안 응답이 없으셔서 상담을 종료하겠습니다. 나중에 더 궁금한 점이 생기시면 언제든 다시 찾아주세요! 감사합니다. 💐",
                        "We are closing this chat due to inactivity. If you need help later, please reach out anytime. Thank you. 💐",
                        "Vì không phản hồi lâu, chúng tôi đóng cuộc trò chuyện. Nếu cần hỗ trợ sau, hãy liên hệ lại bất cứ lúc nào. Cảm ơn bạn. 💐",
                        "長時間ご返信がないためチャットを終了します。またのご利用をお待ちしております。💐",
                        "由于长时间无回复，我们将结束本次会话。如需帮助欢迎随时再来。💐",
                        "Cerramos el chat por inactividad. Si necesitas ayuda más adelante, vuelve cuando quieras. 💐",
                        "Encerramos o chat por inatividade. Se precisar depois, fale conosco a qualquer momento. 💐",
                        "Nous fermons ce chat pour inactivité. Revenez quand vous voulez. Merci. 💐",
                        "Wir schließen den Chat wegen Inaktivität. Melden Sie sich jederzeit wieder. Danke. 💐",
                        "Чат закрыт из‑за неактивности. Обращайтесь снова, когда понадобится помощь. 💐",
                    )
                });
            }
            
            toast.success(
                reason === "timeout"
                    ? tr(
                          "무응답으로 인해 상담이 종료되었습니다.",
                          "Chat closed due to inactivity.",
                          "Cuộc trò chuyện đã đóng do không phản hồi.",
                          "無応答のためチャットを終了しました。",
                          "因无回复，会话已结束。",
                          "Chat cerrado por inactividad.",
                          "Chat encerrado por inatividade.",
                          "Chat fermé pour inactivité.",
                          "Chat wegen Inaktivität geschlossen.",
                          "Чат закрыт из‑за неактивности.",
                      )
                    : tr(
                          "상담이 정중히 종료되었습니다.",
                          "Chat closed.",
                          "Cuộc trò chuyện đã kết thúc.",
                          "チャットを終了しました。",
                          "会话已结束。",
                          "Chat cerrado.",
                          "Chat encerrado.",
                          "Chat terminé.",
                          "Chat beendet.",
                          "Чат закрыт.",
                      )
            );
            setSelectedRoom(null);
            fetchRooms();
        } catch (err) {
            toast.error(
                tr(
                    "상담 종료 실패",
                    "Failed to close chat",
                    "Không thể đóng cuộc trò chuyện.",
                    "チャットを終了できませんでした。",
                    "无法结束会话。",
                    "No se pudo cerrar el chat.",
                    "Não foi possível encerrar o chat.",
                    "Impossible de fermer le chat.",
                    "Chat konnte nicht beendet werden.",
                    "Не удалось закрыть чат.",
                ),
            );
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
                            toast(
                                tr(
                                    "새 문의가 도착했습니다",
                                    "New inquiry arrived",
                                    "Có yêu cầu mới",
                                    "新しいお問い合わせがあります",
                                    "有新咨询",
                                    "Nueva consulta recibida",
                                    "Nova mensagem recebida",
                                    "Nouvelle demande reçue",
                                    "Neue Anfrage eingegangen",
                                    "Новое обращение",
                                ),
                                {
                                description: payload.new.content?.substring(0, 30),
                                action: {
                                    label: tr("열기", "Open", "Mở", "開く", "打开", "Abrir", "Abrir", "Ouvrir", "Öffnen", "Открыть"),
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
                    userName: profile?.name,
                    uiLocale: locale,
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
                ai_sender_name: tr(
                        'Flora AI 비서',
                        'Flora AI Assistant',
                        'Trợ lý AI Flora',
                        'Flora AI アシスタント',
                        'Flora AI 助手',
                        'Asistente Flora AI',
                        'Assistente Flora AI',
                        'Assistant Flora AI',
                        'Flora‑AI‑Assistent',
                        'Ассистент Flora AI',
                    ),
                content: aiContent
            });

            if (insertError) {
                console.error('[AI] Message insert error:', insertError);
                toast.error(
                    tr(
                        "AI 답변 저장 실패: ",
                        "Failed to save AI reply: ",
                        "Không lưu được phản hồi AI: ",
                        "AI回答の保存に失敗: ",
                        "保存 AI 回复失败：",
                        "Error al guardar la respuesta de la IA: ",
                        "Falha ao salvar resposta da IA: ",
                        "Échec de l’enregistrement de la réponse IA : ",
                        "KI-Antwort konnte nicht gespeichert werden: ",
                        "Не удалось сохранить ответ ИИ: ",
                    ) +
                        insertError.message
                );
                return;
            }

            // 룸 상태 업데이트
            if (data.status === 'success') {
                await supabase.from('chat_rooms').update({
                    needs_human: data.needsHuman || false,
                    last_activity_at: new Date().toISOString()
                }).eq('id', roomId);
                
                if (data.needsHuman) {
                    toast.info(
                        tr(
                            "상담원 연결이 필요하여 관리자에게 알림을 보냈습니다.",
                            "Notified admin for human counselor connection.",
                            "Đã thông báo quản trị viên cần kết nối tư vấn viên.",
                            "有人対応が必要なため管理者に通知しました。",
                            "需要人工客服，已通知管理员。",
                            "Se notificó al administrador para conectar un agente humano.",
                            "Notificamos o administrador para atendimento humano.",
                            "L’administrateur a été notifié pour une prise en charge humaine.",
                            "Administrator wurde über Bedarf an menschlicher Beratung informiert.",
                            "Администратор уведомлён о необходимости оператора.",
                        )
                    );
                }
            }

            // 메시지 새로고침
            fetchMessages(roomId);
        } catch (err: any) {
            console.error("AI Response Error:", err);
            toast.error(
                tr(
                    "AI 응답 오류: ",
                    "AI response error: ",
                    "Lỗi phản hồi AI: ",
                    "AI応答エラー: ",
                    "AI 响应错误：",
                    "Error de respuesta de la IA: ",
                    "Erro na resposta da IA: ",
                    "Erreur de réponse IA : ",
                    "KI-Antwortfehler: ",
                    "Ошибка ответа ИИ: ",
                ) +
                    (err?.message ||
                        tr(
                            "알 수 없는 에러",
                            "Unknown error",
                            "Lỗi không xác định",
                            "不明なエラー",
                            "未知错误",
                            "Error desconocido",
                            "Erro desconhecido",
                            "Erreur inconnue",
                            "Unbekannter Fehler",
                            "Неизвестная ошибка",
                        ))
            );
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
                        ai_sender_name: tr(
                        'Flora AI 비서',
                        'Flora AI Assistant',
                        'Trợ lý AI Flora',
                        'Flora AI アシスタント',
                        'Flora AI 助手',
                        'Asistente Flora AI',
                        'Assistente Flora AI',
                        'Assistant Flora AI',
                        'Flora‑AI‑Assistent',
                        'Ассистент Flora AI',
                    ),
                        content: `**${faqMatch.question}**\n\n${faqMatch.answer}\n\n---\n*${tr(
                            "더 궁금한 점이 있으시면 더 자세히 묻어보세요!",
                            "If you need more detail, feel free to ask a follow-up question!",
                            "Nếu cần chi tiết hơn, hãy hỏi thêm!",
                            "詳しく知りたい場合は、続けてご質問ください！",
                            "如需更多细节，欢迎继续提问！",
                            "Si necesitas más detalle, pregunta lo que quieras.",
                            "Se precisar de mais detalhes, pergunte à vontade.",
                            "Pour plus de détails, posez une autre question !",
                            "Bei Rückfragen einfach weiterfragen!",
                            "Если нужны подробности — спрашивайте!",
                        )}*`
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
            toast.error(
                tr(
                    "전송 실패",
                    "Send failed",
                    "Gửi thất bại",
                    "送信に失敗しました",
                    "发送失败",
                    "Error al enviar",
                    "Falha ao enviar",
                    "Échec de l’envoi",
                    "Senden fehlgeschlagen",
                    "Не удалось отправить",
                ),
            );
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
            toast.error(
                tr(
                    "업로드 실패",
                    "Upload failed",
                    "Tải lên thất bại",
                    "アップロードに失敗しました",
                    "上传失败",
                    "Error al subir",
                    "Falha no upload",
                    "Échec du téléversement",
                    "Upload fehlgeschlagen",
                    "Не удалось загрузить",
                ),
            );
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
                toast.warning(
                    tr(
                        "현재 상담량이 많아 대기가 필요합니다.",
                        "High support volume. Please wait.",
                        "Hiện lượng tư vấn cao, vui lòng chờ.",
                        "現在混み合っているためお待ちください。",
                        "咨询量较大，请稍候。",
                        "Hay mucha demanda de soporte. Espere.",
                        "Alto volume de atendimento. Aguarde.",
                        "Fort afflux de demandes. Merci d’attendre.",
                        "Hohe Auslastung. Bitte warten.",
                        "Высокая нагрузка на поддержку. Подождите.",
                    ),
                    {
                        description: tr(
                            "잠시 후 다시 시도해 주시거나 잠시 기다려 주세요.",
                            "Please try again shortly or wait a moment.",
                            "Vui lòng thử lại sau hoặc đợi một lúc.",
                            "しばらくしてから再度お試しください。",
                            "请稍后再试或稍候片刻。",
                            "Inténtelo de nuevo en unos momentos.",
                            "Tente novamente em instantes.",
                            "Réessayez dans un instant.",
                            "Bitte kurz warten oder erneut versuchen.",
                            "Повторите попытку через некоторое время.",
                        ),
                    }
                );
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
                    metadata: {
                        title: tr(
                            "관리자 상담",
                            "Admin support",
                            "Hỗ trợ quản trị",
                            "管理者サポート",
                            "管理员咨询",
                            "Soporte de administración",
                            "Suporte administrativo",
                            "Support administrateur",
                            "Admin-Support",
                            "Поддержка администратора",
                        ),
                    },
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
                ai_sender_name: tr(
                        'Flora AI 비서',
                        'Flora AI Assistant',
                        'Trợ lý AI Flora',
                        'Flora AI アシスタント',
                        'Flora AI 助手',
                        'Asistente Flora AI',
                        'Assistente Flora AI',
                        'Assistant Flora AI',
                        'Flora‑AI‑Assistent',
                        'Ассистент Flora AI',
                    ),
                content: tr(
                    "안녕하세요 사장님! 플록싱크 헬프데스크에 오신 것을 정중히 환영합니다. 꽃집을 운영하시면서 생기는 궁금증이나 불편한 점을 제가 친절하게 해결해 드릴게요. 무엇부터 도와드릴까요? 🌸",
                    "Welcome to Floxync Helpdesk! I can assist with questions or issues from your flower shop operations. What can I help with first? 🌸",
                    "Chào bạn! Chào mừng đến Helpdesk Floxync. Tôi có thể hỗ trợ thắc mắc hoặc vấn đề khi vận hành tiệm hoa. Bạn cần gì trước? 🌸",
                    "いらっしゃいませ。Floxyncヘルプデスクへようこそ。花店運営の疑問やお困りごとを丁寧にサポートします。まずは何からお手伝いしましょうか？🌸",
                    "欢迎光临 Floxync 帮助台。我可以协助解答花店经营中的疑问或问题。先从哪里开始？🌸",
                    "¡Bienvenido al Helpdesk de Floxync! Puedo ayudarte con dudas u operación de tu floristería. ¿Por dónde empezamos? 🌸",
                    "Bem-vindo ao Helpdesk Floxync! Posso ajudar com dúvidas ou a operação da sua floricultura. Por onde começamos? 🌸",
                    "Bienvenue sur l’assistance Floxync ! Je peux vous aider sur votre fleuriste. Par quoi commençons-nous ? 🌸",
                    "Willkommen beim Floxync-Helpdesk! Ich helfe bei Fragen zum Blumenladen. Womit soll ich starten? 🌸",
                    "Добро пожаловать в справочную Floxync! Помогу с вопросами по цветочному магазину. С чего начнём? 🌸",
                )
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
        const lastMsg =
            room.lastMessage?.content ||
            tr(
                "대화 내역이 있습니다.",
                "There is conversation history.",
                "Có lịch sử trò chuyện.",
                "会話履歴があります。",
                "有对话记录。",
                "Hay historial de conversación.",
                "Há histórico de conversa.",
                "Historique de conversation disponible.",
                "Es gibt einen Chatverlauf.",
                "Есть история переписки.",
            );

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
                            {other?.tenant?.name ||
                                tr(
                                    "상담 대기",
                                    "Waiting for support",
                                    "Đang chờ tư vấn",
                                    "相談待ち",
                                    "等待接入",
                                    "En espera de soporte",
                                    "Aguardando atendimento",
                                    "En attente du support",
                                    "Wartet auf Support",
                                    "Ожидание консультанта",
                                )}
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
        return (
            other?.tenant?.name ||
            tr(
                "상담 고객",
                "Support customer",
                "Khách hỗ trợ",
                "相談のお客様",
                "咨询客户",
                "Cliente de soporte",
                "Cliente em suporte",
                "Client support",
                "Support-Kunde",
                "Клиент поддержки",
            )
        );
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
                                            <span>
                                                {tr(
                                                    "실시간 상담 관제 센터",
                                                    "Real-time support control center",
                                                    "Trung tâm giám sát hỗ trợ thời gian thực",
                                                    "リアルタイム相談管制センター",
                                                    "实时客服监控中心",
                                                    "Centro de control de soporte en tiempo real",
                                                    "Central de suporte em tempo real",
                                                    "Centre de supervision du support en temps réel",
                                                    "Echtzeit-Support-Leitstand",
                                                    "Центр мониторинга поддержки в реальном времени",
                                                )}
                                            </span>
                                        </>
                                    ) : (
                                        selectedRoom
                                            ? tr(
                                                  "관리자 1:1 상담",
                                                  "Admin 1:1 support",
                                                  "Tư vấn 1:1 với quản trị",
                                                  "管理者1対1サポート",
                                                  "管理员一对一咨询",
                                                  "Soporte 1:1 con administración",
                                                  "Atendimento 1:1 com administração",
                                                  "Assistance 1:1 administrateur",
                                                  "Admin-1:1-Support",
                                                  "Поддержка 1:1 с администратором",
                                              )
                                            : tr(
                                                  "메시지 센터",
                                                  "Message center",
                                                  "Trung tâm tin nhắn",
                                                  "メッセージセンター",
                                                  "消息中心",
                                                  "Centro de mensajes",
                                                  "Central de mensagens",
                                                  "Centre de messages",
                                                  "Nachrichtenzentrum",
                                                  "Центр сообщений",
                                              )
                                    )}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase">
                                        {selectedRoom?.active_counselor === "human"
                                            ? tr(
                                                  "상담원 직접 개입 중",
                                                  "Human counselor is active",
                                                  "Tư vấn viên đang tham gia",
                                                  "有人オペレーター対応中",
                                                  "人工客服接入中",
                                                  "Operador humano activo",
                                                  "Atendente humano ativo",
                                                  "Conseiller humain actif",
                                                  "Menschlicher Berater aktiv",
                                                  "Подключён оператор",
                                              )
                                            : tr(
                                                  "AI 비서 정중히 응대 중",
                                                  "AI assistant is responding",
                                                  "Trợ lý AI đang trả lời",
                                                  "AIアシスタントが対応中",
                                                  "AI 助手正在回复",
                                                  "El asistente de IA está respondiendo",
                                                  "O assistente de IA está respondendo",
                                                  "L’assistant IA répond",
                                                  "KI-Assistent antwortet",
                                                  "Ассистент ИИ отвечает",
                                              )}
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
                                                toast.success(
                                                    nextMode === "ai"
                                                        ? tr(
                                                              "AI 비서에게 상담을 다시 맡겼습니다.",
                                                              "Switched back to AI assistant.",
                                                              "Đã chuyển lại cho trợ lý AI.",
                                                              "再びAIアシスタントに切り替えました。",
                                                              "已切换回 AI 助手。",
                                                              "Vuelto al asistente de IA.",
                                                              "Retornado ao assistente de IA.",
                                                              "Retour à l’assistant IA.",
                                                              "Zurück zum KI-Assistenten.",
                                                              "Снова включён ИИ-ассистент.",
                                                          )
                                                        : tr(
                                                              "상담사가 직접 개입합니다.",
                                                              "Human counselor now takes over.",
                                                              "Tư vấn viên đã tiếp quản.",
                                                              "有人オペレーターが対応します。",
                                                              "人工客服已接入。",
                                                              "Un operador humano toma el control.",
                                                              "Um atendente humano assume.",
                                                              "Un conseiller prend le relais.",
                                                              "Ein Berater übernimmt jetzt.",
                                                              "Подключён живой оператор.",
                                                          )
                                                );
                                            }
                                        }}
                                    >
                                        {selectedRoom.active_counselor === "ai"
                                            ? tr(
                                                  "상담사 개입",
                                                  "Switch to human",
                                                  "Chuyển sang tư vấn viên",
                                                  "有人へ切替",
                                                  "转人工",
                                                  "Pasar a humano",
                                                  "Falar com humano",
                                                  "Passer à un humain",
                                                  "Zu Mensch wechseln",
                                                  "К оператору",
                                              )
                                            : tr(
                                                  "AI에게 다시 맡기기",
                                                  "Switch to AI",
                                                  "Chuyển lại cho AI",
                                                  "AIに戻す",
                                                  "交回 AI",
                                                  "Volver a la IA",
                                                  "Voltar para IA",
                                                  "Revenir à l’IA",
                                                  "Zurück zur KI",
                                                  "К ИИ",
                                              )}
                                    </Button>
                                )}
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="bg-rose-500/10 hover:bg-rose-500 border-rose-500/20 text-rose-400 hover:text-white rounded-xl text-xs font-black shadow-sm h-8"
                                    onClick={() => {
                                        if (
                                            confirm(
                                                tr(
                                                    "상담을 정말 종료하시겠습니까?",
                                                    "Are you sure you want to close this chat?",
                                                    "Bạn có chắc muốn kết thúc cuộc trò chuyện?",
                                                    "チャットを終了しますか？",
                                                    "确定要结束会话吗？",
                                                    "¿Cerrar este chat?",
                                                    "Encerrar este chat?",
                                                    "Fermer ce chat ?",
                                                    "Chat wirklich beenden?",
                                                    "Закрыть этот чат?",
                                                )
                                            )
                                        ) {
                                            handleEndChat();
                                        }
                                    }}
                                >
                                    <Clock size={14} className="mr-2" />{" "}
                                    {tr(
                                        "상담 종료",
                                        "Close chat",
                                        "Kết thúc",
                                        "チャット終了",
                                        "结束会话",
                                        "Cerrar chat",
                                        "Encerrar chat",
                                        "Fermer le chat",
                                        "Chat beenden",
                                        "Закрыть чат",
                                    )}
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
                                                {showClosed
                                                    ? tr(
                                                          "상담 기록",
                                                          "History",
                                                          "Lịch sử",
                                                          "相談履歴",
                                                          "咨询记录",
                                                          "Historial",
                                                          "Histórico",
                                                          "Historique",
                                                          "Verlauf",
                                                          "История",
                                                      )
                                                    : tr(
                                                          "상담 목록",
                                                          "Chat list",
                                                          "Danh sách",
                                                          "相談一覧",
                                                          "会话列表",
                                                          "Lista de chats",
                                                          "Lista de chats",
                                                          "Liste des chats",
                                                          "Chatliste",
                                                          "Список чатов",
                                                      )}
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
                                            {showClosed
                                                ? tr(
                                                      "← 목록 보기",
                                                      "← Show list",
                                                      "← Xem danh sách",
                                                      "← 一覧へ",
                                                      "← 返回列表",
                                                      "← Ver lista",
                                                      "← Ver lista",
                                                      "← Voir la liste",
                                                      "← Zur Liste",
                                                      "← К списку",
                                                  )
                                                : tr(
                                                      "기록 보기",
                                                      "Show history",
                                                      "Xem lịch sử",
                                                      "履歴を見る",
                                                      "查看记录",
                                                      "Ver historial",
                                                      "Ver histórico",
                                                      "Voir l’historique",
                                                      "Verlauf anzeigen",
                                                      "Смотреть историю",
                                                  )}
                                        </Button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto pb-4 scrollbar-hide">
                                        {rooms.map((room) => <RoomItem key={room.id} room={room} />)}
                                        {rooms.length === 0 && (
                                            <div className="flex flex-col items-center justify-center pt-20 px-4 text-center">
                                                <Archive className="w-8 h-8 text-slate-200 mb-2" />
                                                <p className="text-[11px] text-slate-400 italic">
                                                    {showClosed
                                                        ? tr(
                                                              "아직 종료된 상담이 없습니다.",
                                                              "No closed chats yet.",
                                                              "Chưa có cuộc trò chuyện đã đóng.",
                                                              "終了した相談はまだありません。",
                                                              "暂无已结束的会话。",
                                                              "Aún no hay chats cerrados.",
                                                              "Ainda não há chats encerrados.",
                                                              "Pas encore de chats fermés.",
                                                              "Noch keine geschlossenen Chats.",
                                                              "Закрытых чатов пока нет.",
                                                          )
                                                        : tr(
                                                              "진행 중인 상담이 없습니다.",
                                                              "No active chats.",
                                                              "Không có cuộc trò chuyện đang diễn ra.",
                                                              "進行中の相談はありません。",
                                                              "没有进行中的会话。",
                                                              "No hay chats activos.",
                                                              "Não há chats ativos.",
                                                              "Aucun chat actif.",
                                                              "Keine aktiven Chats.",
                                                              "Нет активных чатов.",
                                                          )}
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
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">
                                                        {tr(
                                                            "상담대상:",
                                                            "Target:",
                                                            "Đối tượng:",
                                                            "相談相手:",
                                                            "对象:",
                                                            "Destino:",
                                                            "Destino:",
                                                            "Cible :",
                                                            "Ziel:",
                                                            "Объект:",
                                                        )}
                                                    </span>
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
                                                                        <img
                                                                            src={msg.image_url}
                                                                            alt={tr(
                                                                                "첨부 이미지",
                                                                                "Attached image",
                                                                                "Ảnh đính kèm",
                                                                                "添付画像",
                                                                                "附件图片",
                                                                                "Imagen adjunta",
                                                                                "Imagem anexada",
                                                                                "Image jointe",
                                                                                "Angehängtes Bild",
                                                                                "Вложенное изображение",
                                                                            )}
                                                                            className="rounded-xl mb-2 max-h-40 w-full object-cover cursor-pointer"
                                                                            onClick={() => window.open(msg.image_url, "_blank")}
                                                                        />
                                                                    )}
                                                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                                </div>
                                                                <span className="text-[9px] text-slate-300 font-bold mt-1 px-1">
                                                                    {isAI
                                                                        ? (msg.ai_sender_name || tr(
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                    ))
                                                                        : !isMe && `${msg.sender_tenant?.name || ""}`}{" "}
                                                                    • {format(messageDate, "HH:mm")}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                    {isAILoading && (
                                                        <div className="flex items-center gap-2 text-indigo-500 animate-pulse text-[10px] font-bold uppercase tracking-widest pl-2">
                                                            <RefreshCw size={12} className="animate-spin" />
                                                            {tr(
                                                                "AI 비서가 정중히 답변을 작성 중입니다...",
                                                                "AI assistant is preparing a reply...",
                                                                "Trợ lý AI đang soạn phản hồi...",
                                                                "AIアシスタントが返信を作成しています…",
                                                                "AI 助手正在撰写回复…",
                                                                "El asistente de IA está redactando una respuesta…",
                                                                "O assistente de IA está preparando a resposta…",
                                                                "L’assistant IA rédige une réponse…",
                                                                "Der KI-Assistent erstellt eine Antwort…",
                                                                "Ассистент ИИ готовит ответ…",
                                                            )}
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
                                                {showClosed
                                                    ? tr(
                                                          "상담 기록을 확인하세요",
                                                          "Check your consultation records",
                                                          "Vui lòng xem lịch sử tư vấn",
                                                          "相談履歴をご確認ください",
                                                          "请查看咨询记录",
                                                          "Consulta el historial de asistencia",
                                                          "Veja o histórico de atendimento",
                                                          "Consultez l’historique d’assistance",
                                                          "Bitte den Beratungsverlauf prüfen",
                                                          "Просмотрите историю обращений",
                                                      )
                                                    : tr(
                                                          "사장님들을 정중히 모십니다",
                                                          "Welcome to support",
                                                          "Chào mừng đến hỗ trợ",
                                                          "ご利用ありがとうございます",
                                                          "欢迎联系支持",
                                                          "Bienvenido al soporte",
                                                          "Bem-vindo ao suporte",
                                                          "Bienvenue au support",
                                                          "Willkommen beim Support",
                                                          "Добро пожаловать в поддержку",
                                                      )}
                                            </h4>
                                            <p className="text-xs max-w-[200px] leading-relaxed">
                                                {showClosed
                                                    ? tr(
                                                          "왼쪽 상담 기록에서 화원사를 선택하여 대화 내용을 열람하실 수 있습니다.",
                                                          "Select a florist from the left records to view the conversation.",
                                                          "Chọn tiệm hoa từ lịch sử bên trái để xem nội dung trò chuyện.",
                                                          "左の履歴から花屋を選び、会話内容を確認できます。",
                                                          "在左侧记录中选择花店即可查看对话。",
                                                          "Elige una floristería en el historial izquierdo para ver el chat.",
                                                          "Selecione uma floricultura à esquerda para ver a conversa.",
                                                          "Sélectionnez un fleuriste dans l’historique à gauche.",
                                                          "Wählen Sie links im Verlauf einen Floristen aus.",
                                                          "Выберите цветочный магазин в списке слева.",
                                                      )
                                                    : tr(
                                                          "왼쪽 목록에서 화원사를 선택하여 실시간 기술 지원을 시작하세요.",
                                                          "Select a florist on the left to start real-time support.",
                                                          "Chọn tiệm hoa trong danh sách bên trái để bắt đầu hỗ trợ kỹ thuật thời gian thực.",
                                                          "左の一覧から花屋を選び、リアルタイム技術サポートを開始します。",
                                                          "在左侧列表中选择花店以开始实时技术支持。",
                                                          "Selecciona una floristería a la izquierda para iniciar soporte en vivo.",
                                                          "Selecione uma floricultura à esquerda para suporte em tempo real.",
                                                          "Choisissez un fleuriste à gauche pour démarrer le support en direct.",
                                                          "Wählen Sie links einen Floristen für Live-Support.",
                                                          "Выберите магазин слева для поддержки в реальном времени.",
                                                      )}
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
                                                    <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
                                                        {tr(
                                                            "본사 상담 업무 시간",
                                                            "HQ consultation hours",
                                                            "Giờ làm việc tư vấn trụ sở",
                                                            "本社サポート時間",
                                                            "总部咨询时间",
                                                            "Horario de soporte de sede",
                                                            "Horário de suporte da matriz",
                                                            "Heures d’assistance siège",
                                                            "Support-Zeiten Zentrale",
                                                            "Часы поддержки головного офиса",
                                                        )}
                                                    </h5>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-400">
                                                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                                        <p className="text-slate-900 font-black mb-0.5 uppercase tracking-tighter italic mr-1">
                                                            {tr(
                                                                "평일",
                                                                "Weekdays",
                                                                "Ngày trong tuần",
                                                                "平日",
                                                                "工作日",
                                                                "Entre semana",
                                                                "Dias úteis",
                                                                "Semaine",
                                                                "Werktags",
                                                                "Будни",
                                                            )}
                                                        </p>
                                                        <p>09:00 - 18:00</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                                        <p className="text-slate-900 font-black mb-0.5 uppercase tracking-tighter italic mr-1">
                                                            {tr(
                                                                "주말/공휴일",
                                                                "Weekend/Holiday",
                                                                "Cuối tuần/Ngày lễ",
                                                                "土日祝",
                                                                "周末/节假日",
                                                                "Fin de semana / festivo",
                                                                "Fim de semana / feriado",
                                                                "Week-end / jours fériés",
                                                                "Wochenende / Feiertage",
                                                                "Выходные / праздники",
                                                            )}
                                                        </p>
                                                        <p>
                                                            {tr("휴무", "Closed", "Nghỉ", "休業", "休息", "Cerrado", "Fechado", "Fermé", "Geschlossen", "Выходной")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="pt-2 flex items-start gap-2 text-[9px] font-bold text-slate-400 leading-normal border-t border-slate-50">
                                                    <Info size={12} className="shrink-0 text-amber-500 mt-0.5" />
                                                    <p>
                                                        {tr(
                                                            "상담 기록 및 전송 이미지는 개인정보 보안 및 서버 용량 최적화를 위해 ",
                                                            "Consultation records and uploaded images are ",
                                                            "Hồ sơ tư vấn và ảnh tải lên được ",
                                                            "相談履歴と送信画像は、個人情報保護とサーバー容量の最適化のため",
                                                            "咨询记录与上传图片出于隐私与存储优化",
                                                            "Los registros de consulta y las imágenes enviadas se ",
                                                            "Os registros de atendimento e imagens enviadas são ",
                                                            "Les dossiers de consultation et les images envoyées sont ",
                                                            "Beratungsprotokolle und hochgeladene Bilder werden ",
                                                            "Записи консультаций и загруженные изображения ",
                                                        )}
                                                        <span className="text-amber-600 font-black">
                                                            {tr(
                                                                "7일 경과 후 자동 파기",
                                                                "automatically deleted after 7 days",
                                                                "tự động xóa sau 7 ngày",
                                                                "7日後に自動削除",
                                                                "7 天后自动删除",
                                                                "se borran automáticamente a los 7 días",
                                                                "são excluídos automaticamente após 7 dias",
                                                                "sont supprimés automatiquement après 7 jours",
                                                                "werden nach 7 Tagen automatisch gelöscht",
                                                                "автоматически удаляются через 7 дней",
                                                            )}
                                                        </span>
                                                        {tr(
                                                            "됩니다. 중요한 정보는 미리 확인해 주세요.",
                                                            " for privacy and storage optimization. Please save important information in advance.",
                                                            " vì bảo mật và tối ưu dung lượng. Vui lòng lưu thông tin quan trọng trước.",
                                                            "されます。重要な情報は事前にご確認ください。",
                                                            "。请提前保存重要信息。",
                                                            " por privacidad y almacenamiento. Guarde la información importante con antelación.",
                                                            " por privacidade e armazenamento. Salve informações importantes com antecedência.",
                                                            " pour confidentialité et stockage. Conservez les informations importantes à l’avance.",
                                                            " aus Datenschutz und Speichergründen. Bitte wichtige Infos vorab sichern.",
                                                            " в целях конфиденциальности и хранения. Сохраните важное заранее.",
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* FAQ 바로 찾기 섹션 */}
                                            {faqAnswer ? (
                                                <div className="bg-indigo-50 border border-indigo-100 rounded-[1.5rem] p-5 space-y-3">
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-lg">🤖</span>
                                                        <div>
                                                            <p className="text-[11px] font-black text-indigo-600 mb-1 uppercase tracking-widest">
                                                                {tr(
                                                                    "AI 빠른 답변",
                                                                    "AI quick answer",
                                                                    "Trả lời nhanh AI",
                                                                    "AIクイック回答",
                                                                    "AI 快速解答",
                                                                    "Respuesta rápida de IA",
                                                                    "Resposta rápida da IA",
                                                                    "Réponse rapide IA",
                                                                    "KI-Schnellantwort",
                                                                    "Быстрый ответ ИИ",
                                                                )}
                                                            </p>
                                                            <p className="text-xs font-bold text-slate-700 mb-2">{faqAnswer.q}</p>
                                                            <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">{faqAnswer.a}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 pt-2 border-t border-indigo-100">
                                                        <Button size="sm" variant="outline" className="flex-1 text-[10px] font-black h-8 rounded-xl"
                                                            onClick={() => { setFaqAnswer(null); setSelectedCategory(null); }}>
                                                            {tr(
                                                                "← 다른 질문",
                                                                "← Other questions",
                                                                "← Câu hỏi khác",
                                                                "← 他の質問",
                                                                "← 其他问题",
                                                                "← Otras preguntas",
                                                                "← Outras perguntas",
                                                                "← Autres questions",
                                                                "← Weitere Fragen",
                                                                "← Другие вопросы",
                                                            )}
                                                        </Button>
                                                        <Button size="sm" className="flex-1 text-[10px] font-black h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                                                            onClick={() => { setFaqAnswer(null); startSupportChat(); }}>
                                                            {tr(
                                                                "AI에게 더 묻기",
                                                                "Ask AI more",
                                                                "Hỏi AI thêm",
                                                                "AIにもっと聞く",
                                                                "继续问 AI",
                                                                "Preguntar más a la IA",
                                                                "Perguntar mais à IA",
                                                                "Demander plus à l’IA",
                                                                "Mehr an die KI fragen",
                                                                "Спросить ИИ ещё",
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : selectedCategory ? (
                                                // [2단계] 선택된 카테고리 질문만 표시
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <button className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-indigo-600 transition-colors"
                                                            onClick={() => setSelectedCategory(null)}>
                                                            {tr(
                                                                "← 카테고리로 돌아가기",
                                                                "← Back to categories",
                                                                "← Quay lại danh mục",
                                                                "← カテゴリに戻る",
                                                                "← 返回分类",
                                                                "← Volver a categorías",
                                                                "← Voltar às categorias",
                                                                "← Retour aux catégories",
                                                                "← Zurück zu Kategorien",
                                                                "← К категориям",
                                                            )}
                                                        </button>
                                                        <span className="text-[9px] text-slate-400">
                                                            {faqData.filter((f) => f.category === selectedCategory).length}
                                                            {tr(
                                                                "개 항목",
                                                                " items",
                                                                " mục",
                                                                "件",
                                                                " 项",
                                                                " elementos",
                                                                " itens",
                                                                " éléments",
                                                                " Einträge",
                                                                " поз.",
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 pb-1">
                                                        <span className="text-base">{faqData.find((f:any) => f.category === selectedCategory)?.category_icon}</span>
                                                        <p className="text-[12px] font-black text-slate-800">{selectedCategory ? localizeFaqCategory(selectedCategory) : selectedCategory}</p>
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
                                                    <p className="text-[9px] text-slate-400 text-center pt-1">
                                                        {tr(
                                                            "원하는 답변이 없으면 아래 AI 상담을 이용하세요",
                                                            "If you cannot find the answer, use AI support below.",
                                                            "Không tìm thấy câu trả lời? Hãy dùng tư vấn AI bên dưới.",
                                                            "答えが見つからない場合は下のAI相談をご利用ください",
                                                            "找不到答案请使用下方 AI 咨询",
                                                            "Si no encuentras la respuesta, usa el soporte de IA abajo.",
                                                            "Se não achar a resposta, use o suporte de IA abaixo.",
                                                            "Sans réponse ? Utilisez l’assistance IA ci-dessous.",
                                                            "Keine Antwort? Nutzen Sie unten den KI-Chat.",
                                                            "Нет ответа? Используйте ИИ-консультацию ниже.",
                                                        )}
                                                    </p>
                                                </div>
                                            ) : (
                                                // [1단계] 카테고리 그리드만 표시
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base">⚡</span>
                                                        <p className="text-[11px] font-black text-slate-700">
                                                            {tr(
                                                                "무엇을 도와드릴까요?",
                                                                "How can we help you?",
                                                                "Chúng tôi có thể giúp gì cho bạn?",
                                                                "何をお手伝いしましょうか？",
                                                                "需要什么帮助？",
                                                                "¿En qué podemos ayudarte?",
                                                                "Como podemos ajudar?",
                                                                "Comment pouvons-nous vous aider ?",
                                                                "Womit können wir helfen?",
                                                                "Чем помочь?",
                                                            )}
                                                        </p>
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
                                                                <span className="text-[11px] font-black text-slate-700 group-hover:text-indigo-700 block">{localizeFaqCategory(faq.category)}</span>
                                                                <span className="text-[9px] text-slate-400">
                                                                    {faqData.filter((d: any) => d.category === faq.category).length}
                                                                    {tr(
                                                                        "개 질문",
                                                                        " questions",
                                                                        " câu hỏi",
                                                                        "件の質問",
                                                                        " 个问题",
                                                                        " preguntas",
                                                                        " perguntas",
                                                                        " questions",
                                                                        " Fragen",
                                                                        " вопр.",
                                                                    )}
                                                                </span>
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
                                                    <span className="font-black text-sm">
                                                        {tr(
                                                            "찾는 답변이 없다면? AI 상담",
                                                            "Need more help? AI support",
                                                            "Không tìm thấy? Tư vấn AI",
                                                            "答えが見つからない？AI相談",
                                                            "没找到答案？AI 咨询",
                                                            "¿No encuentras respuesta? Soporte IA",
                                                            "Não achou? Suporte IA",
                                                            "Pas de réponse ? Assistance IA",
                                                            "Keine Antwort? KI-Support",
                                                            "Нет ответа? ИИ-поддержка",
                                                        )}
                                                    </span>
                                                    <span className="text-[9px] font-medium text-white/50 uppercase tracking-widest">
                                                        {tr(
                                                            "AI + 상담원 하이브리드 지원",
                                                            "AI + agent hybrid support",
                                                            "Hỗ trợ lai AI + tư vấn viên",
                                                            "AI＋有人のハイブリッド対応",
                                                            "AI + 人工混合支持",
                                                            "Soporte híbrido IA + humano",
                                                            "Suporte híbrido IA + humano",
                                                            "Assistance hybride IA + humain",
                                                            "Hybrid: KI + Mensch",
                                                            "Гибрид: ИИ + оператор",
                                                        )}
                                                    </span>
                                                </div>
                                            </Button>
                                            <div className="flex items-center gap-4 px-1">
                                                <h5 className="text-[10px] font-black text-slate-300 uppercase tracking-widest shrink-0">
                                                    {tr(
                                                        "최근 상담 기록",
                                                        "Recent Conversations",
                                                        "Cuộc trò chuyện gần đây",
                                                        "最近の相談",
                                                        "最近会话",
                                                        "Conversaciones recientes",
                                                        "Conversas recentes",
                                                        "Conversations récentes",
                                                        "Letzte Chats",
                                                        "Недавние чаты",
                                                    )}
                                                </h5>
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
                                                                        <img
                                                                            src={msg.content}
                                                                            alt={tr(
                                                                                "채팅 이미지",
                                                                                "Chat image",
                                                                                "Ảnh trò chuyện",
                                                                                "チャット画像",
                                                                                "聊天图片",
                                                                                "Imagen del chat",
                                                                                "Imagem do chat",
                                                                                "Image du chat",
                                                                                "Chat-Bild",
                                                                                "Изображение в чате",
                                                                            )}
                                                                            className="rounded-2xl max-w-full h-auto border border-slate-100"
                                                                        />
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
                                                                    {isAI
                                                                        ? msg.ai_sender_name || tr(
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                        "Flora AI",
                                                                    )
                                                                        : tr(
                                                                              "나",
                                                                              "Me",
                                                                              "Tôi",
                                                                              "自分",
                                                                              "我",
                                                                              "Yo",
                                                                              "Eu",
                                                                              "Moi",
                                                                              "Ich",
                                                                              "Я",
                                                                          )}{" "}
                                                                    • {format(messageDate, "HH:mm")}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                {isAILoading && (
                                                    <div className="flex items-center gap-2 text-indigo-500 animate-pulse text-[9px] font-bold uppercase tracking-widest pl-2">
                                                        <RefreshCw size={10} className="animate-spin" />
                                                        {tr(
                                                            "AI 비서가 답변을 작성 중입니다...",
                                                            "AI assistant is writing a reply...",
                                                            "Trợ lý AI đang viết phản hồi...",
                                                            "AIアシスタントが返信を作成中…",
                                                            "AI 助手正在撰写回复…",
                                                            "El asistente de IA está escribiendo…",
                                                            "O assistente de IA está escrevendo…",
                                                            "L’assistant IA rédige…",
                                                            "Der KI-Assistent schreibt…",
                                                            "Ассистент ИИ пишет ответ…",
                                                        )}
                                                    </div>
                                                )}
                                                <div ref={scrollRef} />
                                            </div>
                                        </div>
                                        <div className="px-4 pb-1">
                                            {/* 실시간 FAQ 제안 첨 */}
                                            {faqSuggestions.length > 0 && !isAILoading && (
                                                <div className="flex flex-wrap gap-1.5 mb-2">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest w-full">
                                                        {tr(
                                                            "💡 이런 내용을 묻는 건가요?",
                                                            "💡 Are you asking about this?",
                                                            "💡 Bạn đang hỏi về nội dung này?",
                                                            "💡 このような内容ですか？",
                                                            "💡 想问的是这个吗？",
                                                            "💡 ¿Te refieres a esto?",
                                                            "💡 É sobre isso?",
                                                            "💡 Vous parlez de ceci ?",
                                                            "💡 Geht es darum?",
                                                            "💡 Вы спрашиваете об этом?",
                                                        )}
                                                    </span>
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
                                                                    ai_sender_name: tr(
                        'Flora AI 비서',
                        'Flora AI Assistant',
                        'Trợ lý AI Flora',
                        'Flora AI アシスタント',
                        'Flora AI 助手',
                        'Asistente Flora AI',
                        'Assistente Flora AI',
                        'Assistant Flora AI',
                        'Flora‑AI‑Assistent',
                        'Ассистент Flora AI',
                    ),
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
    const locale = usePreferredLocale();
    const baseLocale = toBaseLocale(locale);
    const tr = chatTr(baseLocale);
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
                    placeholder={tr(
                        "메시지를 입력하세요...",
                        "Type a message...",
                        "Nhập tin nhắn...",
                        "メッセージを入力…",
                        "输入消息…",
                        "Escribe un mensaje…",
                        "Digite uma mensagem…",
                        "Saisissez un message…",
                        "Nachricht eingeben…",
                        "Введите сообщение…",
                    )} 
                    disabled={loading} 
                />
                <Button variant="default" size="sm" className="shrink-0 h-10 bg-indigo-600 hover:bg-indigo-700 rounded-xl px-4" onClick={onSend} disabled={loading || !value.trim()}>
                    <Send size={16} />
                </Button>
            </div>
        </div>
    );
}
