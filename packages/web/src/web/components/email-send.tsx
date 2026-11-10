import { useState } from "react";
import { ErrorBox } from "./ui-kit";
import { btnPrimary, inputCls } from "../lib/cls";

export const DEFAULT_EMAIL = "daniel@fammetal.com.br";

/** Campo de e-mail + botão de envio (arquivo anexado pelo servidor) */
export function EmailSend({ label, pending, onSend }: { label: string; pending: boolean; onSend: (to: string) => Promise<unknown> }) {
  const [to, setTo] = useState(DEFAULT_EMAIL);
  const [error, setError] = useState<unknown>(null);
  const [sent, setSent] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSent(null);
    try {
      await onSend(to.trim());
      setSent(to.trim());
    } catch (err) {
      setError(err);
    }
  };

  return (
    <form onSubmit={send} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <input aria-label="E-mail de destino" type="email" required className={inputCls + " min-w-[220px] flex-1"} value={to} onChange={(e) => setTo(e.target.value)} />
        <button className={btnPrimary} disabled={pending}>
          {pending ? "Enviando..." : label}
        </button>
      </div>
      {sent && <p className="text-xs font-medium text-primary">Enviado para {sent}.</p>}
      <ErrorBox error={error} />
    </form>
  );
}
