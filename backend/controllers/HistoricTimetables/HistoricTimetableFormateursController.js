const { Timetable, Group, Branch, Session, Formateur, Module, Classroom } = require('../../models');
const { Op, Sequelize } = require('sequelize');

/**
 * List paginated archived formateur timetables (grouped by formateur).
 * Supports search by formateur name or mle, and filter by valid_from date.
 */
const index = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const validFrom = req.query.valid_from || '';

    try {
        // Build formateur where clause for search
        const formateurWhere = {};
        if (search) {
            formateurWhere[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { mle: { [Op.like]: `%${search}%` } },
            ];
        }

        // Build timetable where clause for date filter
        const timetableWhere = { status: 'archived' };
        if (validFrom) {
            const date = new Date(validFrom);
            if (!isNaN(date.getTime())) {
                timetableWhere.valid_form = date;
            }
        }

        // Get all archived timetables with sessions that have formateurs
        const { count, rows } = await Timetable.findAndCountAll({
            where: timetableWhere,
            include: [
                { model: Group, as: 'group', include: [{ model: Branch, as: 'branch' }] },
                {
                    model: Session,
                    include: [
                        {
                            model: Formateur,
                            as: 'formateur',
                            where: Object.keys(formateurWhere).length ? formateurWhere : undefined,
                            required: Object.keys(formateurWhere).length > 0,
                        },
                        { model: Module, as: 'module' },
                        { model: Classroom, as: 'classroom' },
                    ],
                },
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']],
            distinct: true,
        });

        // Extract unique formateurs per timetable for display
        const data = rows.map((timetable) => {
            const allFormateurs = [];
            const seen = new Set();
            (timetable.Sessions || []).forEach((session) => {
                if (session.formateur && !seen.has(session.formateur.id)) {
                    seen.add(session.formateur.id);
                    allFormateurs.push({
                        id: session.formateur.id,
                        mle: session.formateur.mle,
                        name: session.formateur.name,
                    });
                }
            });
            return {
                id: timetable.id,
                valid_form: timetable.valid_form
                    ? new Date(timetable.valid_form).toLocaleDateString('fr-FR')
                    : '',
                nbr_hours_in_week: (timetable.Sessions || []).length * 2.5,
                groupe: timetable.group?.code_group || '',
                label_branch: timetable.group?.branch?.label || '',
                formateurs: allFormateurs,
            };
        });

        return res.json({
            page,
            limit,
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            data,
        });
    } catch (err) {
        return res.status(400).json({ errors: 'Error: ' + err.message });
    }
};

/**
 * Get all unique valid_from dates from archived timetables (for filter dropdown).
 */
const getAllUniqueValidFromDates = async (req, res) => {
    try {
        const dates = await Timetable.findAll({
            where: { status: 'archived' },
            attributes: [
                [Sequelize.fn('DISTINCT', Sequelize.col('valid_form')), 'valid_form'],
            ],
            order: [['valid_form', 'DESC']],
            raw: true,
        });
        const uniqueDates = dates.map((d) =>
            new Date(d.valid_form).toLocaleDateString('fr-FR')
        );
        return res.json(uniqueDates);
    } catch (err) {
        return res.status(500).json({ error: 'Error: ' + err.message });
    }
};

module.exports = { index, getAllUniqueValidFromDates };
