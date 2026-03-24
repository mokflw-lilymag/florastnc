"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useChat(roomId: string | null) {
    const supabase = createClient();
    const { tenantId, user } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchMessages = useCallback(async () => {
        if (!roomId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('chat_messages')
            .select(`
                *,
                sender_tenant:tenants!chat_messages_sender_tenant_id_fkey(name, logo_url)
            `)
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setMessages(data);
        }
        setLoading(false);
    }, [roomId, supabase]);

    useEffect(() => {
        if (!roomId) return;
        fetchMessages();

        const channel = supabase
            .channel(`room-${roomId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `room_id=eq.${roomId}`
            }, () => {
                fetchMessages();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, fetchMessages, supabase]);

    const sendMessage = async (content: string, imageUrl?: string) => {
        if (!roomId || !tenantId || !user) return;
        
        try {
            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    room_id: roomId,
                    sender_id: user.id,
                    sender_tenant_id: tenantId,
                    content,
                    image_url: imageUrl,
                    origin_url: window.location.href
                });

            if (error) throw error;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    return { messages, loading, sendMessage, refresh: fetchMessages };
}
