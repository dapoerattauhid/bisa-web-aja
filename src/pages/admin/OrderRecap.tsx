
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { formatPrice, formatDate } from '@/utils/orderUtils';

interface OrderRecapData {
  id: string;
  child_name: string;
  child_class: string;
  total_amount: number;
  created_at: string;
  order_items: {
    id: string;
    quantity: number;
    price: number;
    menu_items: {
      name: string;
    };
  }[];
}

const OrderRecap = () => {
  const [orders, setOrders] = useState<OrderRecapData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderRecap();
  }, []);

  const fetchOrderRecap = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          child_name,
          child_class,
          total_amount,
          created_at,
          order_items (
            id,
            quantity,
            price,
            menu_items (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching order recap:', error);
      toast({
        title: "Error",
        description: "Gagal memuat rekap pesanan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
          Rekap Pesanan
        </h1>
        <p className="text-gray-600">Ringkasan pesanan yang masuk</p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <CardTitle>{order.child_name}</CardTitle>
              <CardDescription>
                Kelas {order.child_class} • {formatDate(order.created_at)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.menu_items.name} x{item.quantity}</span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 font-bold">
                  Total: {formatPrice(order.total_amount)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {orders.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-medium mb-2">Belum Ada Pesanan</h3>
            <p className="text-gray-600">Belum ada pesanan yang masuk</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrderRecap;
