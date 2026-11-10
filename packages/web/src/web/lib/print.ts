const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Abre uma janela com o HTML e chama a impressão do navegador.
 * A janela é aberta antes de esperar o conteúdo, para o navegador não bloquear o pop-up.
 */
export async function printHtml(content: string | Promise<string>) {
  const win = window.open("", "_blank");
  if (!win) throw new Error("O navegador bloqueou a janela de impressão. Libere pop-ups para este site.");
  try {
    const html = await content;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  } catch (e) {
    win.close();
    throw e;
  }
}

/** HTML da lista de ferramentas para impressão */
export function toolsPrintHtml(workName: string, tools: { name: string; unit: string; quantity: number; attended: boolean }[]) {
  const rows = tools
    .map((t) => `<tr><td style="width:30px;text-align:center">${t.attended ? "[X]" : "[ ]"}</td><td>${esc(t.name)}</td><td>${esc(t.unit)}</td><td style="text-align:right">${t.quantity}</td></tr>`)
    .join("");
  return `<html><head><meta charset="utf-8"><title>Ferramentas - ${esc(workName)}</title>
<style>body{font-family:Arial;font-size:12px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:4px}th{background:#125f3d;color:#fff;text-align:left}</style></head>
<body><h2 style="color:#125f3d">Lista de ferramentas: ${esc(workName)}</h2>
<table><tr><th>OK</th><th>Ferramenta</th><th>Unidade</th><th>Qtd.</th></tr>${rows}</table></body></html>`;
}
