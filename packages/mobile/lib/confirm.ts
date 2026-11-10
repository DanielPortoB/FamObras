import { Alert, Platform } from "react-native";

/** Pergunta de confirmação: window.confirm no preview web, Alert no celular */
export function confirmAsk(message: string, okLabel = "Confirmar"): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(globalThis.confirm?.(message) ?? true);
  return new Promise((resolve) => {
    Alert.alert("Confirmar", message, [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: okLabel, style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

/** Aviso simples */
export function notify(message: string) {
  if (Platform.OS === "web") globalThis.alert?.(message);
  else Alert.alert("FAM Obras", message);
}
