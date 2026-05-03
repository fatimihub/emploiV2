const {Timetable , Formateur  , Session , Group , Classroom  , Module } = require('./../models')
const {transform } = require('./../helpers/transformers/timetableActiveFormateurTransformer.js')
const index = async (req , res ) => {
 

  try{
   
    const formateurs = await Formateur.findAll({})

    return res.json(formateurs)

  }catch(err){
    
  }
}


const show = async (req , res ) => {
  const { mleFormateur } = req.params
 
  if(!mleFormateur){
     return res.status(422).json({'errors' : 'mle formateur is required!!'})
  }

  try{
    const timetablesGroups = await Timetable.findAll({
        where : {
            status : 'active'
        } , 
        include : [
          { model : Session , 
            required: true,
            include : [
              { model : Formateur , as : 'formateur' ,    required: true, where : { mle_formateur : mleFormateur }} , 
              {model : Group , as : "group" } , 
              {model : Classroom , as : 'classroom'} , 
              {model : Module , as : "module"}
            ]
           }
        ]
    })

    if (timetablesGroups.length === 0) {
      // No sessions, fetch formateur info directly
      const formateur = await Formateur.findOne({ where: { mle_formateur } });
      if (!formateur) {
        return res.status(404).json({ errors: 'Formateur not found' });
      }
      // Return empty timetable but with formateur info
      return res.json({
        id: formateur.id,
        valid_form: null,
        status: 'active',
        nbr_hours_in_week: 0,
        formateur: formateur.name,
        mle_formateur: formateur.mle_formateur,
        timetable: [
          { 'Lundi': [] },
          { 'Mardi': [] },
          { 'Mercredi': [] },
          { 'Jeudi': [] },
          { 'Vendredi': [] },
          { 'Samedi': [] }
        ]
      });
    }

    return res.json(transform(timetablesGroups))

  }catch(err){
    console.error('Error in TimetableFormateurController.show:', err);
    return res.status(500).json({ errors: 'Internal server error: ' + err.message });
  }
}


module.exports = {index , show}