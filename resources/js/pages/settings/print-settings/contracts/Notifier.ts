export interface Notifier {
  success(message: string): void;
  error(message: string): void;
}
