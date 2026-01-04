// ------------------------------------------------------
// 📦 IMPORTS (Top of File)
// ------------------------------------------------------
const path = require('path');// needed to locate .env

require('dotenv').config({ path: path.join(__dirname, '../.env') }); // load .env
console.log("Webhook secret loaded:", process.env.STRIPE_WEBHOOK_SECRET);
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const multer = require('multer');
const { sendOrderReceipt, sendAdminSaleNotification } = require('./mailer');

// ------------------------------------------------------
// 🚀 INITIALIZE APP
// ------------------------------------------------------
const app = express();

// Simple admin password middleware
function adminAuth(req, res, next) {
  const adminPass = process.env.ADMIN_PASSWORD;
  const sentPass = req.headers['x-admin-auth'];

  if (!sentPass || sentPass !== adminPass) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  next();
}

// ------------------------------------------------------
// 🔑 STRIPE WEBHOOK SECRET (Config)
// ------------------------------------------------------
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ------------------------------------------------------
// 🗄️ DATABASE CONNECTION
// --------------line----------------------------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ------------------------------------------------------
// 📁 LOAD MONGOOSE MODELS
// ------------------------------------------------------
const Order = require('./models/OrderModel');
const Product = require('./models/Product');
// 2️⃣ Stripe webhook route
// ------------------------------------------------------
// ⚠️ STRIPE WEBHOOK — MUST COME BEFORE express.json()
// ------------------------------------------------------
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log("⚡ Webhook hit!");
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("✔ Webhook received:", event.type);

  if (event.type === 'checkout.session.completed') {
  const session = event.data.object;

  const cartItems = JSON.parse(session.metadata.items || '[]');

  // customer email can be in session.customer_details.email or session.customer_email
  const customer_email = session.customer_details?.email || session.customer_email || null;
  const customer_name = session.customer_details?.name || null;
  const addr = session.customer_details?.address || {};

  const order = new Order({
    items: cartItems,
    amount_total: session.amount_total,
    stripeSessionId: session.id,
    customer_email,
    customer_name,
    customer_address: {
      line1: addr.line1 || '',
      line2: addr.line2 || '',
      city: addr.city || '',
      state: addr.state || '',
      postal_code: addr.postal_code || '',
      country: addr.country || ''
    },
    status: 'paid'
  });

  await order.save();
  console.log('✔ Order saved:', order._id);

  // ✅ ADMIN NOTIFICATION
  await sendAdminSaleNotification(order);
  console.log('Sending admin email to:', process.env.ADMIN_EMAIL);

  // Reduce stock (optional, keep your existing code)
  for (const item of cartItems) {
    const updated = await Product.findByIdAndUpdate(
      item._id,
      { $inc: { stock: -item.quantity } },
      { new: true }
    );
    console.log(`✔ Stock updated for ${item.name}: now ${updated?.stock}`);
  }
}

  res.sendStatus(200);
});

// ------------------------------------------------------
// 🧩 MIDDLEWARE
// ------------------------------------------------------
const allowedOrigins = [
  'http://localhost:5500', // local testing
  'https://golden-bienenstitch-87d963.netlify.app', // Netlify frontend
  'https://naturallyofcourse.ca',
  'https://www.naturallyofcourse.ca'                  // custom domain
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// ------------------------------------------------------
// 🖼️ MULTER SETUP (File Upload Configuration)
// ------------------------------------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // save into project-root/public/images
    cb(null, path.join(__dirname, '../public/images'));
  },
  filename: function (req, file, cb) {
    // keep original ext, but make filename unique with timestamp
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-').toLowerCase();
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });
// ------------------------------------------------------
// 🛒 ROUTES — STRIPE CHECKOUT
// ------------------------------------------------------

// 1️⃣ Create Stripe checkout session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const cartItems = req.body.items;
    const prefillEmail = req.body.email; // optional prefill from frontend

    if (!Array.isArray(cartItems) || !cartItems.length) {
      return res.status(400).json({ error: 'Cart is empty or invalid.' });
    }

    const lineItems = cartItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: { name: item.name },
        unit_amount: Math.round(Number(item.price) * 100) // ensure number
      },
      quantity: Number(item.quantity)
    }));

    const origin = req.headers.origin || 'http://localhost:4242';

    const sessionPayload = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart.html`,
      metadata: { items: JSON.stringify(cartItems) }
    };

    // Optional: prefill email (lets Stripe send receipt to this address)
    if (prefillEmail) sessionPayload.customer_email = prefillEmail;

    // Optional: request billing address (Stripe will show it on checkout)
    sessionPayload.billing_address_collection = 'auto';

    const session = await stripe.checkout.sessions.create(sessionPayload);

    console.log('Stripe session created:', session.id);
    res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: 'Server error creating checkout session.' });
  }
});




// ------------------------------------------------------
// 🛍️ ROUTES — PRODUCTS (Store & Admin)
// ------------------------------------------------------

// Public: Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Public: Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
  console.log('req.body:', req.body);
console.log('req.file:', req.file);
  const { name, price, description, stock } = req.body;
  const image = req.file ?  `/images/${req.file.filename}` : null;

  const product = new Product({
    name,
    price,
    description,
    stock,
    image
  });

  await product.save();
  res.json(product);
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: "Password required" });
  }

  if (password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, message: "Unauthorized" });
});

// Admin: Get all products
app.get('/api/admin/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get single product
app.get('/api/admin/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.setHeader('Content-Type', 'application/json');
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Create product
app.post('/api/admin/products', upload.single('image'), async (req, res) => {
  console.log('req.body:', req.body);
console.log('req.file:', req.file);
  try {
    const { name, price, description, imageUrl, stock } = req.body;
    let image = imageUrl || (req.file ? `/images/${req.file.filename}` : null);

    const product = new Product({
      name,
      price,
      description,
      image,
      stock: stock ? parseInt(stock, 10) : 0
    });

    await product.save();
    res.json({ success: true, product });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Edit product
app.put('/api/admin/products/:id', upload.single('image'), async (req, res) => {
  console.log('Updating product:', req.params.id, req.body);
  console.log('req.body:', req.body);
console.log('req.file:', req.file);
  try {
    const { name, price, description, imageUrl, stock } = req.body;
    let image = imageUrl || (req.file ? `/images/${req.file.filename}` : undefined);

    const update = { name, price, description };
    if (image !== undefined) update.image = image;
    if (stock !== undefined) update.stock = parseInt(stock, 10);

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, product });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Delete product
app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ------------------------------------------------------
// 🧾 ADMIN — GET ALL ORDERS
// ------------------------------------------------------
app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// ------------------------------------------------------
// 🧾 ADMIN — GET ONE ORDER
// ------------------------------------------------------
app.get('/api/admin/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ------------------------------------------------------
// 🌐 STATIC FILES (Public Website)
// ------------------------------------------------------
app.use(express.static(path.join(__dirname, '../public')));

// ------------------------------------------------------
// 🚀 START SERVER
// ------------------------------------------------------
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
