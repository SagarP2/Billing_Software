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
          // Make sure to return a Promise here
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

  const { data } = await supabase.auth.getSession();
  
  if (data.session) {
    // User is authenticated, redirect to admin dashboard
    return NextResponse.redirect(new URL('/admin', request.url));
  } else {
    // User is not authenticated, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
}