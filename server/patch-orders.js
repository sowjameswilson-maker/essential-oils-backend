const mongoose = require('mongoose');
const Order = require('./models/OrderModel'); // or './models/Order' if that's your file
const Product = require('./models/Product');

require('dotenv').config();

async function fixOrders() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const orders = await Order.find({});
  for (const order of orders) {
    let modified = false;

    if (!order.amount_total && order.items && order.items.length) {
      order.amount_total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      modified = true;
    }

    if (!order.currency) {
      order.currency = 'usd';
      modified = true;
    }

    if (modified) {
      await order.save();
      console.log(`Fixed order ${order._id}`);
    }
  }

  console.log('Done fixing orders.');
  process.exit();
}

fixOrders().catch(err => {
  console.error(err);
  process.exit(1);
});