/** Mesma cidade da obra (sem acento, sem caixa) */
export function isLocal(employeeCity: string, workCity: string) {
  const n = (c: string) => c.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return n(employeeCity) === n(workCity);
}
