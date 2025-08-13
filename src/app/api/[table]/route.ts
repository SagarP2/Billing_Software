import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { schemas } from "@/lib/tableSchemas";

export const runtime = 'nodejs';

const allowedTables = new Set(Object.values(schemas).map((s) => s.table));

function getTableSchema(table: string) {
  const entry = Object.values(schemas).find((s) => s.table === table);
  return entry ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { table: string } }
) {
  const table = params.table;
  if (!allowedTables.has(table)) {
    return NextResponse.json({ error: "Table not allowed" }, { status: 400 });
  }
  try {
    const { rows } = await query(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 1000`);
    return NextResponse.json(rows ?? []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { table: string } }
) {
  const table = params.table;
  if (!allowedTables.has(table)) {
    return NextResponse.json({ error: "Table not allowed" }, { status: 400 });
  }
  const schema = getTableSchema(table);
  if (!schema) return NextResponse.json({ error: "Schema not found" }, { status: 400 });

  const body = await req.json();
  const allowedFields = new Set(schema.fields.map((f) => f.name));
  const entries = Object.entries(body).filter(([k]) => allowedFields.has(k));
  if (entries.length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const columns = entries.map(([k]) => k);
  const values = entries.map(([, v]) => v);
  const placeholders = values.map((_, i) => `$${i + 1}`);

  try {
    const { rows } = await query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
      values
    );
    return NextResponse.json(rows[0] ?? null, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}



