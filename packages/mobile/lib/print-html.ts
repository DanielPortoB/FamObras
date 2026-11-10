import { brl, fmtDate, fmtHours, pct } from "./format";
import { CATEGORY_LABEL, PRICING_LABEL, STATUS_LABEL } from "./labels";

export const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const STYLE = `<style>
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1B2A22;margin:24px}
h1,h2{color:#125f3d;margin:0 0 6px}h2{font-size:15px;margin-top:18px}
table{border-collapse:collapse;width:100%;margin-top:6px}td,th{border:1px solid #bbb;padding:4px 6px;vertical-align:top}
th{background:#125f3d;color:#fff;text-align:left}.r{text-align:right}.muted{color:#5B6B62}
.grid{display:flex;gap:8px;flex-wrap:wrap}.box{border:1px solid #ccc;border-radius:8px;padding:8px 10px;min-width:120px}
.box b{display:block;font-size:15px}img{width:120px;height:120px;object-fit:cover;border-radius:6px;margin:4px}
</style>`;

const page = (title: string, body: string) =>
  `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>${STYLE}</head><body>${body}<p class="muted" style="margin-top:24px">FAM Obras · FAM Metal</p></body></html>`;

export function toolsPrintHtml(workName: string, tools: { name: string; unit: string; quantity: number; attended: boolean }[]) {
  const rows = tools
    .map(
      (t) =>
        `<tr><td style="width:30px;text-align:center">${t.attended ? "[X]" : "[ ]"}</td><td>${esc(t.name)}</td><td>${esc(t.unit)}</td><td class="r">${t.quantity}</td></tr>`,
    )
    .join("");
  return page(
    `Ferramentas - ${workName}`,
    `<h1>Lista de ferramentas: ${esc(workName)}</h1><table><tr><th>OK</th><th>Ferramenta</th><th>Unidade</th><th>Qtd.</th></tr>${rows}</table>`,
  );
}

export function costsDayHtml(
  workName: string,
  date: string,
  rows: { category: string; description: string | null; employee?: string | null; quantity: number; unitCost: number; total: number }[],
) {
  const total = rows.reduce((s, r) => s + r.total, 0);
  const trs = rows
    .map(
      (r) =>
        `<tr><td>${esc(CATEGORY_LABEL[r.category] ?? r.category)}</td><td>${esc(r.description || "-")}${r.employee ? ` · ${esc(r.employee)}` : ""}</td><td class="r">${r.quantity}</td><td class="r">${brl(r.unitCost)}</td><td class="r"><b>${brl(r.total)}</b></td></tr>`,
    )
    .join("");
  return page(
    `Custos ${fmtDate(date)} - ${workName}`,
    `<h1>Custos do dia ${fmtDate(date)}</h1><p>${esc(workName)}</p>
<table><tr><th>Categoria</th><th>Descrição</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr>${trs || `<tr><td colspan="5">Nenhum custo lançado.</td></tr>`}
<tr><td colspan="4"><b>Total do dia</b></td><td class="r"><b>${brl(total)}</b></td></tr></table>`,
  );
}

type ProdRow = { key: string; productive: number; unproductive: number; rate: number };

/** Relatório final da obra em HTML (para imprimir ou salvar em PDF) */
export function reportHtml(r: {
  work: { name: string; city: string; client: string | null; startDate: string; endDate: string; status: string; pricingModel: string; hasSedeFabrication: boolean };
  revenue: number;
  totalCost: number;
  result: number;
  margin: number | null;
  labor: { gross: number; encargos: number; beneficios: number; vouchers: number; total: number; hours: number };
  byCategory: Record<string, { total: number; quantity: number }>;
  expensesTotal: number;
  team: { id: number; name: string; role: string; crewType: string; presentDays: number; absentDays: number; lateDays: number; hours: number; cost: number; evaluation: { average: number } | null }[];
  productivity: { productive: number; unproductive: number; rate: number; byRole: ProdRow[]; byEmployee: ProdRow[]; byReason: { reason: string; hours: number }[] };
  rdos: { id: number; date: string; weather: string | null; activities: string; incidents: string | null; notes: string | null; crew: { name: string; role: string; productiveHours: number; unproductiveHours: number; reason: string | null }[]; photos: { dataUrl: string }[] }[];
}) {
  const w = r.work;
  const cats = Object.entries(r.byCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([c, v]) => `<tr><td>${esc(CATEGORY_LABEL[c] ?? c)}</td><td class="r">${v.quantity.toLocaleString("pt-BR")}</td><td class="r">${brl(v.total)}</td></tr>`)
    .join("");
  const team = r.team
    .map(
      (t) =>
        `<tr><td>${esc(t.name)}<br><span class="muted">${esc(t.role)}</span></td><td>${t.crewType === "reserva" ? "Reserva" : "Titular"}</td><td class="r">${t.presentDays}</td><td class="r">${t.absentDays}</td><td class="r">${t.lateDays}</td><td class="r">${fmtHours(t.hours)}</td><td class="r">${brl(t.cost)}</td><td class="r">${t.evaluation ? Number(t.evaluation.average).toLocaleString("pt-BR") : "Pendente"}</td></tr>`,
    )
    .join("");
  const prod = (title: string, rows: ProdRow[]) =>
    `<h2>${title}</h2><table><tr><th></th><th>Prod.</th><th>Improd.</th><th>%</th></tr>${rows
      .map((x) => `<tr><td>${esc(x.key)}</td><td class="r">${fmtHours(x.productive)}</td><td class="r">${fmtHours(x.unproductive)}</td><td class="r">${pct(x.rate)}</td></tr>`)
      .join("")}</table>`;
  const p = r.productivity;
  const rdos = [...r.rdos]
    .reverse()
    .map(
      (d) => `<div style="border-top:1px solid #ddd;padding-top:8px;margin-top:8px;page-break-inside:avoid">
<b>${fmtDate(d.date)}</b>${d.weather ? ` · ${esc(d.weather)}` : ""}
<p style="white-space:pre-line">${esc(d.activities)}</p>
${d.incidents ? `<p><b>Ocorrências:</b> ${esc(d.incidents)}</p>` : ""}${d.notes ? `<p class="muted">${esc(d.notes)}</p>` : ""}
${
  d.crew.length
    ? `<table><tr><th>Efetivo (${d.crew.length})</th><th>Função</th><th>Produtivas</th><th>Improdutivas</th><th>Motivo</th></tr>${d.crew
        .map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.role)}</td><td class="r">${fmtHours(c.productiveHours)}</td><td class="r">${c.unproductiveHours ? fmtHours(c.unproductiveHours) : "-"}</td><td>${esc(c.reason)}</td></tr>`)
        .join("")}</table>`
    : ""
}
${d.photos.map((ph) => `<img src="${ph.dataUrl}">`).join("")}</div>`,
    )
    .join("");

  return page(
    `Relatório final - ${w.name}`,
    `<h1>Relatório final · ${esc(w.name)}</h1>
<p class="muted">${esc(w.city)}${w.client ? ` · ${esc(w.client)}` : ""} · ${fmtDate(w.startDate)} a ${fmtDate(w.endDate)} · ${STATUS_LABEL[w.status] ?? w.status} · ${PRICING_LABEL[w.pricingModel] ?? w.pricingModel}${w.hasSedeFabrication ? " · Fabricação na sede" : ""}</p>
<div class="grid"><div class="box">Valor do contrato<b>${brl(r.revenue)}</b></div><div class="box">Custo total<b>${brl(r.totalCost)}</b></div><div class="box">${r.result >= 0 ? "Lucro" : "Prejuízo"}<b>${brl(r.result)}</b></div><div class="box">Margem<b>${pct(r.margin)}</b></div></div>
<h2>Mão de obra CLT</h2><table>
<tr><td>Salários (horas normais, extras e adicionais)</td><td class="r">${brl(r.labor.gross)}</td></tr>
<tr><td>Encargos (INSS 20%, FGTS 8%, 13º e férias 19,44%)</td><td class="r">${brl(r.labor.encargos)}</td></tr>
<tr><td>Benefícios mensais rateados</td><td class="r">${brl(r.labor.beneficios)}</td></tr>
<tr><td>Vales na obra</td><td class="r">${brl(r.labor.vouchers)}</td></tr>
<tr><td><b>Total mão de obra</b> (${fmtHours(r.labor.hours)})</td><td class="r"><b>${brl(r.labor.total)}</b></td></tr></table>
<h2>Despesas por categoria</h2><table><tr><th>Categoria</th><th>Quantidade</th><th>Total</th></tr>${cats}<tr><td colspan="2"><b>Total despesas</b></td><td class="r"><b>${brl(r.expensesTotal)}</b></td></tr></table>
<h2>Equipe, custo e avaliação</h2><table><tr><th>Nome</th><th>Tipo</th><th>Presente</th><th>Faltas</th><th>Atrasos</th><th>Horas</th><th>Custo</th><th>Nota</th></tr>${team}</table>
${p.productive + p.unproductive > 0 ? `<h2>Produtividade (efetivo do RDO): ${fmtHours(p.productive)} produtivas · ${fmtHours(p.unproductive)} improdutivas · ${pct(p.rate)}</h2>${prod("Por função", p.byRole)}${prod("Por funcionário", p.byEmployee)}${p.byReason.length ? `<h2>Motivos de horas improdutivas</h2><table>${p.byReason.map((x) => `<tr><td>${esc(x.reason)}</td><td class="r">${fmtHours(x.hours)}</td></tr>`).join("")}</table>` : ""}` : ""}
<h2>Diário de obra (RDO)</h2>${rdos || "<p>Nenhum RDO lançado.</p>"}`,
  );
}
