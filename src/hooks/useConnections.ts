import { useState, useEffect, useRef } from "react";
import { hasFirebaseConfig } from "../firebase/firebaseConfig";
import { subscribeToConnections } from "../firebase/firestore";
import { getConnectionsForUser } from "../data/dataService";
import type { Connection } from "../types";

export function useConnections(uid: string): {
  connections: Connection[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    if (!uid) return;

    isMounted.current = true;

    if (!hasFirebaseConfig) {
      setLoading(true);
      getConnectionsForUser(uid)
        .then((conns) => {
          setConnections(conns);
          setLoading(false);
        })
        .catch((e) => {
          console.error("useConnections demo fetch error:", e);
          setError("Failed to load connections");
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
      unsubscribe = subscribeToConnections(
        uid,
        (conns) => {
          setConnections(conns);
          setLoading(false);
          retryCount = 0;
        },
        (err) => {
          console.error("useConnections listener error:", err);
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
  }, [uid]);

  const refetch = () => {
    if (!hasFirebaseConfig && uid) {
      getConnectionsForUser(uid)
        .then(setConnections)
        .catch((e) => console.error("useConnections refetch error:", e));
    }
  };

  return { connections, loading, error, refetch };
}
