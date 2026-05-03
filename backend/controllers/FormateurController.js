const { Formateur } = require('./../models')



const index = async (req , res) => {
    try{
       const formateurs = await Formateur.findAll({})

       return res.json(formateurs)
       
    }catch(err){
        console.log(err)
        return res.status(400).json({ "errors" : 'Error '+err})
    }
}
const formateursDisponible = async (req , res) => {
   try{
      const formateurs =  await Formateur.findAll({
        where : {
            is_available : true
        }
      })

      return res.json(formateurs)

   }catch(err){
     console.log(err)
     return res.status(400).json({'errors' : 'Error '+err})
   }
}

const formateursNonDisponible = async (req , res ) => {
    try{
        const formateursNonDisponible = await Formateur.findAll({
            where : {
                is_available : false
            }
        })

        return res.json(formateursNonDisponible)
    }catch(err){
        return res.status(400).json({"errors" : 'Error '+err})
    }
}

const updateAvailableFormateur = async (req , res ) => {
    const {formateurId} = req.params 
    const {is_available } = req.body
    
    if(!formateurId ){
        return res.status(422).json({ "errors" : 'formateurId paramter is required !!'})
    }

    try{
        await Formateur.update({
            is_available : is_available 
        } , {
            where : {
                id : formateurId
            }
        })

        return res.json({ "message" : "seccès update availablete formateur "})

    }catch(err){
        console.log(err)
        return res.status(400).json({"errors" : 'Error ' + err})
    }
}


const addFormateur = async (req, res) => {
    const { name, mle_formateur } = req.body;

    if (!name || !mle_formateur) {
        return res.status(422).json({ "errors": "Les champs 'name' et 'mle_formateur' sont obligatoires !" });
    }

    try {
        const { Classroom } = require('./../models');
        // Ensure default classroom exists
        await Classroom.findOrCreate({
            where: { label: 'UnKnown' },
            defaults: { label: 'UnKnown', is_available: true }
        });
        const unknownClassroom = await Classroom.findOne({ where: { label: 'UnKnown' } });

        const formateur = await Formateur.create({
            name,
            mle_formateur,
            is_available: true,
            classroomId: unknownClassroom.id
        });

        return res.json({ "message": "Formateur créé avec succès", "data": formateur });
    } catch (err) {
        return res.status(400).json({ "errors": 'Erreur : ' + err });
    }
}

module.exports = { index, formateursDisponible, formateursNonDisponible, updateAvailableFormateur, addFormateur }