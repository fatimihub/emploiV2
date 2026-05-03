const XLSX = require("xlsx");
const { Classroom, Formateur, sequelize } = require("../../models");

const importDataClassroom = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier n'a été téléchargé." });
  }

  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  } catch (error) {
    return res.status(400).json({ error: "Le fichier Excel est invalide." });
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  if (!rows || rows.length === 0) {
    return res.status(422).json({ error: "Le fichier est vide." });
  }

  const requiredColumns = ["Salle", "Mle Formateur", "Formateur"];
  const firstRowKeys = rows[0] ? Object.keys(rows[0]) : [];
  const missingColumns = requiredColumns.filter(
    (col) => !firstRowKeys.includes(col)
  );

  if (missingColumns.length > 0) {
    return res.status(422).json({
      error: `Colonnes manquantes: ${missingColumns.join(", ")}`,
    });
  }

  const errors = [];
  let hasErrors = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;

    const salle = (row["Salle"] || "").toString().trim();
    const mleFormateur = (row["Mle Formateur"] || "").toString().trim();
    const formateur = (row["Formateur"] || "").toString().trim();

    if (!salle && !mleFormateur && !formateur) {
      continue;
    }

    const missingFields = [];
    if (!salle) missingFields.push("Salle");
    if (!mleFormateur) missingFields.push("Mle Formateur");
    if (!formateur) missingFields.push("Formateur");

    if (missingFields.length > 0) {
      errors.push(`Ligne ${rowNumber}: Champs manquants: ${missingFields.join(", ")}`);
      hasErrors = true;
      continue;
    }

    let transaction;
    try {
      if (!sequelize) {
        throw new Error("L'objet Sequelize n'est pas disponible pour les transactions.");
      }
      transaction = await sequelize.transaction();

      try {
        const [classroom] = await Classroom.findOrCreate({
          where: { label: salle },
          defaults: { label: salle },
          transaction,
        });

        if (!classroom?.id) {
          throw new Error("Impossible d'obtenir ou de créer la salle de classe.");
        }

        await Formateur.upsert(
          {
            mle_formateur: mleFormateur,
            name: formateur,
            classroomId: classroom.id,
            is_available: true,
          },
          {
            transaction,
            returning: false,
          }
        );

        await transaction.commit();
      } catch (error) {
        if (transaction) {
          await transaction.rollback();
        }

        console.error(
          `Erreur lors du traitement de la ligne ${rowNumber} (${salle}/${mleFormateur}):`,
          {
            error: error.message,
            errorName: error.name,
            code: error.parent?.code,
            sql: error.parent?.sql,
          }
        );

        let errorMessage;
        if (error.name === "SequelizeUniqueConstraintError" || error.parent?.code === "ER_DUP_ENTRY") {
          errorMessage = `Le matricule ${mleFormateur} existe déjà pour un autre formateur ou une contrainte unique a été violée.`;
        } else if (error.name === "SequelizeForeignKeyConstraintError") {
          errorMessage = `Erreur de référence: la salle '${salle}' n'existe pas ou est invalide.`;
        } else {
          errorMessage = `Erreur lors du traitement de la ligne: ${error.message}`;
        }

        errors.push(`Ligne ${rowNumber}: ${errorMessage}`);
        hasErrors = true;
      }
    } catch (err) {
      console.error(`Erreur inattendue dans la ligne ${rowNumber}:`, err);
      errors.push(`Ligne ${rowNumber}: Une erreur inattendue est survenue: ${err.message}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    const errorMessage =
      errors.length > 5
        ? `Des erreurs sont survenues dans ${errors.length} lignes. Seules les 5 premières sont affichées: ${errors.slice(0, 5).join('\n')}`
        : errors.join("\n");

    return res.status(422).json({
      error: errorMessage,
      hasErrors: true,
      details: errors.length > 5 ? errors.slice(0, 5) : errors,
    });
  }

  return res.status(200).json({
    message: "Importation terminée avec succès.",
    hasErrors: false,
  });
};

module.exports = { importDataClassroom };