import { NextRequest, NextResponse } from "next/server";
import { addCardNumberColumn } from "@/app/dashboard/card_details/add_column";

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const result = await addCardNumberColumn();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
