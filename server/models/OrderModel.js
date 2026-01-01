const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  _id: { type: String },
  name: String,
  price: Number,
  quantity: Number
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  items: [OrderItemSchema],
  amount_total: Number,               // stored in cents (Stripe style)
  stripeSessionId: String,
  customer_email: String,
  customer_name: String,
  customer_address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postal_code: String,
    country: String
  },
  status: { type: String, default: 'paid' }, // 'paid' | 'processing' | 'shipped' | 'refunded'
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);