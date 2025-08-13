"use client";

import { useState, useEffect } from 'react';
import { Bell, User, LogOut } from 'lucide-react';
import { getCurrentUser, signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<{user_metadata?: {name?: string}, email?: string} | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser();
        if (userData) {
          setUser(userData as {user_metadata?: {name?: string}, email?: string});
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    
    fetchUser();
  }, []);
  
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-gray-800 bg-gray-950">
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-md hover:bg-gray-800">
          <Bell className="w-5 h-5 text-gray-300" />
        </button>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-200">
            {user?.user_metadata?.name || user?.email || 'User'}
          </span>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout} 
          disabled={isLoggingOut}
          className="flex items-center gap-2 text-gray-200 border-gray-700 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </Button>
      </div>
    </header>
  );
}