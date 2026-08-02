import { Injectable, computed, signal } from '@angular/core';

interface LoadingOperation {
  id: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly operations = signal<LoadingOperation[]>([]);
  private nextId = 0;

  readonly active = computed(() => this.operations().length > 0);
  readonly message = computed(() => this.operations().at(-1)?.message ?? '處理中…');

  begin(message = '處理中…'): number {
    const id = ++this.nextId;
    this.operations.update((operations) => [...operations, { id, message }]);
    return id;
  }

  end(id?: number): void {
    this.operations.update((operations) => {
      if (operations.length === 0) {
        return operations;
      }
      if (id === undefined) {
        return operations.slice(0, -1);
      }
      return operations.filter((operation) => operation.id !== id);
    });
  }

  async run<T>(message: string, action: () => Promise<T>): Promise<T> {
    const id = this.begin(message);
    try {
      return await action();
    } finally {
      this.end(id);
    }
  }
}
