const orderRepository = require("../repositories/order.repository");

const mapOrderRow = (row) => ({
  order_id: row.order_id,
  status: row.status,
  total_amount: Number(row.total_amount),
  order_date: row.order_date,
  item_count: Number(row.item_count ?? 0),
  shipment_status: row.shipment_status,
  tracking_number: row.tracking_number,
  payment_method: row.payment_method,
  payment_status: row.payment_status,
  address_city: row.address_city,
  address_line: row.street_address,
});

const getUserOrders = async (userId) => {
  const rows = await orderRepository.getUserOrders(userId);
  return rows.map(mapOrderRow);
};

const getUserOrderDetail = async (userId, orderId) => {
  const { orderRow, itemRows } = await orderRepository.getUserOrderDetail(
    userId,
    orderId
  );

  if (!orderRow) {
    return null;
  }

  return {
    order: {
      ...mapOrderRow({
        ...orderRow,
        item_count: itemRows.length,
        address_city: orderRow.city,
      }),
      carrier: orderRow.carrier,
      estimated_arrival: orderRow.estimated_arrival,
      payment_amount: Number(orderRow.payment_amount ?? 0),
      address: {
        street_address: orderRow.street_address,
        city: orderRow.city,
        zip_code: orderRow.zip_code,
        country: orderRow.country,
      },
    },
    items: itemRows.map((row) => ({
      item_id: row.item_id,
      quantity: row.quantity,
      unit_price: Number(row.unit_price),
      line_total: Number(row.unit_price) * Number(row.quantity),
      platform_fee_percent: Number(row.platform_fee_percent),
      variant: {
        variant_id: row.variant_id,
        sku: row.sku,
        attributes: row.attributes || {},
      },
      product: {
        product_id: row.product_id,
        title: row.title,
        brand: row.brand,
        primary_image: row.primary_image,
      },
      seller: {
        seller_id: row.seller_id,
        company_name: row.seller_name,
      },
    })),
  };
};

const getSellerOrders = async (sellerId) => {
  const rows = await orderRepository.getSellerOrders(sellerId);
  return rows.map((row) => ({
    order_id: row.order_id,
    status: row.status,
    order_date: row.order_date,
    item_count: Number(row.item_count ?? 0),
    gross_sales: Number(row.gross_sales ?? 0),
    shipment_status: row.shipment_status,
    tracking_number: row.tracking_number,
    customer_name: row.customer_name,
    destination_city: row.destination_city,
  }));
};

const getSellerOrderDetail = async (sellerId, orderId) => {
  const { orderRow, itemRows } = await orderRepository.getSellerOrderDetail(
    sellerId,
    orderId
  );

  if (!orderRow) {
    return null;
  }

  return {
    order: orderRow,
    items: itemRows.map((row) => ({
      item_id: row.item_id,
      quantity: row.quantity,
      unit_price: Number(row.unit_price),
      line_total: Number(row.unit_price) * Number(row.quantity),
      seller_earning: Number(row.seller_earning ?? 0),
      variant: {
        variant_id: row.variant_id,
        sku: row.sku,
        attributes: row.attributes || {},
      },
      product: {
        product_id: row.product_id,
        title: row.title,
        primary_image: row.primary_image,
      },
    })),
  };
};

module.exports = {
  getUserOrders,
  getUserOrderDetail,
  getSellerOrders,
  getSellerOrderDetail,
};
