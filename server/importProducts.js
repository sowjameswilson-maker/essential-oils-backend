// importProducts.js
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

async function importProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // EDIT THESE PRODUCTS HOWEVER YOU WANT
    const products = [
      {
        name: "Lavender Essential Oil",
        price: 14.99,
        image: "/images/lavender.jpg",
        description: "Relaxing, calming lavender essential oil."
      },
      {
        name: "Peppermint Essential Oil",
        price: 12.49,
        image: "/images/peppermint.jpg",
        description: "Refreshing peppermint essential oil."
      },
      {
        name: "Rose Hydrosol",
        price: 9.99,
        image: "/images/rose-hydrosol.jpg",
        description: "Gentle, soothing floral hydrosol."
      }
    ];

    // Clears old data (optional — delete if you don’t want that)
    await Product.deleteMany({});
    console.log("Old products removed");

    // Insert new products
    await Product.insertMany(products);
    console.log("Products imported successfully!");

    process.exit();
  } catch (err) {
    console.error("Error importing products:", err);
    process.exit(1);
  }
}

importProducts();