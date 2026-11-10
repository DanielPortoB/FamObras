import type { useWork } from "../../queries/works";

export type WorkData = NonNullable<ReturnType<typeof useWork>["data"]>;
