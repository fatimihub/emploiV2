const { GenerationReport } = require('../../models');
const { GlobalGenerationReport } = require('../../models');
const { Op } = require('sequelize');

// GET /api/v1/group/:groupId/generation-reports
exports.getGenerationReportsForGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!groupId) {
      return res.status(400).json({ error: 'groupId is required' });
    }
    const reports = await GenerationReport.findAll({
      where: { groupId },
      order: [['date', 'DESC']],
      attributes: ['id', 'groupId', 'groupCode', 'date', 'reportText', 'status', 'createdAt']
    });
    return res.json({ reports });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/v1/global-generation-reports
exports.getAllGlobalGenerationReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const where = {};
    if (req.query.date) {
      // Filter by date (YYYY-MM-DD)
      const date = req.query.date;
      where.date = {
        [Op.gte]: new Date(date + 'T00:00:00.000Z'),
        [Op.lt]: new Date(date + 'T23:59:59.999Z')
      };
    }
    const { count, rows: reports } = await GlobalGenerationReport.findAndCountAll({
      where,
      order: [['date', 'DESC']],
      attributes: ['id', 'date', 'reportText', 'totalGroups', 'successCount', 'failCount', 'createdAt'],
      limit,
      offset
    });
    const totalPages = Math.ceil(count / limit);
    return res.json({ reports, total: count, totalPages, page, limit });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}; 