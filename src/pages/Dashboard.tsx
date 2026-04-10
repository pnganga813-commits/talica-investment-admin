import React, { useEffect, useState } from 'react';
import { supabase, Order } from '../lib/supabase';
import { Package, Clock, CheckCircle, XCircle, TrendingUp, ShoppingCart, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalProducts: 0,
    totalInCart: 0,
  });
  const [pendingOrdersList, setPendingOrdersList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();

    // Real-time subscription for pending orders
    const ordersChannel = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders', 
          filter: 'status=eq.pending' 
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      ordersChannel.unsubscribe();
    };
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      setError(null);
      
      // Fetch order stats
      const { data: allOrders, error: statsError } = await supabase
        .from('orders')
        .select('status, price');
      
      if (statsError) {
        console.error('Stats fetch error:', statsError);
        throw statsError;
      }

      // Fetch products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Fetch cart items count (might fail if table doesn't exist yet)
      let cartCount = 0;
      try {
        const { count } = await supabase
          .from('cart_items')
          .select('*', { count: 'exact', head: true });
        cartCount = count || 0;
      } catch (e) {
        console.log('Cart table might not exist yet');
      }

      if (allOrders) {
        setStats({
          totalOrders: allOrders.length,
          pendingOrders: allOrders.filter(o => o.status === 'pending').length,
          deliveredOrders: allOrders.filter(o => o.status === 'delivered').length,
          cancelledOrders: allOrders.filter(o => o.status === 'cancelled').length,
          totalProducts: productsCount || 0,
          totalInCart: cartCount,
        });
      }

      // Fetch recent orders (not just pending, to ensure visibility)
      const { data: recent, error: recentError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentError) throw recentError;

      if (recent) {
        setPendingOrdersList(recent);
      }
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      if (err.message === 'Failed to fetch') {
        setError('Unable to connect to the database. Your Supabase project might be paused.');
      } else {
        setError('Failed to load dashboard data.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const statCards = [
    { label: 'Total Products', value: stats.totalProducts, icon: Package, color: 'bg-indigo-600' },
    { label: 'Items in Cart', value: stats.totalInCart, icon: ShoppingCart, color: 'bg-teal-600' },
    { label: 'Total Orders', value: stats.totalOrders, icon: Package, color: 'bg-blue-600' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: Clock, color: 'bg-amber-500' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-rose-100 text-rose-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
          <h3 className="font-semibold">Error Loading Dashboard</h3>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="mt-1 text-xs md:text-sm text-gray-500">Welcome back. Here's what's happening with your COD orders today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Updated</p>
            <p className="text-xs font-medium text-gray-600">{format(lastUpdated, 'HH:mm:ss')}</p>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl md:rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 flex items-center group hover:shadow-md transition-all">
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-white ${stat.color} shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="ml-4">
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl md:text-2xl font-black text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 md:px-6 py-4 md:py-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-base md:text-lg font-bold text-gray-900">Recent Orders</h2>
          <button 
            onClick={() => window.location.href = '/orders'}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            View All
          </button>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingOrdersList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Clock className="w-10 h-10 text-gray-200 mb-2" />
                      <p className="font-medium">No orders found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingOrdersList.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{order.customer_name}</div>
                      <div className="text-[10px] text-gray-500 font-medium">{order.city}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-medium">{order.product_variant}</div>
                      <div className="text-[10px] text-gray-500">Qty: {order.quantity}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-bold">KSh {(order.price || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs font-medium">
                      {format(new Date(order.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => window.location.href = '/orders'}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wider"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
