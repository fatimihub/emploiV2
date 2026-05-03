const { Timetable, Group, Branch, Session, Classroom, Formateur, Module } = require('./../models')
const { transform } = require('./../helpers/transformers/timetableGroupsTransformer.js')
const { transformTimetableGroup } = require('./../helpers/transformers/timetableGroupTransformer.js')
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const { FormateurTimetable } = require('../models');
const { getValidTimeShotsForFormateurDay } = require('./GA/constraints');


const index = async (req, res) => {
  try {
    const timetablesActive = await Timetable.findAll({
      where: {
        status: "active"
      },
      include: [
        {
          model: Group, as: 'group',
          include: [
            { model: Branch, as: "branch" }
          ]
        },
        { model: Session }
      ]
    })

    const data = timetablesActive.map(timetable => transform(timetable))
    return res.json(data)
    // return res.json(timetablesActive)

  } catch (err) {
    res.json(err)
  }
}


const show = async (req, res) => {
  const { id } = req.params

  if (!id) {
    return res.status(422).json({ "errors": 'not have this timetable for this id !!' })
  }
  try {
    const timetable = await Timetable.findOne({
      where: {
        id: id
      },
      include: [
        {
          model: Group, as: 'group',
          include: [
            { model: Branch, as: "branch" }
          ]
        },
        {
          model: Session,
          include: [
            { model: Formateur, as: 'formateur' },
            { model: Classroom, as: "classroom" },
            { model: Module, as: "module" }
          ]
        }
      ]
    })

    return res.json(transformTimetableGroup(timetable))

  } catch (err) {

  }
}

// Export group timetables as Excel
const exportGroupsExcel = async (req, res) => {
  try {
    // Fetch all active timetables with group and sessions
    const timetables = await Timetable.findAll({
      where: { status: 'active' },
      include: [
        {
          model: Group,
          as: 'group',
          include: [{ model: Branch, as: 'branch' }],
        },
        {
          model: Session,
          include: [
            { model: Module, as: 'module' },
            { model: Formateur, as: 'formateur' },
            { model: Classroom, as: 'classroom' },
          ],
        },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Emplois du temps des groupes');

    // Header
    sheet.addRow([
      'Groupe',
      'Branche',
      'Niveau',
      'Date de validité',
      "Nombre d'heures",
      'Sessions (Résumé)',
    ]);

    timetables.forEach((tt) => {
      const sessionsSummary = (tt.Sessions || [])
        .map(
          (s) =>
            `${s.day} ${s.timeshot}: ${s.module?.label || ''} (${s.type}) - ${s.formateur?.name || ''} - ${s.classroom?.label || 'Teams'}`
        )
        .join('\n');
      sheet.addRow([
        tt.group?.code_group || '',
        tt.group?.branch?.label || '',
        tt.group?.niveau || '',
        tt.valid_form ? new Date(tt.valid_form).toLocaleDateString() : '',
        tt.nbr_hours_in_week || '',
        sessionsSummary,
      ]);
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="emplois_du_temps_groupes.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de l\'export Excel.' });
  }
};

// Export group timetables as PDF
const exportGroupsPdf = async (req, res) => {
  try {
    // Fetch all active timetables with group and sessions
    const timetables = await Timetable.findAll({
      where: { status: 'active' },
      include: [
        {
          model: Group,
          as: 'group',
          include: [{ model: Branch, as: 'branch' }],
        },
        {
          model: Session,
          include: [
            { model: Module, as: 'module' },
            { model: Formateur, as: 'formateur' },
            { model: Classroom, as: 'classroom' },
          ],
        },
      ],
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="emplois_du_temps_groupes.pdf"');

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(18).text('Emplois du temps des groupes', { align: 'center' });
    doc.moveDown();

    timetables.forEach((tt, idx) => {
      doc.fontSize(12).fillColor('black');
      doc.text(`Groupe: ${tt.group?.code_group || ''}`, { continued: true }).text(`   Branche: ${tt.group?.branch?.label || ''}`);
      doc.text(`Niveau: ${tt.group?.niveau || ''}`, { continued: true }).text(`   Date de validité: ${tt.valid_form ? new Date(tt.valid_form).toLocaleDateString() : ''}`);
      doc.text(`Nombre d'heures: ${tt.nbr_hours_in_week || ''}`);
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Sessions:', { underline: true });
      doc.font('Helvetica').fontSize(10);
      (tt.Sessions || []).forEach((s) => {
        doc.text(`- ${s.day} ${s.timeshot}: ${s.module?.label || ''} (${s.type}) - ${s.formateur?.name || ''} - ${s.classroom?.label || 'Teams'}`);
      });
      doc.moveDown();
      if (idx < timetables.length - 1) doc.addPage();
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de l'export PDF." });
  }
};

const updateSessionPosition = async (req, res) => {
  try {
    const { timetableId, from, to } = req.body;
    if (!timetableId || !from || !to) {
      return res.status(400).json({ message: 'Requête invalide.' });
    }

    // Find the timetable
    const timetable = await Timetable.findOne({
      where: { id: timetableId },
      include: [{ model: Session }]
    });
    if (!timetable) {
      return res.status(404).json({ message: 'Emploi du temps introuvable.' });
    }

    // Find the session to move
    const sessionToMove = await Session.findOne({
      where: {
        timetableId,
        day: from.day,
        timeshot: from.timeshot
      }
    });
    if (!sessionToMove) {
      return res.status(404).json({ message: 'Session à déplacer introuvable.' });
    }

    // Get the target timeshot value
    const targetTimeshot = to.timeshot;
    if (!targetTimeshot) {
      return res.status(400).json({ message: 'Créneau cible invalide. Veuillez réessayer.' });
    }

    // Check for teacher (formateur) conflict
    const teacherConflict = await Session.findOne({
      where: {
        timetableId,
        day: to.day,
        timeshot: targetTimeshot,
        formateurId: sessionToMove.formateurId,
        id: { [Op.ne]: sessionToMove.id }
      }
    });
    if (teacherConflict) {
      return res.status(400).json({ message: 'Conflit: ce formateur a déjà une session à ce moment.' });
    }

    // Check for classroom conflict
    const classroomConflict = await Session.findOne({
      where: {
        timetableId,
        day: to.day,
        timeshot: targetTimeshot,
        classroomId: sessionToMove.classroomId,
        id: { [Op.ne]: sessionToMove.id }
      }
    });
    if (classroomConflict) {
      return res.status(400).json({ message: 'Conflit: cette salle est déjà occupée à ce moment.' });
    }

    // Check if the formateur is not taken by another group at the new place
    const otherGroupConflict = await Session.findOne({
      where: {
        day: to.day,
        timeshot: targetTimeshot,
        formateurId: sessionToMove.formateurId,
        timetableId: { [Op.ne]: timetableId }, // not the same timetable
      }
    });
    if (otherGroupConflict) {
      return res.status(400).json({ message: 'Ce formateur est déjà pris par un autre groupe à ce moment.' });
    }

    // Check if the session is valid in the formateur's timetable (all days)
    const validSlots = await getValidTimeShotsForFormateurDay(sessionToMove.formateurId, to.day);
    if (!validSlots.includes(targetTimeshot)) {
      return res.status(400).json({
        message: validSlots.length
          ? `Le formateur n'est disponible que sur les créneaux suivants le ${to.day} : ${validSlots.join(', ')}.`
          : `Le formateur n'est pas disponible le ${to.day}.`
      });
    }

    // Example validation: you can add more rules here
    // ...

    // Update the session's day and timeshot
    sessionToMove.day = to.day;
    sessionToMove.timeshot = targetTimeshot;
    await sessionToMove.save();

    // Return the updated timetable (transform as needed)
    const updatedTimetable = await Timetable.findOne({
      where: { id: timetableId },
      include: [{
        model: Group,
        as: 'group',
        include: [{ model: Branch, as: 'branch' }],
      }, {
        model: Session,
        include: [
          { model: Module, as: 'module' },
          { model: Formateur, as: 'formateur' },
          { model: Classroom, as: 'classroom' },
        ]
      }]
    });
    res.json({ updatedTimetable: transformTimetableGroup(updatedTimetable) });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur lors du déplacement.' });
  }
};

const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'ID de séance manquant.' });
    }

    const session = await Session.findByPk(id);
    if (!session) {
      return res.status(404).json({ message: 'Séance introuvable.' });
    }

    const timetableId = session.timetableId;
    await session.destroy();
    
    // Fetch updated timetable to return to frontend
    const updatedTimetable = await Timetable.findOne({
      where: { id: timetableId },
      include: [
        {
          model: Group, as: 'group',
          include: [{ model: Branch, as: "branch" }]
        },
        {
          model: Session,
          include: [
            { model: Formateur, as: 'formateur' },
            { model: Classroom, as: "classroom" },
            { model: Module, as: "module" }
          ]
        }
      ]
    });

    res.json({ 
      success: true, 
      message: 'Séance supprimée avec succès.',
      updatedTimetable: transformTimetableGroup(updatedTimetable)
    });
  } catch (err) {
    console.error('Error deleting session:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la séance.' });
  }
};

module.exports = { index, show }
module.exports.exportGroupsExcel = exportGroupsExcel;
module.exports.exportGroupsPdf = exportGroupsPdf;
module.exports.updateSessionPosition = updateSessionPosition;
module.exports.deleteSession = deleteSession;