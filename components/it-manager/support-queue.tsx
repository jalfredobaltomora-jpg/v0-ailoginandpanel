'use client';

import { useState, useEffect } from 'react';
import { Clock, User, Bot, MessageSquare, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  listenToSupportRequests,
  updateSupportRequest,
  type SupportRequest,
} from '@/lib/firebase';
import { ITManagerChat } from './it-manager-chat';

export function SupportQueue() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [activeChat, setActiveChat] = useState<SupportRequest | null>(null);

  useEffect(() => {
    const unsubscribe = listenToSupportRequests((data) => {
      // Sort by createdAt, newest first
      setRequests(data.sort((a, b) => b.createdAt - a.createdAt));
    });
    return unsubscribe;
  }, []);

  const handleAccept = async (request: SupportRequest) => {
    await updateSupportRequest(request.id, { status: 'it-active' });
    setActiveChat({ ...request, status: 'it-active' });
  };

  const handlePassToAI = async (request: SupportRequest) => {
    await updateSupportRequest(request.id, { status: 'ai-active' });
  };

  const handleResolve = async (requestId: string) => {
    await updateSupportRequest(requestId, { status: 'resolved' });
    setActiveChat(null);
  };

  const getStatusBadge = (status: SupportRequest['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-1 text-xs text-yellow-500">
            <Clock className="h-3 w-3" /> Pendiente
          </span>
        );
      case 'it-active':
        return (
          <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-500">
            <User className="h-3 w-3" /> IT Activo
          </span>
        );
      case 'ai-active':
        return (
          <span className="flex items-center gap-1 rounded-full bg-primary/20 px-2 py-1 text-xs text-primary">
            <Bot className="h-3 w-3" /> IA Activa
          </span>
        );
      case 'resolved':
        return (
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
            <Check className="h-3 w-3" /> Resuelto
          </span>
        );
    }
  };

  if (activeChat) {
    return (
      <ITManagerChat
        request={activeChat}
        onClose={() => setActiveChat(null)}
        onResolve={() => handleResolve(activeChat.id)}
      />
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const activeRequests = requests.filter(r => r.status === 'it-active' || r.status === 'ai-active');
  const resolvedRequests = requests.filter(r => r.status === 'resolved');

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-500">
            <Clock className="h-4 w-4" />
            Solicitudes Pendientes ({pendingRequests.length})
          </h3>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <Card key={request.id} className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/20">
                      <MessageSquare className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{request.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.createdAt).toLocaleString('es')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(request)}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePassToAI(request)}
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <Bot className="mr-1 h-4 w-4" />
                      Pasar a IA
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active Requests */}
      {activeRequests.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-500">
            <User className="h-4 w-4" />
            En Proceso ({activeRequests.length})
          </h3>
          <div className="space-y-3">
            {activeRequests.map((request) => (
              <Card key={request.id} className="border-border bg-card">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {request.status === 'ai-active' ? (
                        <Bot className="h-5 w-5 text-primary" />
                      ) : (
                        <User className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{request.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.createdAt).toLocaleString('es')}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="flex gap-2">
                    {request.status === 'it-active' && (
                      <Button
                        size="sm"
                        onClick={() => setActiveChat(request)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <MessageSquare className="mr-1 h-4 w-4" />
                        Ver Chat
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(request.id)}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Cerrar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Resolved Requests */}
      {resolvedRequests.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Check className="h-4 w-4" />
            Resueltos ({resolvedRequests.length})
          </h3>
          <div className="space-y-2">
            {resolvedRequests.slice(0, 5).map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm"
              >
                <span className="text-muted-foreground">{request.username}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(request.createdAt).toLocaleString('es')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <MessageSquare className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>No hay solicitudes de soporte</p>
        </div>
      )}
    </div>
  );
}
