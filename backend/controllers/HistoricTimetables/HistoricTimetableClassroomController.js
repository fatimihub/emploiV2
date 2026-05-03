const { Timetable, Group, Branch, Session, Formateur, Module, Classroom } = require('../../models');
const { Op, Sequelize } = require('sequelize');

/**
 * List paginated archived timetables grouped by classroom (salle).
 * Supports search by classroom label and filter by valid_from date.
 */
const index = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const validFrom = req.query.valid_from || '';

    try {
        // Build timetable where clause for date filter
        const timetableWhere = { status: 'archived' };
        if (validFrom) {
            const date = new Date(validFrom);
            if (!isNaN(date.getTime())) {
                timetableWhere.valid_form = date;
            }
        }

        // Build classroom where for search
        const classroomWhere = {};
        if (search) {
            classroomWhere.label = { [Op.like]: `%${search}%` };
        }

        const { count, rows } = await Timetable.findAndCountAll({
            where: timetableWhere,
            include: [
                { model: Group, as: 'group', include: [{ model: Branch, as: 'branch' }] },
                {
                    model: Session,
                    include: [
                        { model: Formateur, as: 'formateur' },
                        { model: Module, as: 'module' },
                        {
                            model: Classroom,
                            as: 'classroom',
                            where: Object.keys(classroomWhere).length ? classroomWhere : undefined,
                            required: Object.keys(classroomWhere).length > 0,
                        },
                    ],
                },
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']],
            distinct: true,
        });

        // Build a display row per timetable with classroom info
        const data = rows.map((timetable) => {
            const allClassrooms = [];
            const seen = new Set();
            (timetable.Sessions || []).forEach((session) => {
                if (session.classroom && !seen.has(session.classroom.id)) {
                    seen.add(session.classroom.id);
                    allClassrooms.push({
                        id: session.classroom.id,
                        label: session.classroom.label,
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
                salles: allClassrooms,
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
 * Get all unique valid_from dates from archived timetables.
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
