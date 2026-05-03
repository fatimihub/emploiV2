const {Branch, Group} = require('./../models')

const index = async (req  , res ) => {
     try{
       const branches = await Branch.findAll({
         include: [{ model: Group, attributes: ['id'] }]
       });
       // Only keep branches with at least one group
       const filtered = branches.filter(branch => branch.Groups && branch.Groups.length > 0)
         .map(branch => {
           // Remove the Groups property from the response
           const b = branch.toJSON();
           delete b.Groups;
           return b;
         });
       return res.json(filtered)

     }catch(err){
        // Removed console.log statements for production
     }
}


module.exports = {index }