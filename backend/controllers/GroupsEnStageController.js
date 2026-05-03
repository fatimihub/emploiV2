const {Traning , Group } = require('./../models')

const index = async (req , res) => {
    try{
      const groupsEnStage = await Traning.findAll({
        include : [
            {model : Group , as : 'group' }
        ]
      }) 

      return res.json(groupsEnStage)

    }catch(err){
        return res.status(400).json({"errors" : 'Error ' + err})
    }
}

const store = async (req , res ) => {
    const { groupId , date_start , date_fin } = req.body 

    if(!groupId || !date_start || !date_fin){
       return res.status(422).json({"errors" : "Les champs 'groupId', 'date_start' et 'date_fin' sont obligatoires !"})
    }

    if( new Date(date_start) >= new Date(date_fin)  || new Date(date_start)  < new Date() || new Date(date_fin)  < new Date() ){
        return res.status(422).json({"errors" : "Problème avec la date de début ou de fin. Vérifiez que les dates sont valides !"})
    }
    try{
      await Traning.create({
          groupId : groupId , 
          date_start : date_start , 
          date_fin : date_fin
      })

      return res.json({"message" : "Groupe en stage ajouté avec succès"})
    }catch(err){
        return res.status(400).json({"errors" : 'Erreur : ' + err})
    }
}

const destroy = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await Traning.destroy({ where: { id } });
    if (deleted) {
      return res.json({ message: "Stage stopped successfully" });
    } else {
      return res.status(404).json({ errors: "Stage record not found" });
    }
  } catch (err) {
    return res.status(400).json({ errors: "Error: " + err });
  }
};

module.exports = { index , store, destroy }