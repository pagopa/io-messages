export interface EventProducer<T> {
  publish: (events: T[]) => Promise<void>;
}
