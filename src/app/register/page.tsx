import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export const metadata = {
  title: 'Registration Disabled',
  description: 'Registration is currently disabled',
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>Registration Disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 mb-3">
                Registration is currently disabled.
              </p>
              <p className="text-blue-700">
                Please contact your administrator to create a new account.
              </p>
            </div>
            <div className="mt-6 text-center">
              <Link href="/login" className="text-blue-600 hover:text-blue-500 underline underline-offset-4">
                Return to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}