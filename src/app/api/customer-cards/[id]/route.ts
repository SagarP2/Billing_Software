import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";

export const runtime = 'nodejs';

// API endpoint to get cards for a specific customer
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const customerId = params.id;
  
  if (!customerId) {
    return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
  }

  try {
    // Get cards for this customer
    const { rows } = await query(
      `SELECT * FROM card_details WHERE customer_id = $1 ORDER BY id DESC`,
      [customerId]
    );
    
    // If we have cards, also fetch customer info
    if (rows.length > 0) {
      const { rows: customerRows } = await query(
        `SELECT * FROM customers WHERE id = $1`,
        [customerId]
      );
      
      if (customerRows.length > 0) {
        const customer = customerRows[0];
        // Add customer name to each card
        rows.forEach((card: any) => {
          card.customer_name = customer.full_name;
        });
      }
    }
    
    return NextResponse.json(rows);
  } catch (e: any) {
    console.error('Error fetching customer cards:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
