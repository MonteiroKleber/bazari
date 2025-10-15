import type { TransactionDetails } from '../components/PinDialog';

type PinConfig = {
  title?: string;
  description?: string;
  label?: string;
  cancelText?: string;
  confirmText?: string;
  transaction?: TransactionDetails;  // Transaction details to display
  // Optional async validator. Return null if OK, or an error message to display and keep dialog open.
  validate?: (pin: string) => Promise<string | null> | string | null;
};

type PinState = PinConfig & { open: boolean; error?: string | null };

class _PinService {
  private listeners = new Set<(s: PinState) => void>();
  private resolver: ((pin: string) => void) | null = null;
  private rejecter: ((err?: any) => void) | null = null;
  private state: PinState = { open: false, error: null };

  subscribe(listener: (s: PinState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((l) => l(this.state));
  }

  isOpen() {
    return this.state.open === true;
  }

  async getPin(config?: PinConfig): Promise<string> {
    if (this.resolver) {
      // Already awaiting: do not open a second dialog; return the same promise
      return new Promise<string>((resolve, reject) => {
        const unsub = this.subscribe(() => {});
        // Chain to existing resolver by temporarily capturing and releasing when done
        const origResolve = this.resolver!;
        this.resolver = (pin: string) => {
          try { origResolve(pin); } finally { resolve(pin); unsub(); }
        };
        const origReject = this.rejecter!;
        this.rejecter = (err?: any) => {
          try { origReject(err); } finally { reject(err); unsub(); }
        };
      });
    }
    this.state = { open: true, error: null, ...(config ?? {}) };
    this.emit();
    return new Promise<string>((resolve, reject) => {
      this.resolver = resolve;
      this.rejecter = reject;
    });
  }

  async confirm(pin: string) {
    try {
      const validate = this.state.validate;
      if (validate) {
        const res = await validate(pin);
        if (res) {
          // Validation failed: keep dialog open and show error
          this.state = { ...this.state, error: res };
          this.emit();
          return;
        }
      }
    } catch (e) {
      const msg = (e as Error)?.message || 'PIN inválido';
      this.state = { ...this.state, error: msg };
      this.emit();
      return;
    }
    const r = this.resolver; this.cleanup();
    if (r) r(pin);
  }

  cancel(err?: any) {
    const rej = this.rejecter; this.cleanup();
    if (rej) rej(err ?? new Error('cancelled'));
  }

  private cleanup() {
    this.state = { open: false, error: null };
    this.resolver = null;
    this.rejecter = null;
    this.emit();
  }
}

export const PinService = new _PinService();
export type { PinConfig, PinState };
