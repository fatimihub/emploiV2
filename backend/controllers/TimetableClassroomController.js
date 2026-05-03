const {Classroom , Module , Group , Formateur , Session , Timetable } = require('./../models')
const { transform } = require('./../helpers/transformers/timetableActiveClassroomTransformer.js')
const index =async (req , res) => {
    try{
       const classrooms = await Classroom.findAll({})

       return res.json(classrooms)
    }catch(err){
        return res.status(400).json({"errors" : err})
    }
}

const show = async (req , res ) => {
  const { id } = req.params
 
  if(!id){
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
              {model : Classroom , as : 'classroom' ,    required: true,  where : { id : Number(id) }} , 
              {model : Group , as : "group" } , 
              {model : Formateur , as : 'formateur'} , 
              {model : Module , as : "module"}
            ] , 
          
           }
        ]
    })

    return res.json( transform(timetablesGroups))

    }catch(err){
        return res.status(400).json({"errors" : err})
    }
}

module.exports = { index , show }