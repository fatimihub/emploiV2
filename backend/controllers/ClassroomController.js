const { Classroom, Formateur } = require("./../models");
const {
  transform,
} = require("./../helpers/transformers/classroomTransformer.js");

const index = async (req, res) => {
  const classrooms = await Classroom.findAll({
    include: [{ model: Formateur, as: "formateurs" }],
  });

  const data = classrooms
    .filter((classroom) => classroom.label != "UnKnown")
    .map((classroom) => transform(classroom));
  return res.json(data);
};

const addClassroom = async (req , res ) => {
  const {label , formateur1 ,  formateur2} = req.body

  if(!label || !formateur1 || !formateur2){
      return res.status(422).json({ "errors" : "Les champs 'label', 'formateur1' et 'formateur2' sont obligatoires !" })
  }
   try{
   const classroom =   await Classroom.create({
       label : label , 
       is_available : true 
    })

    await Formateur.update({
      classroomId : classroom.id 
    } , {
      where : {
        id : formateur1
      }
    })

    await Formateur.update({
      classroomId : classroom.id 
    } , {
      where : {
        id : formateur2
      }
    })
    

    return res.json({"message" : "Salle créée avec succès"})


   }catch(err){
    return res.status(400).json({"errors" : 'Erreur : ' + err})
   }
}

const classroomsDisponible = async (req , res) => {
  try{
     const classrooms = await Classroom.findAll({
      where : {
        is_available : true
      }
     })

     return res.json(classrooms)
  }catch(err){
    return res.status(400).json({"errors" : 'Error ' + err})
  }
}


const classroomsNonDisponible = async (req , res) => {
  try{
     const classrooms = await Classroom.findAll({
      where : {
        is_available : false
      }
     })

     return res.json(classrooms)
  }catch(err){
    return res.status(400).json({"errors" : 'Error ' + err})
  }
}

const updateAvailableClassroom = async (req , res) => {
   const { classroomId } = req.params 
   const {is_available } = req.body

   if(!classroomId){
      return res.status(422).json({"errors" : 'Error classroomId is required !!'})
   }
   try{
      await Classroom.update({
        is_available : is_available 
      } , {
        where : {
          id : classroomId
        }
      })

      return res.json({"message" : 'seccès update available classroom'})

   }catch(err){
      return res.json({'errors' : 'Error '+err})
   }
}

const updateClassroom = async (req, res) => {
  const { id } = req.params;
  const { label, is_available } = req.body;
  if (!id) {
    return res.status(422).json({ errors: "L'id de la salle est requis !" });
  }
  try {
    const [updated] = await Classroom.update(
      { label, is_available },
      { where: { id } }
    );
    if (updated === 0) {
      return res.status(404).json({ errors: "Salle non trouvée." });
    }
    return res.json({ message: "Salle mise à jour avec succès." });
  } catch (err) {
    return res.status(400).json({ errors: "Erreur : " + err });
  }
};

const deleteClassroom = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(422).json({ errors: "L'id de la salle est requis !" });
  }
  try {
    const classroom = await Classroom.findByPk(id);
    if (!classroom) {
      return res.status(404).json({ errors: "Salle non trouvée." });
    }
    await classroom.destroy();
    return res.json({ message: "Salle supprimée avec succès." });
  } catch (err) {
    return res.status(400).json({ errors: "Erreur : " + err });
  }
};

// Update a formateur in a classroom, with swap logic if needed
const updateFormateurInClassroom = async (req, res) => {
  const { classroomId, oldFormateurId, newFormateurId } = req.body;
  if (!classroomId || !oldFormateurId || !newFormateurId) {
    return res.status(422).json({ errors: "classroomId, oldFormateurId, and newFormateurId are required!" });
  }
  try {
    // Find the new formateur
    const newFormateur = await Formateur.findByPk(newFormateurId);
    if (!newFormateur) {
      return res.status(404).json({ errors: "New formateur not found." });
    }
    // Check if the new formateur is already assigned to a classroom
    const newFormateurClassroomId = newFormateur.classroomId;
    if (newFormateurClassroomId && newFormateurClassroomId !== classroomId) {
      // Swap: update the old formateur to the new formateur's classroom, and new formateur to the target classroom
      await Formateur.update({ classroomId: newFormateurClassroomId }, { where: { id: oldFormateurId } });
      await Formateur.update({ classroomId: classroomId }, { where: { id: newFormateurId } });
      return res.json({ message: `Swapped formateurs between classrooms.`, swap: true });
    } else {
      // Simple update: assign new formateur to the classroom
      await Formateur.update({ classroomId: classroomId }, { where: { id: newFormateurId } });
      return res.json({ message: `Updated formateur for classroom.`, swap: false });
    }
  } catch (err) {
    return res.status(400).json({ errors: "Erreur : " + err });
  }
};

module.exports = { index , addClassroom , classroomsNonDisponible , updateAvailableClassroom , classroomsDisponible, updateClassroom, deleteClassroom, updateFormateurInClassroom };
