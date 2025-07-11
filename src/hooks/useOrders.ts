
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  menu_items: {
    name: string;
    image_url: string;
  } | null;
}

interface Order {
  id: string;
  child_name: string | null;
  child_class: string | null;
  total_amount: number;
  status: string | null;
  payment_status: string | null;
  created_at: string;
  notes: string | null;
  midtrans_order_id: string | null;
  order_items: OrderItem[];
}

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            price,
            menu_items (
              name,
              image_url
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedOrders = (data || []).map(order => ({
        ...order,
        order_items: order.order_items.map(item => ({
          ...item,
          menu_items: item.menu_items || { name: 'Unknown Item', image_url: '' }
        }))
      }));
      
      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data pesanan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const retryPayment = async (order: Order) => {
    try {
      // Use existing midtrans_order_id if available, otherwise generate new one
      const orderId = order.midtrans_order_id || `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Update order with midtrans_order_id if it was null
      if (!order.midtrans_order_id) {
        await supabase
          .from('orders')
          .update({ midtrans_order_id: orderId })
          .eq('id', order.id);
      }

      const customerDetails = {
        first_name: order.child_name || 'Customer',
        email: user?.email || 'parent@example.com',
        phone: user?.user_metadata?.phone || '08123456789',
      };

      const itemDetails = order.order_items.map(item => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
        name: item.menu_items?.name || 'Unknown Item',
      }));

      console.log('Calling create-payment with existing order ID:', {
        orderId,
        amount: order.total_amount,
        customerDetails,
        itemDetails
      });

      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'create-payment',
        {
          body: {
            orderId,
            amount: order.total_amount,
            customerDetails,
            itemDetails,
          },
        }
      );

      if (paymentError) {
        console.error('Payment error:', paymentError);
        throw paymentError;
      }

      if (window.snap && paymentData.snap_token) {
        window.snap.pay(paymentData.snap_token, {
          onSuccess: () => {
            toast({
              title: "Pembayaran Berhasil!",
              description: "Pembayaran berhasil diproses.",
            });
            fetchOrders();
          },
          onPending: () => {
            toast({
              title: "Menunggu Pembayaran",
              description: "Pembayaran sedang diproses.",
            });
            fetchOrders();
          },
          onError: () => {
            toast({
              title: "Pembayaran Gagal",
              description: "Terjadi kesalahan dalam pembayaran.",
              variant: "destructive",
            });
          }
        });
      } else {
        throw new Error('Snap token tidak diterima atau Midtrans Snap belum loaded');
      }
    } catch (error: any) {
      console.error('Retry payment error:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal memproses pembayaran",
        variant: "destructive",
      });
    }
  };

  const batchPayment = async (selectedOrders: Order[]) => {
    try {
      if (selectedOrders.length === 0) {
        toast({
          title: "Error",
          description: "Pilih pesanan yang ingin dibayar",
          variant: "destructive",
        });
        return;
      }

      // Generate batch order ID
      const batchOrderId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Calculate total amount
      const totalAmount = selectedOrders.reduce((sum, order) => sum + order.total_amount, 0);
      
      // Create customer details from first order
      const firstOrder = selectedOrders[0];
      const customerDetails = {
        first_name: firstOrder.child_name || 'Customer',
        email: user?.email || 'parent@example.com',
        phone: user?.user_metadata?.phone || '08123456789',
      };

      // Combine all items from all orders
      const itemDetails = selectedOrders.flatMap(order => 
        order.order_items.map(item => ({
          id: `${order.id}-${item.id}`,
          price: item.price,
          quantity: item.quantity,
          name: `${item.menu_items?.name || 'Unknown Item'} (${order.child_name})`,
        }))
      );

      console.log('Calling create-payment for batch payment:', {
        orderId: batchOrderId,
        amount: totalAmount,
        customerDetails,
        itemDetails,
        orderCount: selectedOrders.length
      });

      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'create-payment',
        {
          body: {
            orderId: batchOrderId,
            amount: totalAmount,
            customerDetails,
            itemDetails,
            batchOrderIds: selectedOrders.map(order => order.id), // Send order IDs for batch update
          },
        }
      );

      if (paymentError) {
        console.error('Batch payment error:', paymentError);
        throw paymentError;
      }

      // Update all selected orders with the same batch midtrans_order_id
      for (const order of selectedOrders) {
        await supabase
          .from('orders')
          .update({ midtrans_order_id: batchOrderId })
          .eq('id', order.id);
      }

      if (window.snap && paymentData.snap_token) {
        window.snap.pay(paymentData.snap_token, {
          onSuccess: () => {
            toast({
              title: "Pembayaran Berhasil!",
              description: `Pembayaran untuk ${selectedOrders.length} pesanan berhasil diproses.`,
            });
            fetchOrders();
          },
          onPending: () => {
            toast({
              title: "Menunggu Pembayaran",
              description: `Pembayaran untuk ${selectedOrders.length} pesanan sedang diproses.`,
            });
            fetchOrders();
          },
          onError: () => {
            toast({
              title: "Pembayaran Gagal",
              description: "Terjadi kesalahan dalam pembayaran batch.",
              variant: "destructive",
            });
          }
        });
      } else {
        throw new Error('Snap token tidak diterima atau Midtrans Snap belum loaded');
      }
    } catch (error: any) {
      console.error('Batch payment error:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal memproses pembayaran batch",
        variant: "destructive",
      });
    }
  };

  return {
    orders,
    loading,
    retryPayment,
    batchPayment,
    fetchOrders
  };
};
