const {
  Branch,
  Group,
  GroupModuleFormateur,
  Module,
  Formateur,
  Classroom,
  GroupMerge,
  Merge,
} = require("../../models/index.js");
const {
  transform,
} = require("../../helpers/transformers/branchTransformer.js");

// const getDataBranches = async () => {
//     const branches = await Branch.findAll({
//         include : [
//             {
//                 model : Group  ,
//                 include : [
//                     {
//                         model : GroupModuleFormateur ,
//                         include : [
//                             {
//                               model : Module , as : 'module'
//                             },
//                             {
//                                 model : Formateur , as : 'formateur' ,
//                                 include : [
//                                       {
//                                         model : Classroom  , as : "classroom"
//                                       }
//                                 ]
//                             }
//                         ]
//                     }
//                 ]
//             }
//         ]
//     })

//     return branches.map(branch => transform(branch))
// }

// this just for test
const getDataNeed = async (req, res) => {
  //    const branches = await Branch.findAll({
  //     include : [
  //         {
  //             model : Group  ,
  //             include : [
  //                 {
  //                     model : GroupModuleFormateur ,
  //                     include : [
  //                         {
  //                           model : Module , as : 'module'
  //                         },
  //                         {
  //                             model : Formateur , as : 'formateur' ,
  //                             include : [
  //                                   {
  //                                     model : Classroom  , as : "classroom"
  //                                   }
  //                             ]
  //                         }
  //                     ]
  //                 }
  //             ]
  //         }
  //     ]
  //    })
  //    return res.json(branches.map(branch => transform(branch)) )
  //    const groupMerge = await Merge.findAll({
  //        include : [
  //            { model : Group }
  //        ]
  //    })
  //    return res.json(groupMerge)

  
};

const getDataBranches = () => {
  return Branch.findAll({
    include: [
      {
        model: Group,
        include: [
          {
            model: GroupModuleFormateur,
            include: [
              {
                model: Module,
                as: "module",
              },
              {
                model: Formateur,
                as: "formateur",
                include: [
                  {
                    model: Classroom,
                    as: "classroom",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  })
    .then((branches) => {
      return branches.map((branch) => transform(branch));
    })
    .catch((err) => {
      console.log("Error", err);
    });
};
module.exports = { getDataBranches, getDataNeed };
