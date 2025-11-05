import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: number;
  parsedResponse?: {
    reply: string;
    type: "continue" | "admin" | "user";
    config?: Record<string, unknown>;
  };
}

interface ChatWebSocketProps {
  onNewAppCreated?: (appData: unknown) => void;
  onWorkflowsUpdated?: (workflows: unknown[]) => void;
  onObjectsUpdated?: (objects: unknown[]) => void;
  onLayoutGenerated?: (layout: unknown) => void;
}

export const useChatWebSocket = ({ 
  onNewAppCreated, 
  onWorkflowsUpdated, 
  onObjectsUpdated, 
  onLayoutGenerated 
}: ChatWebSocketProps = {}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const currentMessageRef = useRef<string>('');
  const currentAssistantMessageRef = useRef<Message | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const lastProcessedResponseRef = useRef<string>('');
  const responseCompletedRef = useRef<boolean>(false);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('Connecting to WebSocket...');
    const ws = new WebSocket('ws://localhost:8000/ws/chat');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected successfully');
      // Clear any reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      const data = event.data;
      console.log('WebSocket received chunk:', data);
      
      // Handle streaming response chunks
      handleStreamingMessage(data);
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      console.log('WebSocket disconnected:', event.code, event.reason);
      
      // Don't reconnect if it was a normal closure
      if (event.code !== 1000) {
        console.log('Attempting to reconnect in 3 seconds...');
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  };

  const handleAdminResponse = (response: unknown) => {
    console.log('Admin response received:', response);
    
    // Extract generated data from config
    const config = (response as any).config;
    
    if (config?.objects && onObjectsUpdated) {
      console.log('Processing objects from admin response');
      // Convert objects to the format expected by the UI
      const objects = Object.entries(config.objects).map(([name, data]: [string, unknown]) => ({
        id: Date.now() + Math.random(), // Generate unique ID
        name,
        fields: (data as any).fields || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      onObjectsUpdated(objects);
    }
    
    if (config?.workflows && onWorkflowsUpdated) {
      console.log('Processing workflows from admin response');
      // Convert workflows to the format expected by the UI
      const workflows = Object.entries(config.workflows).map(([name, data]: [string, unknown]) => ({
        id: Date.now() + Math.random(), // Generate unique ID
        name,
        steps: (data as any).steps || [],
        app_id: config.app_id || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: (data as any).description || '',
        status: 'draft'
      }));
      
      onWorkflowsUpdated(workflows);
    }
    
    if (config?.layout && onLayoutGenerated) {
      console.log('Processing layout from admin response');
      onLayoutGenerated(config.layout);
    }
    
    // Do NOT add the admin response to messages here. Only update the last assistant message in the streaming handler.
    setIsLoading(false);
    currentAssistantMessageRef.current = null;
  };

  const handleStreamingMessage = (chunk: string) => {
    // Skip if response is already completed
    if (responseCompletedRef.current) {
      return;
    }

    // Handle streaming response chunks
    currentMessageRef.current += chunk;

    // Only create a new assistant message if there is not one in progress
    if (!currentAssistantMessageRef.current) {
      currentAssistantMessageRef.current = {
        id: Date.now().toString(),
        sender: 'assistant',
        content: currentMessageRef.current,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, currentAssistantMessageRef.current!]);
    } else {
      // Always update the last assistant message
      currentAssistantMessageRef.current.content = currentMessageRef.current;
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.sender === 'assistant') {
          lastMessage.content = currentMessageRef.current;
        }
        return newMessages;
      });
    }

    // Try to parse the entire content as JSON
    try {
      console.log('Trying to parse:', currentMessageRef.current);
      const parsed = JSON.parse(currentMessageRef.current.trim());
      if (parsed.type && parsed.reply) {
        // Check if we've already processed this exact response
        const responseKey = JSON.stringify(parsed);
        if (lastProcessedResponseRef.current === responseKey) {
          return;
        }
        lastProcessedResponseRef.current = responseKey;
        responseCompletedRef.current = true;
        // Update the last assistant message with parsedResponse and summary
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.sender === 'assistant') {
            lastMessage.parsedResponse = parsed;
            lastMessage.content = parsed.reply;
          }
          return newMessages;
        });
        if (currentAssistantMessageRef.current) {
          currentAssistantMessageRef.current.parsedResponse = parsed;
          currentAssistantMessageRef.current.content = parsed.reply;
          currentMessageRef.current = parsed.reply;
        }
        // Handle admin responses only once
        if (parsed.type === 'admin') {
          handleAdminResponse(parsed);
        } else {
          setIsLoading(false);
          currentAssistantMessageRef.current = null;
        }
        return;
      }
    } catch (e) {
      // Not valid JSON yet, continue streaming
    }
    // If we have a lot of content but no valid JSON, assume it's a regular message
    if (currentMessageRef.current.length > 10000) {
      setIsLoading(false);
      currentAssistantMessageRef.current = null;
      responseCompletedRef.current = true;
    }
  };

  const sendMessage = (content: string) => {
    if (!wsRef.current || !isConnected) {
      console.error('WebSocket not connected');
      return;
    }

    const message: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, message]);
    setIsLoading(true);
    currentMessageRef.current = '';
    currentAssistantMessageRef.current = null;
    responseCompletedRef.current = false; // Reset the flag for new message

    // Send message to WebSocket in the format the backend expects
    const wsMessage = {
      messages: [
        {
          role: "user",
          content: content
        }
      ],
      context: {
        session_id: 'default'
      }
    };

    console.log('Sending WebSocket message:', wsMessage);
    wsRef.current.send(JSON.stringify(wsMessage));
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.log('WebSocket response timeout - stopping loading state');
        setIsLoading(false);
        currentAssistantMessageRef.current = null;
      }, 30000); // 30 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  return {
    messages,
    isConnected,
    isLoading,
    sendMessage,
    connect,
    disconnect
  };
}; 