import { ErrorInternal } from "./error";

export type HealthCheck = () => Promise<ErrorInternal | undefined>;
