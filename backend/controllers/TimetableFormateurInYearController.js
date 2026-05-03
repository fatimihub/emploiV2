const path = require('path');
const {transform, calculateWeeklyHours} = require('../helpers/transformers/timetableFormateursTransformer.js');
const {transformFormateur, calculateWeeklyHours: calculateWeeklyHoursSingle} = require('../helpers/transformers/timetableFormateurTransformer.js');
const ExcelJS = require('exceljs');
const { FormateurTimetable, Session, Module, Classroom, Formateur } = require('../models');
const PDFDocument = require('pdfkit');

const index = async (req, res) => {
  const formateurs = await Formateur.findAll({
    include: [{ model: FormateurTimetable }],
  });
  
  const data = formateurs.map(formateur => transform(formateur))
   if(data[0].nbr_hours_in_week  == -1 ){
     return res.status(422).json({"errors" : 'repeat generate les emplois du temps des formateurs en année !'})
   }
   
  return res.json(data);
};


const show =async (req , res ) => {
     const { mle_formateur } = req.params 

     if(!mle_formateur){
        return res.status(422).json({"errors" : "mle_formateur required for get emploi du temps de formateur en année!"})
     }

     const formateur = await Formateur.findOne({
       where : {
          mle_formateur : mle_formateur
       }, 
       include : [
        { model : FormateurTimetable }
       ]
     })

     const data = transformFormateur(formateur)

     return res.json(data)
}

// Export formateur timetables as Excel
const exportFormateursExcel = async (req, res) => {
  try {
    // Fetch all formateur timetables with sessions
    const formateurTimetables = await FormateurTimetable.findAll({
      include: [
        {
          model: Formateur,
          as: 'formateur',
        },
        {
          model: Session,
          include: [
            { model: Module, as: 'module' },
            { model: Classroom, as: 'classroom' },
          ],
        },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Emplois du temps des formateurs');

    // Header
    sheet.addRow([
      'Formateur',
      'MLE',
      'Date de validité',
      "Nombre d'heures",
      'Sessions (Résumé)',
    ]);

    formateurTimetables.forEach((ft) => {
      const sessions = ft.Sessions || [];
      // Dynamically calculate total hours
      const totalHours = calculateWeeklyHours(sessions);
      const sessionsSummary = sessions
        .map(
          (s) =>
            `${s.day} ${s.timeshot}: ${s.module?.label || ''} (${s.type}) - ${s.classroom?.label || 'Teams'}`
        )
        .join('\n');
      sheet.addRow([
        ft.formateur?.name || '',
        ft.formateur?.mle_formateur || '',
        ft.valid_form ? new Date(ft.valid_form).toLocaleDateString() : '',
        totalHours,
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
      'attachment; filename="emplois_du_temps_formateurs.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exporting Excel:', err);
    res.status(500).json({ message: 'Erreur lors de l\'export Excel.' });
  }
};

// Export formateur timetables as PDF
const exportFormateursPdf = async (req, res) => {
  try {
    // Fetch all formateur timetables with sessions
    const formateurTimetables = await FormateurTimetable.findAll({
      include: [
        {
          model: Formateur,
          as: 'formateur',
        },
        {
          model: Session,
          include: [
            { model: Module, as: 'module' },
            { model: Classroom, as: 'classroom' },
          ],
        },
      ],
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="emplois_du_temps_formateurs.pdf"');

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(18).text('Emplois du temps des formateurs', { align: 'center' });
    doc.moveDown();

    formateurTimetables.forEach((ft, idx) => {
      doc.fontSize(12).fillColor('black');
      const sessions = ft.Sessions || [];
      // Dynamically calculate total hours
      const totalHours = calculateWeeklyHours(sessions);
      doc.text(`Formateur: ${ft.formateur?.name || ''}`, { continued: true }).text(`   MLE: ${ft.formateur?.mle_formateur || ''}`);
      doc.text(`Date de validité: ${ft.valid_form ? new Date(ft.valid_form).toLocaleDateString() : ''}`, { continued: true }).text(`   Nombre d'heures: ${totalHours}`);
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Sessions:', { underline: true });
      doc.font('Helvetica').fontSize(10);
      sessions.forEach((s) => {
        doc.text(`- ${s.day} ${s.timeshot}: ${s.module?.label || ''} (${s.type}) - ${s.classroom?.label || 'Teams'}`);
      });
      doc.moveDown();
      if (idx < formateurTimetables.length - 1) doc.addPage();
    });

    doc.end();
  } catch (err) {
    console.error('Error exporting PDF:', err);
    res.status(500).json({ message: "Erreur lors de l'export PDF." });
  }
};

module.exports = { index , show };
module.exports.exportFormateursExcel = exportFormateursExcel;
module.exports.exportFormateursPdf = exportFormateursPdf;
