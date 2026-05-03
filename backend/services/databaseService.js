/**
 * High-Performance Database Service
 * Optimizes database operations for maximum performance
 */

const { sequelize } = require('../models');
const NodeCache = require('node-cache');

class DatabaseService {
  constructor() {
    // Initialize cache with 5 minutes TTL
    this.cache = new NodeCache({ 
      stdTTL: 300, 
      checkperiod: 600,
      maxKeys: 1000 
    });
    
    // Performance metrics
    this.metrics = {
      queries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      slowQueries: 0,
      totalTime: 0
    };

    // Query timeout (30 seconds)
    this.queryTimeout = 30000;
    
    // Note: initializeOptimizations() is called explicitly from index.js after DB path is set
  }

  /**
   * Initialize database performance optimizations
   */
  async initializeOptimizations() {
    try {
      // Enable WAL mode for better concurrency
      await sequelize.query('PRAGMA journal_mode = WAL;');
      
      // Increase cache size
      await sequelize.query('PRAGMA cache_size = 10000;');
      
      // Use memory for temp storage
      await sequelize.query('PRAGMA temp_store = MEMORY;');
      
      // Enable foreign keys
      await sequelize.query('PRAGMA foreign_keys = ON;');
      
      // Set page size for better performance
      await sequelize.query('PRAGMA page_size = 4096;');
      
      console.log('Database optimizations applied');
    } catch (error) {
      console.warn('Some database optimizations failed:', error.message);
    }
  }

  /**
   * Execute query with performance monitoring and caching
   */
  async executeQuery(query, params = [], options = {}) {
    const startTime = Date.now();
    const cacheKey = options.cacheKey || this.generateCacheKey(query, params);
    
    // Check cache first
    if (options.useCache !== false && cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }
    }

    try {
      // Execute query with timeout
      const result = await Promise.race([
        sequelize.query(query, { 
          replacements: params,
          type: sequelize.QueryTypes.SELECT,
          ...options
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), this.queryTimeout)
        )
      ]);

      // Cache result if requested
      if (options.useCache !== false && cacheKey && result) {
        this.cache.set(cacheKey, result, options.cacheTTL || 300);
      }

      // Update metrics
      const duration = Date.now() - startTime;
      this.metrics.queries++;
      this.metrics.totalTime += duration;
      
      if (duration > 1000) {
        this.metrics.slowQueries++;
        console.warn(`Slow query detected: ${duration}ms - ${query.substring(0, 100)}...`);
      }

      return result;
    } catch (error) {
      console.error('Query error:', error.message);
      throw error;
    }
  }

  /**
   * Bulk insert with optimized performance
   */
  async bulkInsert(model, data, options = {}) {
    const startTime = Date.now();
    
    try {
      const result = await model.bulkCreate(data, {
        ignoreDuplicates: true,
        updateOnDuplicate: options.updateOnDuplicate || [],
        transaction: options.transaction,
        ...options
      });

      const duration = Date.now() - startTime;
      console.log(`Bulk insert: ${data.length} records in ${duration}ms`);
      
      return result;
    } catch (error) {
      console.error('Bulk insert error:', error.message);
      throw error;
    }
  }

  /**
   * Optimized find with caching
   */
  async findWithCache(model, where, options = {}) {
    const cacheKey = `find_${model.name}_${JSON.stringify(where)}`;
    
    return this.executeQuery(
      `SELECT * FROM ${model.tableName} WHERE ${this.buildWhereClause(where)}`,
      this.extractParams(where),
      {
        cacheKey,
        useCache: options.useCache !== false,
        cacheTTL: options.cacheTTL || 300,
        ...options
      }
    );
  }

  /**
   * Optimized findOne with caching
   */
  async findOneWithCache(model, where, options = {}) {
    const cacheKey = `findOne_${model.name}_${JSON.stringify(where)}`;
    
    const results = await this.executeQuery(
      `SELECT * FROM ${model.tableName} WHERE ${this.buildWhereClause(where)} LIMIT 1`,
      this.extractParams(where),
      {
        cacheKey,
        useCache: options.useCache !== false,
        cacheTTL: options.cacheTTL || 300,
        ...options
      }
    );

    return results[0] || null;
  }

  /**
   * Optimized count with caching
   */
  async countWithCache(model, where = {}, options = {}) {
    const cacheKey = `count_${model.name}_${JSON.stringify(where)}`;
    
    const result = await this.executeQuery(
      `SELECT COUNT(*) as count FROM ${model.tableName} WHERE ${this.buildWhereClause(where)}`,
      this.extractParams(where),
      {
        cacheKey,
        useCache: options.useCache !== false,
        cacheTTL: options.cacheTTL || 300,
        ...options
      }
    );

    return result[0]?.count || 0;
  }

  /**
   * Clear cache for specific model or all cache
   */
  clearCache(pattern = null) {
    if (pattern) {
      const keys = this.cache.keys();
      keys.forEach(key => {
        if (key.includes(pattern)) {
          this.cache.del(key);
        }
      });
    } else {
      this.cache.flushAll();
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      averageQueryTime: this.metrics.queries > 0 ? this.metrics.totalTime / this.metrics.queries : 0,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100,
      cacheSize: this.cache.keys().length
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics = {
      queries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      slowQueries: 0,
      totalTime: 0
    };
  }

  /**
   * Generate cache key from query and parameters
   */
  generateCacheKey(query, params) {
    return `query_${Buffer.from(query + JSON.stringify(params)).toString('base64').substring(0, 50)}`;
  }

  /**
   * Build WHERE clause for queries
   */
  buildWhereClause(where) {
    if (typeof where === 'string') return where;
    
    const conditions = [];
    Object.keys(where).forEach(key => {
      conditions.push(`${key} = :${key}`);
    });
    
    return conditions.join(' AND ') || '1=1';
  }

  /**
   * Extract parameters from where object
   */
  extractParams(where) {
    if (typeof where === 'string') return [];
    return where;
  }

  /**
   * Optimize database for better performance
   */
  async optimize() {
    try {
      // Analyze tables for better query planning
      await sequelize.query('ANALYZE;');
      
      // Vacuum database to reclaim space
      await sequelize.query('VACUUM;');
      
      // Clear cache
      this.clearCache();
      
      console.log('Database optimization completed');
    } catch (error) {
      console.warn('Database optimization failed:', error.message);
    }
  }

  /**
   * Health check for database performance
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      await sequelize.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        metrics: this.getMetrics(),
        cacheSize: this.cache.keys().length
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService; 