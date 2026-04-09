export abstract class BaseAvroRecord {
  public static readonly schema = {};
  public static readonly subject: string = "";

  public abstract schema(): object;

  public abstract subject(): string;
}
