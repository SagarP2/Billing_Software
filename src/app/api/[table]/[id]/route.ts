import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { schemas } from "@/lib/tableSchemas";

export const runtime = 'nodejs';

const allowedTables = new Set(Object.values(schemas).map((s) => s.table));

function getTableSchema(table: string) {
  const entry = Object.values(schemas).find((s) => s.table === table);
  return entry ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { table: string; id: string } }
) {
  const table = params.table;
  if (!allowedTables.has(table)) {
    return NextResponse.json({ error: "Table not allowed" }, { status: 400 });
  }
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const schema = getTableSchema(table);
  if (!schema) return NextResponse.json({ error: "Schema not found" }, { status: 400 });
  const allowedFields = new Set(schema.fields.map((f) => f.name));

  const body = await req.json();
  const entries = Object.entries(body).filter(([k]) => allowedFields.has(k));
  if (entries.length === 0) return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });

  const assignments = entries.map(([k], i) => `${k} = $${i + 1}`);
  const values = entries.map(([, v]) => v);
  values.push(id);

  try {
    const { rows } = await query(
      `UPDATE ${table} SET ${assignments.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return NextResponse.json(rows[0] ?? null);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { table: string; id: string } }
) {
  const table = params.table;
  if (!allowedTables.has(table)) {
    return NextResponse.json({ error: "Table not allowed" }, { status: 400 });
  }
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}



