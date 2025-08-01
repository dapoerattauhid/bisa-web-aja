
import React from 'react';

interface DetailOrder {
  id: string;
  child_name: string;
  child_class: string;
  menu_name: string;
  item_code: string;
  quantity: number;
  kitchen_check: boolean;
  homeroom_check: boolean;
  delivery_date: string;
  total_amount: number;
  payment_status: string;
}

interface DetailOrdersPrintProps {
  data: DetailOrder[];
  printerType?: string;
}

export const DetailOrdersPrint: React.FC<DetailOrdersPrintProps> = ({ 
  data, 
  printerType = 'standard' 
}) => {
  const printStyles = {
    standard: {
      fontSize: '12px',
      pageWidth: '210mm',
      margin: '20mm',
      fontFamily: 'Arial, sans-serif'
    },
    thermal: {
      fontSize: '9px',
      pageWidth: '80mm',
      margin: '3mm',
      fontFamily: 'Arial, sans-serif'
    },
    dotmatrix: {
      fontSize: '8px',
      pageWidth: '216mm',
      margin: '10mm',
      fontFamily: 'Courier, monospace'
    }
  };

  const currentStyle = printStyles[printerType as keyof typeof printStyles] || printStyles.standard;

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Lunas';
      case 'pending': return 'Belum Bayar';
      case 'failed': return 'Gagal';
      case 'refunded': return 'Refund';
      default: return status;
    }
  };

  React.useEffect(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalAmount = data.reduce((sum, order) => sum + order.total_amount, 0);
    const paidOrders = data.filter(order => order.payment_status === 'paid').length;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Detail Pesanan</title>
          <style>
            @page {
              size: ${currentStyle.pageWidth};
              margin: ${currentStyle.margin};
            }
            body {
              font-family: ${currentStyle.fontFamily};
              font-size: ${currentStyle.fontSize};
              line-height: 1.3;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 15px;
            }
            th, td { 
              border: 1px solid #000; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f0f0f0; 
              font-weight: bold; 
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .status-paid { color: green; }
            .status-pending { color: orange; }
            .summary { 
              margin-top: 15px; 
              padding: 8px; 
              border: 1px solid #000; 
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>DETAIL PESANAN</h2>
            <p>Berdasarkan Tanggal Katering</p>
            <p>Dicetak: ${new Date().toLocaleString('id-ID')}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Nomor Urut</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th>Nama Pesanan</th>
                <th>Kode Item</th>
                <th class="text-center">Jumlah</th>
                <th class="text-center">Ceklist Dapur</th>
                <th class="text-center">Ceklist Walikelas</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((order, index) => `
                <tr>
                  <td class="text-center">${index + 1}</td>
                  <td>${order.child_name}</td>
                  <td>${order.child_class}</td>
                  <td>${order.menu_name}</td>
                  <td>${order.item_code}</td>
                  <td class="text-center">${order.quantity}</td>
                  <td class="text-center">
                    <input type="checkbox" ${order.kitchen_check ? 'checked' : ''} />
                  </td>
                  <td class="text-center">
                    <input type="checkbox" ${order.homeroom_check ? 'checked' : ''} />
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <h3>RINGKASAN</h3>
            <p>Total Detail Pesanan: ${data.length}</p>
            <p>Total Jumlah: ${data.reduce((sum, item) => sum + item.quantity, 0)}</p>
            <p>Jumlah Siswa: ${new Set(data.map(item => item.child_name)).size}</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  }, [data, printerType]);

  return null;
};
