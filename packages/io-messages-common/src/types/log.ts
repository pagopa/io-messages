export interface Logger {
  error: (message: string) => void;
  info: (message: string) => void;
  log: (message: string) => void;
}
