// server/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  image: String,// optional, URL to image
  stock: { type: Number, default: 0 }  // new field
});

module.exports = mongoose.model('Product', productSchema);