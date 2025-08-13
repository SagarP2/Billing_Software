import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return Promise.resolve(cookieStore.get(name)?.value);
        },
        set(name, value, options) {
          return Promise.resolve(cookieStore.set({ name, value, ...options }));
        },
        remove(name, options) {
          return Promise.resolve(cookieStore.set({ name, value: '', ...options }));
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    session: data.session,
    user: data.session?.user || null
  });
}