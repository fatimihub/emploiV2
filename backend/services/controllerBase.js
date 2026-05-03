/**
 * High-Performance Controller Base
 * Provides optimized database operations and caching for all controllers
 */

const databaseService = require('./databaseService.js');

class ControllerBase {
  constructor() {
    this.cache = databaseService.cache;
  }

  /**
   * Optimized find all with caching and pagination
   */
  async findAll(model, options = {}) {
    const {
      where = {},
      include = [],
      order = [],
      limit = null,
      offset = 0,
      useCache = true,
      cacheTTL = 300,
      transaction = null
    } = options;

    const cacheKey = `findAll_${model.name}_${JSON.stringify({ where, include, order, limit, offset })}`;

    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const queryOptions = {
      where,
      include,
      order,
      transaction,
      logging: false // Disable logging for performance
    };

    if (limit) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }

    const result = await model.findAll(queryOptions);

    if (useCache && result) {
      this.cache.set(cacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Optimized find one with caching
   */
  async findOne(model, options = {}) {
    const {
      where = {},
      include = [],
      useCache = true,
      cacheTTL = 300,
      transaction = null
    } = options;

    const cacheKey = `findOne_${model.name}_${JSON.stringify({ where, include })}`;

    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await model.findOne({
      where,
      include,
      transaction,
      logging: false
    });

    if (useCache && result) {
      this.cache.set(cacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Optimized find by ID with caching
   */
  async findById(model, id, options = {}) {
    const {
      include = [],
      useCache = true,
      cacheTTL = 300,
      transaction = null
    } = options;

    const cacheKey = `findById_${model.name}_${id}_${JSON.stringify(include)}`;

    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await model.findByPk(id, {
      include,
      transaction,
      logging: false
    });

    if (useCache && result) {
      this.cache.set(cacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Optimized count with caching
   */
  async count(model, where = {}, options = {}) {
    const {
      useCache = true,
      cacheTTL = 300,
      transaction = null
    } = options;

    const cacheKey = `count_${model.name}_${JSON.stringify(where)}`;

    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    const result = await model.count({
      where,
      transaction,
      logging: false
    });

    if (useCache) {
      this.cache.set(cacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Optimized create with cache invalidation
   */
  async create(model, data, options = {}) {
    const {
      transaction = null,
      invalidateCache = true
    } = options;

    const result = await model.create(data, {
      transaction,
      logging: false
    });

    if (invalidateCache) {
      this.invalidateModelCache(model.name);
    }

    return result;
  }

  /**
   * Optimized bulk create with cache invalidation
   */
  async bulkCreate(model, data, options = {}) {
    const {
      transaction = null,
      invalidateCache = true,
      updateOnDuplicate = []
    } = options;

    const result = await model.bulkCreate(data, {
      transaction,
      logging: false,
      updateOnDuplicate
    });

    if (invalidateCache) {
      this.invalidateModelCache(model.name);
    }

    return result;
  }

  /**
   * Optimized update with cache invalidation
   */
  async update(model, data, where, options = {}) {
    const {
      transaction = null,
      invalidateCache = true
    } = options;

    const result = await model.update(data, {
      where,
      transaction,
      logging: false
    });

    if (invalidateCache) {
      this.invalidateModelCache(model.name);
    }

    return result;
  }

  /**
   * Optimized upsert with cache invalidation
   */
  async upsert(model, data, options = {}) {
    const {
      transaction = null,
      invalidateCache = true
    } = options;

    const result = await model.upsert(data, {
      transaction,
      logging: false
    });

    if (invalidateCache) {
      this.invalidateModelCache(model.name);
    }

    return result;
  }

  /**
   * Optimized delete with cache invalidation
   */
  async destroy(model, where, options = {}) {
    const {
      transaction = null,
      invalidateCache = true
    } = options;

    const result = await model.destroy({
      where,
      transaction,
      logging: false
    });

    if (invalidateCache) {
      this.invalidateModelCache(model.name);
    }

    return result;
  }

  /**
   * Invalidate cache for specific model
   */
  invalidateModelCache(modelName) {
    const keys = this.cache.keys();
    keys.forEach(key => {
      if (key.includes(modelName)) {
        this.cache.del(key);
      }
    });
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.flushAll();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      keys: this.cache.keys().length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
      keyspace: this.cache.keys()
    };
  }

  /**
   * Optimized pagination helper
   */
  async paginate(model, page = 1, limit = 10, options = {}) {
    const offset = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.findAll(model, { ...options, limit, offset }),
      this.count(model, options.where || {})
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Optimized search with multiple fields
   */
  async search(model, searchTerm, fields = [], options = {}) {
    const { Op } = require('sequelize');
    
    if (!searchTerm || fields.length === 0) {
      return this.findAll(model, options);
    }

    const searchConditions = fields.map(field => ({
      [field]: {
        [Op.iLike]: `%${searchTerm}%`
      }
    }));

    const where = {
      [Op.or]: searchConditions,
      ...options.where
    };

    return this.findAll(model, { ...options, where });
  }

  /**
   * Optimized aggregation
   */
  async aggregate(model, aggregation, options = {}) {
    const {
      where = {},
      group = [],
      transaction = null,
      useCache = true,
      cacheTTL = 300
    } = options;

    const cacheKey = `aggregate_${model.name}_${JSON.stringify({ aggregation, where, group })}`;

    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await model.findAll({
      attributes: aggregation,
      where,
      group,
      transaction,
      logging: false,
      raw: true
    });

    if (useCache && result) {
      this.cache.set(cacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Performance monitoring wrapper
   */
  async withPerformanceMonitoring(operation, name = 'operation') {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        console.warn(`Slow ${name}: ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`${name} failed after ${duration}ms:`, error.message);
      throw error;
    }
  }

  /**
   * Transaction wrapper with performance monitoring
   */
  async withTransaction(operation, options = {}) {
    const { sequelize } = require('../models');
    const transaction = await sequelize.transaction();
    
    try {
      const result = await operation(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = ControllerBase; 