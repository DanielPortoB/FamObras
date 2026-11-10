import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/**
 * Escolhe uma foto (galeria ou câmera), reduz para `max` px no maior lado e devolve data URL JPEG.
 * Retorna null se o usuário cancelar.
 */
export async function pickImage(opts: { max?: number; quality?: number; camera?: boolean; square?: boolean } = {}): Promise<string | null> {
  const { max = 1280, quality = 0.75, camera = false, square = false } = opts;
  if (camera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error("Permita o uso da câmera para tirar a foto.");
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
  };
  const res = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const w = a.width || max;
  const h = a.height || max;
  const scale = Math.min(1, max / Math.max(w, h));
  const out = await manipulateAsync(
    a.uri,
    scale < 1 ? [{ resize: w >= h ? { width: Math.round(w * scale) } : { height: Math.round(h * scale) } }] : [],
    { compress: quality, format: SaveFormat.JPEG, base64: true },
  );
  if (!out.base64) throw new Error("Não foi possível processar a imagem.");
  return `data:image/jpeg;base64,${out.base64}`;
}
