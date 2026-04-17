import { useState, useEffect, useRef } from "react";
import { hasFirebaseConfig } from "../firebase/firebaseConfig";
import { subscribeToMessages } from "../firebase/firestore";
import { getMessages } from "../data/dataService";
import type { Message } from "../types";

export function useMessages(connectionId: string): {
  messages: Message[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!connectionId) return;

    if (!hasFirebaseConfig) {
      setLoading(true);
      getMessages(connectionId).then((msgs) => {
        setMessages(msgs);
        setLoading(false);
      });
      return;
    }

    setLoading(true);
    let retryCount = 0;
    let unsubscribe = () => {};

    const connect = () => {
      unsubscribe = subscribeToMessages(
        connectionId,
        (msgs) => {
          setMessages(msgs);
          setLoading(false);
          retryCount = 0;
        },
        (err) => {
          console.error("useMessages listener error:", err);
          unsubscribe();
          retryCount += 1;
          if (retryCount < 3) {
            retryTimeoutRef.current = setTimeout(connect, 1000 * 2 ** retryCount);
          } else {
            setError("Live updates unavailable — reconnect or refresh");
          }
        }
      );
    };

    connect();

    return () => {
      clearTimeout(retryTimeoutRef.current ?? undefined);
      unsubscribe();
    };
  }, [connectionId]);

  const refetch = () => {
    if (!hasFirebaseConfig && connectionId) {
      getMessages(connectionId).then(setMessages);
    }
  };

  return { messages, loading, error, refetch };
}
