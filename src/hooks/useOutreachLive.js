import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSocket } from "../lib/socket.js";
import { outreachApi } from "../api/outreachApi.js";

export const SUMMARY_KEY = ["outreach", "summary"];

export function useOutreachEvents({
  onJob,
  onProgress,
  onCampaign,
  onReconnect,
}) {
  const handlers = useRef({});

  handlers.current = {
    onJob,
    onProgress,
    onCampaign,
    onReconnect,
  };

  useEffect(() => {
    const socket = getSocket();

    const job = (payload) => handlers.current.onJob?.(payload);
    const progress = (payload) => handlers.current.onProgress?.(payload);
    const campaign = (payload) => handlers.current.onCampaign?.(payload);
    const reconnect = () => handlers.current.onReconnect?.();

    socket.on("outreach:job", job);
    socket.on("outreach:progress", progress);
    socket.on("outreach:campaign", campaign);
    socket.io.on("reconnect", reconnect);

    return () => {
      socket.off("outreach:job", job);
      socket.off("outreach:progress", progress);
      socket.off("outreach:campaign", campaign);
      socket.io.off("reconnect", reconnect);
    };
  }, []);
}

/**
 * Supports both:
 * 1. Raw Axios response: { data: { success, data: {...} } }
 * 2. Already-unwrapped response body: { success, data: {...} }
 * 3. Direct summary object: { email: {...}, whatsapp: {...} }
 */
function extractSummary(response) {
  const body = response?.data ?? response;

  const payload =
    body?.data && typeof body.data === "object" ? body.data : body;

  if (
    !payload ||
    typeof payload !== "object" ||
    (!payload.email && !payload.whatsapp)
  ) {
    console.error("[Outreach] Unexpected summary response:", response);

    throw new Error(
      "Outreach summary ka response format sahi nahi hai. Console check karein.",
    );
  }

  return payload;
}

export function useOutreachSummaryQuery() {
  return useQuery({
    queryKey: SUMMARY_KEY,

    queryFn: async () => {
      const response = await outreachApi.summary();
      const payload = extractSummary(response);

      if (import.meta.env.DEV) {
        console.debug("[Outreach] Summary API response:", response);
        console.debug("[Outreach] Parsed summary:", payload);
      }

      return payload;
    },

    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Sidebar ke liye live summary refresh.
 * DashboardLayout mein ek hi baar use karein.
 */
export function useOutreachSummaryLive() {
  const queryClient = useQueryClient();
  const timer = useRef(null);

  const refresh = useCallback(() => {
    if (timer.current) return;

    timer.current = setTimeout(() => {
      timer.current = null;
      queryClient.invalidateQueries({
        queryKey: SUMMARY_KEY,
      });
    }, 1500);
  }, [queryClient]);

  useOutreachEvents({
    onJob: refresh,
    onCampaign: refresh,
    onReconnect: refresh,
  });

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, []);

  return useOutreachSummaryQuery();
}
