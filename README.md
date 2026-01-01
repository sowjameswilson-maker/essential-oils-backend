# Simple Self-Contained E-commerce Example


Folder structure:
```
my-shop/
index.html
shop.html
product.html
cart.html
success.html
css/styles.css
js/main.js
js/stripe.js
data/products.json
images/
server/
server.js
```


Development steps:
- Use a static file server to serve frontend files (or serve via Express static).
- Start the server with Stripe secret key available as `STRIPE_SECRET_KEY` env var.
- Replace placeholder images with real images in images/ folder.


Security & production checklist:
- Never commit your secret Stripe key.
- Use HTTPS in production.
- Validate/verify stock and amounts server-side before creating a payment.
- Use webhooks to fulfill orders after successful checkout.


Enjoy! Modify product data in `data/products.json` and tweak styles in `css/styles.css`.

┌───────────────────────┐
             │  Customer Browser     │
             │──────────────────────│
             │ - shop.html / cart.html
             │ - localStorage cart   │
             │ - Fetch API to server │
             └─────────┬────────────┘
                       │ HTTPS / fetch
                       ▼
             ┌───────────────────────┐
             │  Node.js + Express    │
             │  (server/server.js)  │
             │──────────────────────│
             │ Routes:               │
             │  • /api/products      │
             │  • /create-checkout-session
             │  • /webhook           │
             │  • /api/admin/products (CRUD)
             │ Middleware:           │
             │  • express.json()     │
             │  • express.raw()      │
             │ Static: /public       │
             └─────────┬────────────┘
                       │ MongoDB driver
                       ▼
             ┌───────────────────────┐
             │      MongoDB          │
             │──────────────────────│
             │ Collections:          │
             │  • products           │
             │  • orders             │
             └─────────┬────────────┘
                       │ HTTPS API calls
                       ▼
             ┌───────────────────────┐
             │       Stripe          │
             │──────────────────────│
             │ - Checkout session UI │
             │ - Payment processing  │
             │ - Sends webhook       │
             └───────────────────────┘

User clicks "Checkout" on website
           │
           ▼
  Frontend JS fetch /create-checkout-session
           │
           ▼
   Node/Express route creates
   Stripe Checkout Session
           │
           ▼
   Stripe Checkout page
   (user enters card info)
           │
           ▼
Stripe processes payment
           │
           ▼
 Stripe calls your /webhook route
 (checkout.session.completed event)
           │
           ▼
   Express webhook handler
   ├─ Reads session metadata (cart items)
   ├─ Saves order to MongoDB (Orders collection)
   └─ Reduces stock for purchased products
           │
           ▼
 MongoDB updated
 ├─ Orders collection has new order
 └─ Products collection stock updated
           │
           ▼
 Optional:
 - Stripe sends email receipt to customer
 - Admin page can fetch orders from MongoDB

 