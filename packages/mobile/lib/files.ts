import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const DOC_MIME = "application/msword";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** base64 -> bytes (sem depender de atob) */
export function base64ToBytes(b64: string) {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (B64.indexOf(clean[i]) << 18) |
      (B64.indexOf(clean[i + 1]) << 12) |
      ((B64.indexOf(clean[i + 2] ?? "A") & 63) << 6) |
      (B64.indexOf(clean[i + 3] ?? "A") & 63);
    out[o++] = (n >> 16) & 255;
    if (clean[i + 2] !== undefined) out[o++] = (n >> 8) & 255;
    if (clean[i + 3] !== undefined) out[o++] = n & 255;
  }
  return out.slice(0, o);
}

/** base64 de um texto UTF-8 -> string */
export function decodeBase64Utf8(b64: string) {
  const bytes = base64ToBytes(b64);
  let s = "";
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    if (b < 0x80) s += String.fromCharCode(b);
    else if (b < 0xe0) s += String.fromCharCode(((b & 31) << 6) | (bytes[i++] & 63));
    else if (b < 0xf0) s += String.fromCharCode(((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63));
    else {
      const cp = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
      s += String.fromCodePoint(cp);
    }
  }
  return s;
}

/**
 * Salva o arquivo vindo da API (base64) e abre o compartilhamento do celular
 * (salvar em Arquivos, WhatsApp, e-mail...). No preview web, baixa direto.
 */
export async function saveAndShare(filename: string, base64: string, mime: string) {
  if (Platform.OS === "web") {
    const blob = new Blob([base64ToBytes(base64)], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: "base64" });
  if (!(await Sharing.isAvailableAsync())) throw new Error("Compartilhamento indisponível neste aparelho.");
  await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: filename });
}

/** Imprime (ou salva em PDF) um HTML pela impressão do sistema */
export async function printHtml(html: string) {
  if (Platform.OS === "web") {
    const win = window.open("", "_blank");
    if (!win) throw new Error("O navegador bloqueou a janela de impressão. Libere pop-ups.");
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
    return;
  }
  await Print.printAsync({ html });
}
