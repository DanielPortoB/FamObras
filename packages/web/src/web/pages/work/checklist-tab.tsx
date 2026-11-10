import { useState } from "react";
import { Card, Empty, ErrorBox } from "../../components/ui-kit";
import { useWorkItemMutations } from "../../queries/work-items";
import { useWorkFiles } from "../../queries/works";
import { btnDanger, btnGhost, btnPrimary, inputCls } from "../../lib/cls";
import { CHECKLIST_CATEGORIES } from "../../lib/labels";
import { downloadBase64 } from "../../lib/download";
import { ExportBar } from "../../components/export-bar";
import { printHtml } from "../../lib/print";
import type { WorkData } from "./index";

type Item = WorkData["checklist"][number];

const ORDER = ["equipamentos", "eletrico", "hospedagem", "alimentacao", "transporte", "outros"];
const HINTS: Record<string, { title: string; help: string; notePlaceholder: string }> = {
  equipamentos: {
    title: "Equipamentos de movimentação",
    help: "Marque o que a obra precisa. Use a observação para capacidade, quantidade ou dias.",
    notePlaceholder: "Ex: 1 un, 20 t, 5 diárias",
  },
  eletrico: {
    title: "Checklist elétrico",
    help: "Padrões elétricos da unidade. Marque o que se aplica e anote o detalhe.",
    notePlaceholder: "Ex: sim / não / 380V trifásico",
  },
};

function decodeBase64Utf8(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function ChecklistTab({ data }: { data: WorkData }) {
  const m = useWorkItemMutations();
  const files = useWorkFiles();
  const [error, setError] = useState<unknown>(null);
  const [category, setCategory] = useState("hospedagem");
  const [description, setDescription] = useState("");
  const [special, setSpecial] = useState("");
  const workId = data.work.id;
  const done = data.checklist.filter((c) => c.done).length;

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e);
    }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await m.addChecklistItem.mutateAsync({ workId, category, description: description.trim() });
      setDescription("");
    });
  };

  const addSpecial = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await m.addChecklistItem.mutateAsync({ workId, category: "equipamentos", description: special.trim() });
      setSpecial("");
    });
  };

  const downloadWord = () =>
    run(async () => {
      const f = await files.checklistDoc.mutateAsync({ workId });
      downloadBase64(f.filename, f.base64, "application/msword");
    });

  const print = () =>
    run(async () => {
      await printHtml(files.checklistDoc.mutateAsync({ workId }).then((f) => decodeBase64Utf8(f.base64)));
    });

  const cats = [...ORDER, ...Object.keys(CHECKLIST_CATEGORIES).filter((c) => !ORDER.includes(c))];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-bold">Checklist da obra</h2>
          <p className="text-sm text-muted-foreground">
            Equipamentos, elétrico, hospedagem, alimentação, transporte e outros. Marcados: {done} de {data.checklist.length}.
          </p>
        </div>

        <form onSubmit={add} className="grid gap-2 rounded-xl bg-muted/60 p-3 md:grid-cols-[220px_1fr_auto]">
          <select aria-label="Categoria" className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {cats.map((v) => (
              <option key={v} value={v}>
                {CHECKLIST_CATEGORIES[v] ?? v}
              </option>
            ))}
          </select>
          <input aria-label="Novo item" className={inputCls} required minLength={2} placeholder="Novo item" value={description} onChange={(e) => setDescription(e.target.value)} />
          <button className={btnPrimary} disabled={m.addChecklistItem.isPending}>
            Adicionar
          </button>
        </form>
        <div className="mt-3">
          <ErrorBox error={error} />
        </div>
      </Card>

      {data.checklist.length === 0 ? (
        <Empty>Nenhum item no checklist.</Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {cats.map((cat) => {
            const items = data.checklist.filter((c) => c.category === cat);
            if (items.length === 0 && cat !== "equipamentos") return null;
            const hint = HINTS[cat];
            return (
              <Card key={cat} className={hint ? "lg:col-span-1" : ""}>
                <h3 className="text-base font-bold text-primary">{hint?.title ?? CHECKLIST_CATEGORIES[cat] ?? cat}</h3>
                {hint && <p className="mb-3 text-xs text-muted-foreground">{hint.help}</p>}
                <ul className="mt-2 flex flex-col divide-y divide-border rounded-xl border border-border">
                  {items.map((item) => (
                    <ChecklistRow
                      key={`${item.id}-${item.description}-${item.note ?? ""}`}
                      item={item}
                      notePlaceholder={hint?.notePlaceholder ?? "Observação"}
                      run={run}
                    />
                  ))}
                </ul>
                {cat === "equipamentos" && (
                  <form onSubmit={addSpecial} className="mt-3 flex gap-2">
                    <input
                      aria-label="Equipamento especial"
                      className={inputCls}
                      minLength={2}
                      required
                      placeholder="Outro equipamento especial (não está na lista)"
                      value={special}
                      onChange={(e) => setSpecial(e.target.value)}
                    />
                    <button className={btnPrimary} disabled={m.addChecklistItem.isPending}>
                      Incluir
                    </button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ExportBar
        title="Imprimir e baixar o checklist"
        emailLabel="Enviar Word"
        emailPending={files.checklistEmail.isPending}
        onEmail={(to) => files.checklistEmail.mutateAsync({ workId, to })}
        actions={
          <>
            <button className={btnGhost} onClick={print} disabled={files.checklistDoc.isPending}>
              Imprimir
            </button>
            <button className={btnGhost} onClick={downloadWord} disabled={files.checklistDoc.isPending}>
              Baixar Word
            </button>
          </>
        }
      />
    </div>
  );
}

function ChecklistRow({ item, notePlaceholder, run }: { item: Item; notePlaceholder: string; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const m = useWorkItemMutations();
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(item.description);
  const [note, setNote] = useState(item.note ?? "");

  const saveNote = () => {
    if ((item.note ?? "") === note.trim()) return;
    run(() => m.updateChecklistItem.mutateAsync({ id: item.id, description: item.description, note: note.trim() || null }));
  };

  const saveEdit = () =>
    run(async () => {
      await m.updateChecklistItem.mutateAsync({ id: item.id, description: desc.trim(), note: note.trim() || null });
      setEditing(false);
    });

  return (
    <li className="flex flex-col gap-2 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          className="size-4 shrink-0 accent-[#125f3d]"
          checked={item.done}
          onChange={(e) => run(() => m.toggleChecklistItem.mutateAsync({ id: item.id, done: e.target.checked }))}
          aria-label={item.description}
        />
        {editing ? (
          <input aria-label="Descrição do item" className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} />
        ) : (
          <span className={"flex-1 text-sm " + (item.done ? "font-medium text-foreground" : "")}>{item.description}</span>
        )}
        {editing ? (
          <>
            <button className={btnPrimary + " px-2 py-1 text-xs"} onClick={saveEdit} disabled={desc.trim().length < 2}>
              Salvar
            </button>
            <button className={btnGhost + " px-2 py-1 text-xs"} onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button className={btnGhost + " px-2 py-1 text-xs"} onClick={() => setEditing(true)}>
              Editar
            </button>
            <button
              className={btnDanger + " px-2 py-1 text-xs"}
              onClick={() => confirm(`Remover "${item.description}"?`) && run(() => m.removeChecklistItem.mutateAsync({ id: item.id }))}
            >
              Remover
            </button>
          </>
        )}
      </div>
      <div className="pl-7">
        <input
          aria-label={`Observação de ${item.description}`}
          className={inputCls + " py-1.5 text-xs"}
          placeholder={notePlaceholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
        />
      </div>
    </li>
  );
}
