"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { ADAPTIVE_POLL_MS, isRealtimeSubscribed } from "@/lib/adaptive-polling";
import { isElectronClient } from "@/lib/electron-env";

const POLL_INTERVAL_REALTIME_MS = ADAPTIVE_POLL_MS.print.realtime;
const POLL_INTERVAL_FALLBACK_MS = ADAPTIVE_POLL_MS.print.fallback;
const MAX_JOBS_PER_POLL = 10;
const MAX_JOB_AGE_MS = 4 * 60 * 60 * 1000;

function normalizeJobRow(row: Record<string, unknown>) {
  if (!row) return row;
  const job = { ...row } as Record<string, unknown>;
  if (typeof job.data === "string") {
    try {
      job.data = JSON.parse(job.data);
    } catch {
      job.data = {};
    }
  }
  if (!job.data && typeof job.payload === "string") {
    try {
      job.data = JSON.parse(job.payload);
    } catch {
      job.data = {};
    }
  }
  const data = job.data as Record<string, unknown> | undefined;
  if (data && job.order_id && !data.orderId) {
    data.orderId = job.order_id;
  }
  return job;
}

/**
 * Electron: 모바일·다른 기기가 print_jobs에 남긴 인쇄 명령을
 * Realtime + 적응형 폴링으로 처리합니다.
 */
export function MobilePrintPoller() {
  const { tenantId } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const processingIds = useRef(new Set<string>());
  const failedStaleIds = useRef(new Set<string>());

  useEffect(() => {
    if (
      !tenantId ||
      settingsLoading ||
      !isElectronClient() ||
      typeof window === "undefined"
    ) {
      return;
    }

    const api = (window as Window & {
      electronAPI?: {
        printJob?: (payload: unknown) => Promise<unknown>;
      };
    }).electronAPI;

    if (!api?.printJob) return;

    const printerName = settings.printerName || settings.posPrinterName;
    const labelPrinterName = settings.labelPrinterName;
    if (!printerName && !labelPrinterName) {
      console.warn("[MobilePrintPoller] 프린터 미설정 — 감시 생략");
      return;
    }

    const supabase = createClient();

    const executePrintJob = async (rawJob: Record<string, unknown>) => {
      const job = normalizeJobRow(rawJob);
      const jobId = job.id as string | undefined;
      if (!jobId || processingIds.current.has(jobId)) return;
      processingIds.current.add(jobId);

      try {
        const { data: locked, error: lockError } = await supabase
          .from("print_jobs")
          .update({ status: "processing" })
          .eq("id", jobId)
          .eq("status", "pending")
          .select("id");

        if (lockError || !locked?.length) {
          processingIds.current.delete(jobId);
          return;
        }

        const jobType = (job.job_type || job.type) as string | undefined;
        if (jobType === "card" || job.printer_type === "card") {
          const data = (job.data || job.payload || {}) as Record<string, unknown>;
          const message = (data.message || {}) as Record<string, unknown>;
          const orderId = (data.orderId || job.order_id || "") as string;
          const labelType = (data.labelSize || "formtec-3108") as string;
          const positions = Array.isArray(data.selectedCells)
            ? (data.selectedCells as number[]).map((c) => Number(c) + 1).join(",")
            : "1";
          const printUrl = `/dashboard/orders/print-message?orderId=${orderId}&labelType=${labelType}&positions=${positions}&messageContent=${encodeURIComponent(String(message.content || ""))}&senderName=${encodeURIComponent(String(message.sender || ""))}&autoPrint=true`;
          const printWindow = window.open(
            printUrl,
            "_blank",
            "width=1024,height=768,menubar=no,toolbar=no,location=no,status=no",
          );
          await supabase
            .from("print_jobs")
            .update({ status: printWindow ? "printed" : "failed" })
            .eq("id", jobId);
          processingIds.current.delete(jobId);
          return;
        }

        await api.printJob!({
          job: {
            ...job,
            job_type: jobType,
            payload: job.data || job.payload,
            order_id: job.order_id,
          },
          settings,
          branchName: tenantId,
        });

        await supabase.from("print_jobs").update({ status: "printed" }).eq("id", jobId);
      } catch (err) {
        console.error(`[MobilePrintPoller] 인쇄 실패 (${jobId}):`, err);
        await supabase.from("print_jobs").update({ status: "failed" }).eq("id", jobId);
      } finally {
        if (jobId) processingIds.current.delete(jobId);
      }
    };

    let isPolling = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let realtimeOk = false;

    const getPollIntervalMs = () =>
      realtimeOk ? POLL_INTERVAL_REALTIME_MS : POLL_INTERVAL_FALLBACK_MS;

    const schedulePoll = () => {
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = setTimeout(async () => {
        await processPendingJobs();
        schedulePoll();
      }, getPollIntervalMs());
    };

    const processPendingJobs = async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const { data: jobs, error } = await supabase
          .from("print_jobs")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(MAX_JOBS_PER_POLL);

        if (error) {
          console.error("[MobilePrintPoller] 조회 오류:", error);
          return;
        }

        const cutoff = Date.now() - MAX_JOB_AGE_MS;
        const pending = (jobs || []).filter((j) => {
          const created = j.created_at ? new Date(j.created_at).getTime() : 0;
          return created >= cutoff;
        });

        const staleJobs = (jobs || []).filter((j) => {
          const created = j.created_at ? new Date(j.created_at).getTime() : 0;
          return created < cutoff && !failedStaleIds.current.has(j.id);
        });

        if (staleJobs.length > 0) {
          const staleIds = staleJobs.map((j) => j.id);
          const { error: deleteError } = await supabase
            .from("print_jobs")
            .delete()
            .in("id", staleIds);
          if (deleteError) {
            staleIds.forEach((id) => failedStaleIds.current.add(id));
          }
        }

        for (const job of pending.slice(0, MAX_JOBS_PER_POLL)) {
          await executePrintJob(job as Record<string, unknown>);
        }
      } finally {
        isPolling = false;
      }
    };

    processPendingJobs();
    schedulePoll();

    const channel = supabase
      .channel(`print_jobs_tenant_${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "print_jobs",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newJob = payload.new as Record<string, unknown>;
          if (newJob?.status === "pending") {
            void executePrintJob(newJob);
          }
        },
      )
      .subscribe((status) => {
        const wasOk = realtimeOk;
        realtimeOk = isRealtimeSubscribed(status);
        if (wasOk !== realtimeOk) schedulePoll();
      });

    console.log(`[MobilePrintPoller] tenant=${tenantId} 적응형 감시 시작`);

    return () => {
      if (pollTimer) clearTimeout(pollTimer);
      void supabase.removeChannel(channel);
      processingIds.current.clear();
    };
  }, [tenantId, settings, settingsLoading]);

  return null;
}
