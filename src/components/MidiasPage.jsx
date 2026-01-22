import React, { useState, useRef, useEffect } from "react";
import { Image as ImageIcon, Sparkles, Lock, Send } from "lucide-react";

export default function MidiasPage({ onOpenPlansTab, hasMediaUpgrade = false }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Olá! Esta é a área da IA Gestor de Mídias. Para usufruir desta ferramenta, você precisa ter o upgrade ativo no seu plano.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !hasMediaUpgrade) return;

    const userMessage = inputValue.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInputValue("");

    // Simula resposta da IA (placeholder)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Funcionalidade em construção. Em breve você poderá gerenciar calendário editorial, criar posts e criativos aqui.",
        },
      ]);
    }, 500);
  };

  return (
    <main className="max-w-5xl mx-auto animate-in fade-in">
      <header className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">MídIAs</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              IA de Gestão de Mídias (posts, criativos e rotinas).
            </p>
          </div>

          {onOpenPlansTab && (
            <button
              type="button"
              onClick={onOpenPlansTab}
              className="h-10 px-4 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm"
            >
              Ver planos / Upgrade
            </button>
          )}
        </div>
      </header>

      {!hasMediaUpgrade && (
        <div className="mb-6 rounded-2xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-[0_0_0_1px_hsl(var(--border))] p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl border border-border bg-background/40 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground">Upgrade necessário</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Para usar a <strong className="text-foreground">IA Gestor de Mídias</strong>, é necessário
                ativar o upgrade de <strong className="text-foreground">+R$ 250/mês</strong> no seu plano.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Entre em contato com o suporte ou vá em "Ver planos / Upgrade" para ativar.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-3xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-[0_0_0_1px_hsl(var(--border))] overflow-hidden">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl border border-border bg-background/40 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Chat IA Gestor de Mídias</h2>
              <p className="text-xs text-muted-foreground">
                Planeje posts, criativos e calendário editorial
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col h-[600px]">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-foreground border border-border"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-4 bg-background/40">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={!hasMediaUpgrade}
                placeholder={
                  hasMediaUpgrade
                    ? "Digite sua mensagem..."
                    : "Upgrade necessário para usar esta ferramenta"
                }
                className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!hasMediaUpgrade || !inputValue.trim()}
                className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="mt-6 rounded-2xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-[0_0_0_1px_hsl(var(--border))] p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Em breve</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Calendário editorial, templates personalizados, geração automática de criativos e fluxo de aprovação.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
