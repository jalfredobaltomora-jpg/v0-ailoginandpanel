'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, X, User, Check, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  listenToSupportRequest,
  addMessageToRequest,
  updateSupportRequest,
  getEmpleadoByCodigo,
  getUsuarioByUsername,
  type SupportRequest,
  type Empleado,
} from '@/lib/firebase';
import { ValidationPanel } from './validation-panel';

interface ITManagerChatProps {
  request: SupportRequest;
  onClose: () => void;
  onResolve: () => void;
}

export function ITManagerChat({ request, onClose, onResolve }: ITManagerChatProps) {
  const [currentRequest, setCurrentRequest] = useState<SupportRequest>(request);
  const [inputValue, setInputValue] = useState('');
  const [empleadoData, setEmpleadoData] = useState<Empleado | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = listenToSupportRequest(request.id, (data) => {
      if (data) setCurrentRequest(data);
    });
    return unsubscribe;
  }, [request.id]);

  useEffect(() => {
    // Try to find employee data for the user
    async function loadEmpleado() {
      const usuario = await getUsuarioByUsername(request.username);
      if (usuario) {
        const empleado = await getEmpleadoByCodigo(usuario.codigo);
        setEmpleadoData(empleado);
      }
    }
    loadEmpleado();
  }, [request.username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentRequest.messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    await addMessageToRequest(request.id, {
      sender: 'it',
      text: inputValue,
      ts: Date.now(),
    });

    setInputValue('');
  };

  const handlePassToAI = async () => {
    await updateSupportRequest(request.id, { status: 'ai-active' });
    onClose();
  };

  const messages = currentRequest.messages || [];

  return (
    <div className="flex gap-4">
      {/* Chat Section */}
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{request.username}</p>
              <p className="text-xs text-muted-foreground">
                {empleadoData ? `${empleadoData.nombres} ${empleadoData.apellidos} - ${empleadoData.area}` : 'Usuario no verificado'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePassToAI}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Bot className="mr-1 h-4 w-4" />
              Pasar a IA
            </Button>
            <Button
              size="sm"
              onClick={onResolve}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <Check className="mr-1 h-4 w-4" />
              Resolver
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Employee Info */}
        {empleadoData && (
          <div className="border-b border-border bg-muted/30 p-3 text-xs">
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <div><span className="font-medium">Cedula:</span> {empleadoData.cedula}</div>
              <div><span className="font-medium">Area:</span> {empleadoData.area}</div>
              <div><span className="font-medium">Cargo:</span> {empleadoData.cargo}</div>
              <div><span className="font-medium">Fecha Nac:</span> {empleadoData.fechaNac}</div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: '400px' }}>
          {messages.map((msg, i) => (
            <div
              key={msg.id || i}
              className={`flex ${msg.sender === 'it' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.sender === 'user'
                    ? 'bg-secondary text-secondary-foreground'
                    : msg.sender === 'it'
                    ? 'bg-green-600 text-white'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {msg.sender !== 'it' && (
                  <div className="mb-1 flex items-center gap-1 text-xs opacity-70">
                    {msg.sender === 'ai' ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {msg.sender === 'ai' ? 'IA' : 'Usuario'}
                  </div>
                )}
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 border-t border-border p-4">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Escribir mensaje..."
            className="flex-1 border-border bg-input"
          />
          <Button
            onClick={handleSendMessage}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Validation Panel */}
      <ValidationPanel />
    </div>
  );
}
