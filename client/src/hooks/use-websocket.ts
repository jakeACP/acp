import { useEffect, useState, useCallback } from "react";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

declare global {
  interface Window {
    websocket?: WebSocket;
  }
}

export function useWebSocket(userId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (window.websocket && window.websocket.readyState === WebSocket.OPEN) {
      window.websocket.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Connect to WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      window.websocket = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        
        // Authenticate with user ID
        ws.send(JSON.stringify({
          type: "auth",
          userId: userId,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          
          // Log WebSocket messages for debugging
          console.log("WebSocket message received:", data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };

      // Cleanup function
      return () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        window.websocket = undefined;
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setIsConnected(false);
    }
  }, [userId]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}