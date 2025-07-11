
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Calendar, CreditCard } from 'lucide-react';
import { Order } from '@/types/order';
import { 
  getStatusColor, 
  getPaymentStatusColor, 
  getStatusText, 
  getPaymentStatusText,
  formatPrice,
  formatDate 
} from '@/utils/orderUtils';

interface OrderFiltersProps {
  orders: Order[];
  onRetryPayment: (order: Order) => void;
  onBatchPayment: (orders: Order[]) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const OrderFilters = ({ 
  orders, 
  onRetryPayment, 
  onBatchPayment,
  activeTab, 
  onTabChange 
}: OrderFiltersProps) => {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const tabs = [
    { id: 'all', label: 'Semua', count: orders.length },
    { id: 'pending', label: 'Menunggu', count: orders.filter(o => o.status === 'pending').length },
    { id: 'confirmed', label: 'Dikonfirmasi', count: orders.filter(o => o.status === 'confirmed').length },
    { id: 'preparing', label: 'Diproses', count: orders.filter(o => o.status === 'preparing').length },
    { id: 'delivered', label: 'Dikirim', count: orders.filter(o => o.status === 'delivered').length },
  ];

  const pendingPaymentOrders = orders.filter(order => order.payment_status === 'pending');
  const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id));
  const totalSelectedAmount = selectedOrdersData.reduce((sum, order) => sum + order.total_amount, 0);

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(pendingPaymentOrders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleBatchPayment = () => {
    const ordersToProcess = orders.filter(order => selectedOrders.includes(order.id));
    onBatchPayment(ordersToProcess);
    setSelectedOrders([]);
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            onClick={() => onTabChange(tab.id)}
            className="text-xs md:text-sm"
          >
            {tab.label} ({tab.count})
          </Button>
        ))}
      </div>

      {/* Batch Payment Controls */}
      {pendingPaymentOrders.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-orange-600" />
              Pembayaran Batch
            </CardTitle>
            <CardDescription>
              Bayar beberapa pesanan sekaligus untuk menghemat biaya admin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedOrders.length === pendingPaymentOrders.length}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                Pilih semua pesanan pending ({pendingPaymentOrders.length})
              </label>
            </div>
            
            {selectedOrders.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <p className="font-medium">
                    {selectedOrders.length} pesanan dipilih
                  </p>
                  <p className="text-sm text-gray-600">
                    Total: {formatPrice(totalSelectedAmount)}
                  </p>
                </div>
                <Button 
                  onClick={handleBatchPayment}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  Bayar Sekaligus
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Orders List */}
      <div className="grid gap-4 md:gap-6">
        {orders.map((order) => (
          <Card key={order.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-3">
                  {/* Checkbox for pending payments */}
                  {order.payment_status === 'pending' && (
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                      className="mt-1"
                    />
                  )}
                  
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      <User className="h-5 w-5 mr-2 text-orange-600" />
                      {order.child_name}
                    </CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <span>Kelas {order.child_class}</span>
                      <Calendar className="h-4 w-4 mx-2" />
                      <span>{formatDate(order.created_at)}</span>
                    </CardDescription>
                  </div>
                </div>
                
                <div className="text-right space-y-1">
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusText(order.status)}
                  </Badge>
                  <Badge className={getPaymentStatusColor(order.payment_status)}>
                    {getPaymentStatusText(order.payment_status)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Order Items */}
                <div className="space-y-2">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                      <img
                        src={item.menu_items?.image_url || '/placeholder.svg'}
                        alt={item.menu_items?.name || 'Unknown Item'}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.menu_items?.name || 'Unknown Item'}</p>
                        <p className="text-xs text-gray-600">
                          {item.quantity}x • {formatPrice(item.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="p-2 bg-blue-50 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Catatan:</strong> {order.notes}
                    </p>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-orange-600">
                    {formatPrice(order.total_amount)}
                  </span>
                </div>

                {/* Payment Button */}
                {order.payment_status === 'pending' && (
                  <Button 
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    onClick={() => onRetryPayment(order)}
                  >
                    Bayar Sekarang
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
