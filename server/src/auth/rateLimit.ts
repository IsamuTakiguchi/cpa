/** 単一インスタンス向けの簡易レート制限（ログイン・登録の総当たり防止） */
interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** 許可されれば true。超過なら false */
  hit(key: string): boolean {
    const now = Date.now();
    const b = this.buckets.get(key);
    if (!b || b.resetAt < now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    b.count += 1;
    if (this.buckets.size > 10000) this.sweep(now);
    return b.count <= this.max;
  }

  reset(key: string) {
    this.buckets.delete(key);
  }

  private sweep(now: number) {
    for (const [k, b] of this.buckets) if (b.resetAt < now) this.buckets.delete(k);
  }
}
