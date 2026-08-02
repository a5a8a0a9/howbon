import { describe, expect, it } from 'vitest';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  it('tracks one operation and ignores extra end calls', () => {
    const loading = new LoadingService();
    const id = loading.begin('正在儲存…');

    expect(loading.active()).toBe(true);
    expect(loading.message()).toBe('正在儲存…');

    loading.end(id);
    loading.end(id);
    expect(loading.active()).toBe(false);
  });

  it('keeps the mask active until concurrent operations finish', () => {
    const loading = new LoadingService();
    const first = loading.begin('第一個動作');
    const second = loading.begin('第二個動作');

    loading.end(first);
    expect(loading.active()).toBe(true);
    expect(loading.message()).toBe('第二個動作');

    loading.end(second);
    expect(loading.active()).toBe(false);
  });

  it('ends after successful and failed actions', async () => {
    const loading = new LoadingService();

    await expect(loading.run('成功動作', async () => 42)).resolves.toBe(42);
    expect(loading.active()).toBe(false);

    await expect(
      loading.run('失敗動作', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(loading.active()).toBe(false);
  });
});
