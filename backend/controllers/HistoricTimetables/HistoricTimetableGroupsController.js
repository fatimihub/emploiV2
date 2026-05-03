const { transform } = require('./../../helpers/transformers/timetableGroupsTransformer.js')
const { Timetable, Group, Branch } = require('./../../models')
const { Op, Sequelize } = require('sequelize')

const index = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const groupWhere = {};
    if (search) {
        groupWhere.code_group = { [Op.like]: `%${search}%` };
    }

    try {
        const { count, rows } = await Timetable.findAndCountAll({
            where: {
                status: "archived",
            },
            include: [
                {
                    model: Group,
                    as: 'group',
                    where: Object.keys(groupWhere).length ? groupWhere : undefined,
                    required: Object.keys(groupWhere).length > 0,
                    include: [
                        { model: Branch, as: "branch" }
                    ]
                }
            ],
            limit: limit,
            offset: offset,
            order: [['createdAt', 'DESC']],
            distinct: true,
        });

        const data = rows.map(timetable => transform(timetable));

        return res.json({
            page,
            limit,
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            data
        });

    } catch (err) {
        return res.status(400).json({ errors: 'Error: ' + err.message });
    }
}

const filterTimetableHistoric = async (req, res) => {
    const valid_form = req.query.valid_form;
    if (!valid_form) {
        return res.status(400).json({ errors: 'valid_form field is required for filter!' });
    }

    try {
        // Parse the date string to a Date object (adjust format as needed)
        const date = new Date(valid_form);
        if (isNaN(date.getTime())) {
            return res.status(400).json({ errors: 'Invalid date format for valid_form.' });
        }

        const timetables = await Timetable.findAll({
            where: {
                status: "archived",
                valid_form: date
            },
            include: [
                {
                    model: Group,
                    as: 'group',
                    include: [
                        { model: Branch, as: "branch" }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        const data = timetables.map(timetable => transform(timetable));
        return res.json({ data });

    } catch (err) {
        return res.status(400).json({ errors: 'Error: ' + err.message });
    }
}


const getAllUniqueValidFromDates = async (req, res) => {
    try {
        const dates = await Timetable.findAll({
            where: {
                status: "archived"
            },
            attributes: [
                [Sequelize.fn('DISTINCT', Sequelize.col('valid_form')), 'valid_form']
            ],
            order: [['valid_form', 'DESC']],
            raw: true
        });

        const uniqueDates = dates.map(d => new Date(d.valid_form).toLocaleDateString());

        return res.json(uniqueDates);

    } catch (err) {
        return res.status(500).json({ error: 'Error' + err });
    }
};

module.exports = { index, getAllUniqueValidFromDates, filterTimetableHistoric }