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
  const isMounted = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    if (!connectionId) return;

    isMounted.current = true;

    if (!hasFirebaseConfig) {
      setLoading(true);
      getMessages(connectionId)
        .then((msgs) => {
          setMessages(msgs);
          setLoading(false);
        })
        .catch((e) => {
          console.error("useMessages demo fetch error:", e);
          setError("Failed to load messages");
          setLoading(false);
        });
      return () => {
        isMounted.current = false;
      };
    }

    setLoading(true);
    let retryCount = 0;
    let unsubscribe = () => {};

    const connect = () => {
      if (!isMounted.current) return;
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
          if (retryCount <= 3) {
            retryTimeoutRef.current = setTimeout(connect, 1000 * 2 ** retryCount);
          } else {
            setError("Live updates unavailable — reconnect or refresh");
          }
        }
      );
    };

    connect();

    return () => {
      isMounted.current = false;
      clearTimeout(retryTimeoutRef.current ?? undefined);
      unsubscribe();
    };
  }, [connectionId]);

  const refetch = () => {
    if (!hasFirebaseConfig && connectionId) {
      getMessages(connectionId)
        .then(setMessages)
        .catch((e) => console.error("useMessages refetch error:", e));
    }
  };

  return { messages, loading, error, refetch };
}
