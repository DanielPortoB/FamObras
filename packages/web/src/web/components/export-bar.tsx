import type { ReactNode } from "react";
import { Card } from "./ui-kit";
import { EmailSend } from "./email-send";

/** Rodapé das abas com imprimir, baixar e enviar por e-mail */
export function ExportBar({
  title,
  actions,
  emailLabel,
  emailPending,
  onEmail,
}: {
  title: string;
  actions: ReactNode;
  emailLabel: string;
  emailPending: boolean;
  onEmail: (to: string) => Promise<unknown>;
}) {
  return (
    <Card>
      <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-end">
        <div>
          <p className="mb-2 text-sm font-bold">{title}</p>
          <div className="flex flex-wrap gap-2">{actions}</div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Enviar por e-mail</p>
          <EmailSend label={emailLabel} pending={emailPending} onSend={onEmail} />
        </div>
      </div>
    </Card>
  );
}
