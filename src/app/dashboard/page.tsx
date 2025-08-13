"use client";

import { CreditCard, DollarSign, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
// Fetch stats from our server API backed by PostgreSQL

export default function DashboardPage() {
  const [stats, setStats] = useState({ customers: 0, accounts: 0, transactions: 0, pending: 0, revenue: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  
  // Load stats and recent activity on mount
  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch('/api/stats');
      const s = await res.json();
      if (!active) return;
      setStats(s.stats);
      setRecent(s.recent);
    }
    load();
    return () => { active = false; };
  }, []);
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Welcome back! Here's what's happening with your business.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        <DashboardCard title="Total Customers" value={String(stats.customers)} description="Active customers" icon={<Users className="w-6 h-6 text-blue-500" />} />
        <DashboardCard title="Total Accounts" value={String(stats.accounts)} description="Managed accounts" icon={<Users className="w-6 h-6 text-purple-500" />} />
        <DashboardCard title="Total Transactions" value={String(stats.transactions)} description="All transactions" icon={<CreditCard className="w-6 h-6 text-orange-500" />} />
        <DashboardCard title="Pending Payments" value={`₹${stats.pending.toFixed(2)}`} description="Awaiting payment" icon={<DollarSign className="w-6 h-6 text-yellow-500" />} />
        <DashboardCard title="Total Revenue" value={`₹${stats.revenue.toFixed(2)}`} description="Net revenue" icon={<DollarSign className="w-6 h-6 text-green-500" />} />
      </div>
      
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
          <p className="text-gray-400 text-sm mt-1">Latest transactions and activities</p>
        </div>
        <div className="p-6">
          {recent.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No recent transactions found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-750 hover:bg-gray-700 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-200 font-medium">{tx.customer_name ?? tx.customer_id}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-300">₹{Number(tx.amount ?? 0).toFixed(2)}</span>
                    <span className="text-gray-400 text-sm">{new Date(tx.transaction_date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

function DashboardCard({ title, value, description, icon }: DashboardCardProps) {
  return (
    <div className="p-6 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:border-gray-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
        <div className="p-2 rounded-lg bg-gray-700/50">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        {description && <p className="text-sm text-gray-400">{description}</p>}
      </div>
    </div>
  );
}