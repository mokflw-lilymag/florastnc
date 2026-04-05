import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

interface KioskPayload {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  saveCustomer: boolean;
  receiptType: "delivery_reservation" | "store_pickup" | "pickup_reservation";
  date: string;
  time: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  messageType: "none" | "card" | "ribbon";
  messageContent: string;
  messageSender: string;
}

export function useKioskSession(sessionId: string, isHost: boolean) {
  const [supabase] = useState(() => createClient());
  const [channel, setChannel] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [receivedData, setReceivedData] = useState<KioskPayload | null>(null);
  const [sessionPrice, setSessionPrice] = useState<number>(0);

  useEffect(() => {
    if (!sessionId) return;

    // Create a broadcast channel for this specific session (could be a PIN or a UUID)
    const channelName = sessionId.length <= 4 ? `kiosk-pin-${sessionId}` : `kiosk-${sessionId}`;
    
    const syncChannel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: true }
      }
    });

    syncChannel
      .on("broadcast", { event: "kiosk_submit" }, (payload: any) => {
        if (isHost && payload.payload) {
          setReceivedData(payload.payload as KioskPayload);
        }
      })
      .on("broadcast", { event: "kiosk_init" }, (payload: any) => {
        // When kiosk joins, host sends price and settings
        if (!isHost && payload.payload) {
          setSessionPrice(payload.payload.price || 0);
          setConnected(true);
        }
      })
      .on("broadcast", { event: "kiosk_ping" }, () => {
        setConnected(true);
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          // If we are the client (kiosk), send a ping so host knows we joined
          if (!isHost) {
            syncChannel.send({
              type: "broadcast",
              event: "kiosk_ping",
              payload: { joined: true }
            });
          }
        } else {
          setConnected(false);
        }
      });

    setChannel(syncChannel);

    return () => {
      supabase.removeChannel(syncChannel);
    };
  }, [sessionId, isHost, supabase]);

  const sendKioskSubmit = useCallback(async (data: KioskPayload) => {
    if (channel) {
      return await channel.send({
        type: "broadcast",
        event: "kiosk_submit",
        payload: data
      });
    }
  }, [channel]);

  const sendKioskInit = useCallback(async (price: number) => {
    if (channel && isHost) {
      return await channel.send({
        type: "broadcast",
        event: "kiosk_init",
        payload: { price }
      });
    }
  }, [channel, isHost]);

  return { connected, receivedData, sessionPrice, sendKioskSubmit, sendKioskInit };
}
