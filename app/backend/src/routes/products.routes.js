import { getAllProducts, getProductById } from '../db/products.repository.js';
import express from 'express';

const router = express.Router();

// GET /api/products — paginated product list
router.get('/', async (req, res, next) => {
  try {
    const limit  = parseInt(req.query.limit    || '20');
    const page   = parseInt(req.query.page     || '1');
    const filter = req.query.category || '';

    const products = await getAllProducts();

    let filtered = filter
      ? products.filter(p => p.category_group?.toLowerCase() === filter.toLowerCase())
      : products;

    const total  = filtered.length;
    const offset = (page - 1) * limit;
    const data   = filtered.slice(offset, offset + limit);

    res.json({ success: true, data, total, page, limit });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) {
    // getProductById single() throws an error if not found, we can catch it
    if (error.code === 'PGRST116') {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    next(error);
  }
});

export default router;
