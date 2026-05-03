
module.exports = {
    transform : (group) => {
         return{
             id : group.id , 
             code_group : group.code_group , 
             year_of_formation : group.year_of_formation , 
             branch : group.branch?.code_branch || '' ,
             label_branch : group.branch?.label || ''
         }
    }
}