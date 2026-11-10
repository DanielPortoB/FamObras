import { useState } from "react";
import { Card, Empty, ErrorBox } from "../../components/ui-kit";
import { useWorkItemMutations } from "../../queries/work-items";
import { btnDanger, btnPrimary, inputCls } from "../../lib/cls";
import type { WorkData } from "./index";
import { useWorkFiles } from "../../queries/works";
import { downloadBase64 } from "../../lib/download";
import { ExportBar } from "../../components/export-bar";
import { btnGhost } from "../../lib/cls";
import { printHtml, toolsPrintHtml } from "../../lib/print";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function ToolsTab({ data }: { data: WorkData }) {
  const m = useWorkItemMutations();
  const [error, setError] = useState<unknown>(null);
  const [newTool, setNewTool] = useState({ name: "", unit: "UNIDADE", quantity: "1" });
  const workId = data.work.id;
  const done = data.tools.filter((t) => t.attended).length;
  const files = useWorkFiles();

  const downloadExcel = () =>
    run(async () => {
      const f = await files.toolsExcel.mutateAsync({ workId });
      downloadBase64(f.filename, f.base64, XLSX_MIME);
    });

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e);
    }
  };

  const addTool = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await m.addTool.mutateAsync({
        workId,
        name: newTool.name.trim().toUpperCase(),
        unit: newTool.unit.trim().toUpperCase() || "UNIDADE",
        quantity: Number(newTool.quantity) || 1,
      });
      setNewTool({ name: "", unit: "UNIDADE", quantity: "1" });
    });
  };

  const print = () => run(() => printHtml(toolsPrintHtml(data.work.name, data.tools)));

  return (
    <div className="flex flex-col gap-6">
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-bold">Lista de ferramentas</h2>
        <p className="text-sm text-muted-foreground">
          Modelo padrão da planilha já carregado. Edite, adicione ou remova o que essa obra precisa. Atendidas: {done} de {data.tools.length}.
        </p>
      </div>

      <form onSubmit={addTool} className="mb-5 grid gap-2 rounded-xl bg-muted/60 p-3 md:grid-cols-[1fr_120px_100px_auto]">
        <input aria-label="Nova ferramenta" className={inputCls} required placeholder="Nova ferramenta" value={newTool.name} onChange={(e) => setNewTool({ ...newTool, name: e.target.value })} />
        <input aria-label="Unidade" className={inputCls} placeholder="Unidade" value={newTool.unit} onChange={(e) => setNewTool({ ...newTool, unit: e.target.value })} />
        <input aria-label="Quantidade" className={inputCls} inputMode="numeric" value={newTool.quantity} onChange={(e) => setNewTool({ ...newTool, quantity: e.target.value })} />
        <button className={btnPrimary} disabled={m.addTool.isPending}>Adicionar</button>
      </form>
      <ErrorBox error={error} />

      {data.tools.length === 0 ? (
        <Empty>Nenhuma ferramenta nesta obra.</Empty>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 w-12">OK</th>
                <th className="py-2 pr-3">Ferramenta</th>
                <th className="py-2 pr-3 w-36">Unidade</th>
                <th className="py-2 pr-3 w-28">Qtd.</th>
                <th className="py-2 text-right w-24">Remover</th>
              </tr>
            </thead>
            <tbody>
              {data.tools.map((t) => (
                <ToolRow
                  key={`${t.id}-${t.quantity}-${t.name}-${t.unit}-${t.attended}`}
                  tool={t}
                  onSave={(patch) => run(() => m.updateTool.mutateAsync({ id: t.id, name: t.name, unit: t.unit, quantity: t.quantity, attended: t.attended, ...patch }))}
                  onRemove={() => run(() => m.removeTool.mutateAsync({ id: t.id }))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
    <ExportBar
      title="Imprimir e baixar a lista"
      emailLabel="Enviar Excel"
      emailPending={files.toolsEmail.isPending}
      onEmail={(to) => files.toolsEmail.mutateAsync({ workId, to })}
      actions={
        <>
          <button className={btnGhost} onClick={print}>
            Imprimir
          </button>
          <button className={btnGhost} onClick={downloadExcel} disabled={files.toolsExcel.isPending}>
            {files.toolsExcel.isPending ? "Gerando..." : "Baixar Excel"}
          </button>
        </>
      }
    />
    </div>
  );
}

function ToolRow({
  tool,
  onSave,
  onRemove,
}: {
  tool: WorkData["tools"][number];
  onSave: (patch: Partial<{ name: string; unit: string; quantity: number; attended: boolean }>) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(tool.name);
  const [unit, setUnit] = useState(tool.unit);
  const [qty, setQty] = useState(String(tool.quantity));

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="py-2 pr-3">
        <input
          type="checkbox"
          className="size-4 accent-[#125f3d]"
          checked={tool.attended}
          onChange={(e) => onSave({ attended: e.target.checked })}
          aria-label="Atendido"
        />
      </td>
      <td className="py-2 pr-3">
        <input aria-label="Nome da ferramenta" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== tool.name && name.trim() && onSave({ name: name.trim() })} />
      </td>
      <td className="py-2 pr-3">
        <input aria-label="Unidade da ferramenta" className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} onBlur={() => unit !== tool.unit && onSave({ unit: unit.trim() || "UNIDADE" })} />
      </td>
      <td className="py-2 pr-3">
        <input aria-label="Quantidade da ferramenta" className={inputCls} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} onBlur={() => Number(qty) !== tool.quantity && onSave({ quantity: Number(qty) || 0 })} />
      </td>
      <td className="py-2 text-right">
        <button className={btnDanger} onClick={onRemove}>Remover</button>
      </td>
    </tr>
  );
}
