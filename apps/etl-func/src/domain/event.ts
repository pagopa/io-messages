export interface EventProducer<T> {
  publish: (events: T[]) => Promise<void>;
}

export interface EventErrorRepository<T> {
  push: (event: T, reason?: string) => Promise<void>;
}
