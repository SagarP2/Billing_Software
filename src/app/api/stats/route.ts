import { NextResponse } from 'next/server';
import { query } from '@/lib/postgres';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const [{ rows: c }, { rows: a }, { rows: t }, { rows: pendingRows }, { rows: revenueRows }, { rows: recentRows }] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*)::int as count FROM customers'),
      query<{ count: string }>('SELECT COUNT(*)::int as count FROM accounts'),
      query<{ count: string }>('SELECT COUNT(*)::int as count FROM transactions'),
      query<{ total: string | null }>('SELECT COALESCE(SUM(pending_amount),0) as total FROM accounts'),
      query<{ revenue: string | null }>(
        `SELECT COALESCE(SUM(CASE WHEN transaction_type='credit' THEN amount ELSE -amount END),0) as revenue FROM transactions`
      ),
      query(
        `SELECT t.*, c.full_name AS customer_name
         FROM transactions t
         LEFT JOIN customers c ON c.id = t.customer_id
         ORDER BY t.transaction_date DESC
         LIMIT 5`
      ),
    ]);

    const stats = {
      customers: Number(c[0]?.count ?? 0),
      accounts: Number(a[0]?.count ?? 0),
      transactions: Number(t[0]?.count ?? 0),
      pending: Number(pendingRows[0]?.total ?? 0),
      revenue: Number(revenueRows[0]?.revenue ?? 0),
    };

    return NextResponse.json({ stats, recent: recentRows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}



