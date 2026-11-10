import ExcelJS from "exceljs";

export type ToolRow = { name: string; unit: string; quantity: number; attended: boolean };

/** Planilha .xlsx com a lista de ferramentas da obra. Retorna o arquivo em base64. */
export async function buildToolsXlsx(workName: string, tools: ToolRow[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Ferramentas");
  ws.addRow([`Lista de ferramentas - ${workName}`]);
  ws.mergeCells("A1:D1");
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF125F3D" } };
  ws.addRow([]);
  const header = ws.addRow(["Ferramenta", "Unidade", "Quantidade", "Atendida"]);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF125F3D" } };
  });
  for (const t of tools) {
    ws.addRow([t.name, t.unit, t.quantity, t.attended ? "Sim" : "Não"]);
  }
  ws.columns = [{ width: 44 }, { width: 14 }, { width: 14 }, { width: 12 }];
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf).toString("base64");
}

export type ChecklistRow = { category: string; description: string; note: string | null; done: boolean };

const SECTIONS: Record<string, string> = {
  hospedagem: "Hospedagem",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  equipamentos: "Equipamentos de movimentação",
  eletrico: "Checklist elétrico",
  outros: "Outros",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Checklist da obra em HTML. Salvo como .doc, o Word abre direto. */
export function buildChecklistHtml(workName: string, items: ChecklistRow[]) {
  const sections = Object.keys(SECTIONS)
    .map((cat) => {
      const rows = items.filter((i) => i.category === cat);
      if (rows.length === 0) return "";
      const lines = rows
        .map(
          (i) =>
            `<tr><td style="width:30px">${i.done ? "[X]" : "[ ]"}</td><td>${esc(i.description)}</td><td>${esc(i.note ?? "")}</td></tr>`,
        )
        .join("");
      return `<h3>${SECTIONS[cat]}</h3><table border="1" cellspacing="0" cellpadding="4" width="100%"><tr><th></th><th>Item</th><th>Valor / observação</th></tr>${lines}</table>`;
    })
    .join("");
  return `<html><head><meta charset="utf-8"><title>Checklist - ${esc(workName)}</title></head><body style="font-family:Arial"><h2 style="color:#125f3d">Checklist da obra: ${esc(workName)}</h2>${sections}</body></html>`;
}
