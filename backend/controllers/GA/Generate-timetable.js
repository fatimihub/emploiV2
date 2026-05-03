const generateTimetableRemoteForEveryMerge = require("./Generate-remote-timetable.js");
const OptimizedTimetableGenerator = require("../../services/optimizedTimetableGenerator.js");
const EnhancedTimetableGenerator = require("../../services/enhancedTimetableGenerator.js");
const {
  Group,
  Merge,
  GroupModuleFormateur,
  Branch,
  Module,
  Formateur,
  Classroom,
  FormateurTimetable ,
  Session  , 
  Timetable , 
  GroupsNeedChangeTimetable
} = require("../../models/index.js");

const {
  getRandomDay,
  getRandomTimeShot,
  getRandomTimeShotInSamedi,
  getNextTimeShot,
} = require("./randoms.js");

const {
  canAddSessionToDay,
  canAddSessionToDaySamedi,
  checkIfTimeshotTakenInDayEdit,
  checkIfHaveSessionRemoteInDay,
  checkIfSessionWithFormateurTakenByGroup,
  checkFormateurAvailabilityForGroup ,
  getValidTimeShotsForFormateurDay , 
  isTimeshotTaken,
  canAddSessionWithGapRule,
  findAlternativeTimeSlot
} = require("./constraints.js");

const { sortSessionInDay } = require("./helper.js");
const { transformGroupwithModules } = require("../../helpers/transformers/groupWithSessionPresential.js");
const db = require('../../models');
const GlobalGenerationReport = db.GlobalGenerationReport;
const { generateFrenchReport } = require('../../services/enhancedTimetableGenerator');
const PDFDocument = require('pdfkit');
const { generateGlobalFrenchAdminReport } = require('../../services/enhancedTimetableGenerator');


const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const TIME_SHOTS = ["08:30-11:00", "11:00-13:30", "13:30-16:00", "16:00-18:30"];


const createEmptyTimetable = () => DAYS.map(day => ({ [day]: [] }));



const pushSessionToDay = (daySessions, session) => {
    session.timeShot = checkIfTimeshotTakenInDayEdit(daySessions, session.timeShot);
    daySessions.push(session);
};
  
const MORNING = ["08:30-11:00", "11:00-13:30"];
const AFTERNOON = ["13:30-16:00", "16:00-18:30"];

const toMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};



const placeSessionWithValidation = async (timetable, groupsTimetables, moduleSession, groupId) => {
    let placed = false;
    // Deterministic: try all days and all valid slots for the formateur
    for (let dayIdx = 0; dayIdx < DAYS.length; dayIdx++) {
      const dayName = DAYS[dayIdx];
      const dayKey = dayName;
      if (!timetable[dayIdx] || !timetable[dayIdx][dayKey]) continue;
      // Get valid time slots for the formateur on this day
      const validTimeShots = await getValidTimeShotsForFormateurDay(moduleSession.formateurId, dayName);
      // Filter out already taken slots in this day (for this group)
      const takenSlots = timetable[dayIdx][dayKey].map(s => s.timeShot);
      const availableTimeShots = validTimeShots.filter(slot => !takenSlots.includes(slot));
      for (const timeShot of availableTimeShots) {
      const session = {
        ...moduleSession,
          timeShot: timeShot
      };
        const validatedSession = checkIfHaveSessionRemoteInDay(timetable[dayIdx][dayKey], session);
        if (
          canAddSessionToDay(timetable, dayIdx, moduleSession) &&
          checkIfSessionWithFormateurTakenByGroup(groupsTimetables, session, dayName)  &&
          (dayIdx !== 5 || canAddSessionToDaySamedi(timetable, dayIdx, validatedSession)) &&
          canAddSessionWithGapRule(timetable[dayIdx][dayKey], validatedSession)
      ) {
          // For double sessions, try to find two consecutive valid slots
        if (moduleSession.nbr_hours_presential_in_week === 5) {
          const nextTime = getNextTimeShot(timeShot);
            if (!nextTime || !availableTimeShots.includes(nextTime)) {
              continue;
            }
          const sessionTwo = {
            ...moduleSession,
              timeShot: nextTime,
          };
            const validatedSessionTwo = checkIfHaveSessionRemoteInDay(timetable[dayIdx][dayKey], sessionTwo);
            if (
              checkIfSessionWithFormateurTakenByGroup(groupsTimetables, validatedSessionTwo, dayName) &&
              canAddSessionWithGapRule(timetable[dayIdx][dayKey], validatedSessionTwo)
            ) {
              pushSessionToDay(timetable[dayIdx][dayKey], validatedSessionTwo);
            } else {
              continue;
            }
          }
          pushSessionToDay(timetable[dayIdx][dayKey], validatedSession);
        placed = true;
          break;
      }
      }
      if (placed) break;
    }
    if (!placed) {
      // Mark module as unschedulable for this group
      if (groupId && moduleSession.moduleId && moduleSession.formateurId) {
        await GroupModuleFormateur.update(
          { is_started: false },
          {
            where: {
              groupId: groupId,
              moduleId: moduleSession.moduleId,
              formateurId: moduleSession.formateurId
            }
          }
        );
        if (process.env.NODE_ENV !== 'production') console.warn(`Module ${moduleSession.label} for group ${groupId} cannot be scheduled: no available slot for required session.`);
    }
      return false; // Indicate failure to place session
    }
    return true; // Indicate success
  };




const getTimetableFromMerge = (mergeId, allRemoteTimetables) => {
  const found = allRemoteTimetables.find(m => m.mergeId === mergeId);
  return found ? JSON.parse(JSON.stringify(found.timetable)) : createEmptyTimetable();
};


const buildMergedGroupRemoteTimetable = async (merges, remoteTimetables) => {
  const merged = createEmptyTimetable();
  let conflictDetected = false;

  for (const merge of merges) {
    const timetable = await getTimetableFromMerge(merge.id, remoteTimetables);

    timetable.forEach(day => {
      const dayKey = Object.keys(day)[0];
      const sessions = day[dayKey];

      const groupDay = merged.find(d => Object.keys(d)[0] === dayKey);
      if (groupDay) {
        for (const session of sessions) {
          const exists = groupDay[dayKey].some(s => s.timeShot === session.timeShot);
          if (!exists) {
            groupDay[dayKey].push(session);
          } else {
            conflictDetected = true;
            if (process.env.NODE_ENV !== 'production') console.warn(`Conflict detected in merge ${merge.id} on ${dayKey} at ${session.timeShot}. Will reassign.`);

           
            if (!merge.conflicts) merge.conflicts = [];
            merge.conflicts.push({ ...session, day: dayKey });
          }
        }
      }
    });
  }


  return { merged, conflictDetected };
};



const getPresentialSessions = async (group) => {
  const groupData = await Group.findOne({
    where: { id: group.id },
    include: [{
      model: GroupModuleFormateur,
      include: [
        { model: Module, as: "module" },
        {
          model: Formateur,
          as: "formateur",
          include: [{ model: Classroom, as: "classroom" }],
        },
      ],
    }],
  });

  return transformGroupwithModules(groupData);
};



const storeTimetableToDB = async (groupCode, timetableData , valide_a_partir_de) => {
  try {
    
    const group = await Group.findOne({ where: { code_group: groupCode } });
    if (!group) throw new Error(`Group ${groupCode} not found`);

    // update status all timetables group to archived
    const timetablesGroup = await Timetable.findAll({ where : {  groupId: group.id }})
    if(timetablesGroup.length > 0){
         await Timetable.update({ status: 'archived'} , {
           where : {  groupId: group.id } , 
         })
    }

    const timetable = await Timetable.create({
      groupId: group.id,
      valid_form: valide_a_partir_de ,
      status: 'active'
    } ,
   
    );
     
    let nbr_hours_in_week = 0 ;

    for (const dayObj of timetableData) {
      const dayName = Object.keys(dayObj)[0];
      const sessions = dayObj[dayName];

      for (const session of sessions) {
        await Session.create({
          timetableId: timetable.id,
          groupId: group.id,
          moduleId: session.moduleId,
          formateurId: session.formateurId,
          classroomId: session.classroomId,
          timeshot: session.timeShot,
          type: session.type,
          day: dayName
        } ,

        );


        // Add 2.5 hours per session slot (not the chunk size)
        // Each time slot represents 2.5 hours regardless of whether it's part of a 5-hour session
        nbr_hours_in_week += 2.5 

      }
    }
    
    await Timetable.update({ nbr_hours_in_week : nbr_hours_in_week } , {
      where : {
        groupId: group.id,
        status: 'active'
       } , 
    })

    if (process.env.NODE_ENV !== 'production') console.log(`Timetable stored for group ${groupCode}`);
    
  } catch (err) {
    console.error(`Error saving timetable:`, err);
   
  }
};




const first_generate = async (valide_a_partir_de) => {
  try {
    let remoteTimetables = await generateTimetableRemoteForEveryMerge();

    const branches = await Branch.findAll({
      include: [{ model: Group, include: [Merge] }],
    });
    
    const groupsTimetables = [];
    for (const branch of branches) {
      await Promise.all(branch.Groups.map(async (group) => {
        let mergeResult = await buildMergedGroupRemoteTimetable(group.Merges, remoteTimetables);

        if (mergeResult.conflictDetected) {
          
          for (const merge of group.Merges) {
            const originalTimetable = remoteTimetables.find(m => m.mergeId === merge.id);
            if (merge.conflicts && originalTimetable) {
              for (const conflict of merge.conflicts) {
          

                const indexDay = originalTimetable.timetable.findIndex(day => Object.keys(day)[0] === conflict.day);
                if (indexDay >= 0) {
                  originalTimetable.timetable[indexDay][conflict.day] = originalTimetable.timetable[indexDay][conflict.day].filter(
                    s => !(s.timeShot === conflict.timeShot && s.moduleId === conflict.moduleId)
                  );
                }

                let reassigned = false;
                for (let i = 0; i < DAYS.length; i++) {
                  const day = DAYS[i];
                  const sessionsOfDay = originalTimetable.timetable[i][day];
                  const timeShot = i === 5 ? getRandomTimeShotInSamedi() : getRandomTimeShot();

                  const exists = sessionsOfDay.some(s => s.timeShot === timeShot);
                  if (!exists) {
                    sessionsOfDay.push({ ...conflict, timeShot, day });
                    reassigned = true;
                    break;
                  }
                }

                if (!reassigned) {
                  if (process.env.NODE_ENV !== 'production') console.warn(`Could not reassign session:`, conflict);
                }
              }
            }
          }

          return await first_generate(valide_a_partir_de);
        }

        const presentialSessions = await getPresentialSessions(group);
        const timetable = mergeResult.merged;
  

        for (const moduleSession of presentialSessions) {
          // Calculate formateur's available hours for the week
          const validSlots = [];
          for (const day of DAYS) {
            const slots = await getValidTimeShotsForFormateurDay(moduleSession.formateurId, day);
            validSlots.push(...slots);
          }
          const availableHours = validSlots.length * 2.5; // each slot = 2.5h
          const requiredHours = Number(moduleSession.nbr_hours_presential_in_week);

          if (availableHours < requiredHours) {
            // Not enough hours: deactivate this module for this group
            await GroupModuleFormateur.update(
              { is_started: false },
              {
                where: {
                  groupId: group.id,
                  moduleId: moduleSession.moduleId,
                  formateurId: moduleSession.formateurId
                }
              }
            );
            if (process.env.NODE_ENV !== 'production') console.warn(`Module ${moduleSession.module_label} for group ${group.code_group} cannot be scheduled: formateur only available for ${availableHours}h, but ${requiredHours}h required.`);
            continue;
          }

          // Schedule as many sessions as needed (each chunk = 2.5h or 5h)
          let hoursToSchedule = requiredHours;
          let failed = false;
          while (hoursToSchedule > 0) {
            const chunk = hoursToSchedule >= 5 ? 5 : 2.5;
            const sessionChunk = { ...moduleSession, nbr_hours_presential_in_week: chunk };
            const success = await placeSessionWithValidation(timetable, groupsTimetables, sessionChunk, group.id);
            if (!success) {
              failed = true;
              break;
            }
            hoursToSchedule -= chunk;
          }
          if (failed) {
            // If any session could not be scheduled, mark as unschedulable
            await GroupModuleFormateur.update(
              { is_started: false },
              {
                where: {
                  groupId: group.id,
                  moduleId: moduleSession.moduleId,
                  formateurId: moduleSession.formateurId
                }
              }
            );
            if (process.env.NODE_ENV !== 'production') console.warn(`Module ${moduleSession.module_label} for group ${group.code_group} could not schedule all required sessions.`);
            continue;
          }
        }

        await storeTimetableToDB(group.code_group, timetable, valide_a_partir_de);

        groupsTimetables.push({
          code_group: group.code_group,
          timetable,
        });
      }))
    }

    return true;
  } catch (error) {
    console.error("Error first generating:", error);
  }
};



const generate =async (valide_a_partir_de) => {
    

    try {
      
      let remoteTimetables = await generateTimetableRemoteForEveryMerge();
      const groups = await GroupsNeedChangeTimetable.findAll({ 
        include : [
          { model : Group ,  include : [ { model : Merge }] }
        ]
      })
    
      const groupsTimetables = [];
      
        for (const group of groups) {

          let mergeResult = await buildMergedGroupRemoteTimetable(group.Group.Merges, remoteTimetables);
  
          if (mergeResult.conflictDetected) {
           
            for (const merge of group.Merges) {
              const originalTimetable = remoteTimetables.find(m => m.mergeId === merge.id);
              if (merge.conflicts && originalTimetable) {
                for (const conflict of merge.conflicts) {
                  
                  
                  const indexDay = originalTimetable.timetable.findIndex(day => Object.keys(day)[0] === conflict.day);
                  if (indexDay >= 0) {
                    originalTimetable.timetable[indexDay][conflict.day] = originalTimetable.timetable[indexDay][conflict.day].filter(
                      s => !(s.timeShot === conflict.timeShot && s.moduleId === conflict.moduleId)
                    );
                  }
  
                  
                  let reassigned = false;
                  for (let i = 0; i < DAYS.length; i++) {
                    const day = DAYS[i];
                    const sessionsOfDay = originalTimetable.timetable[i][day];
                    const timeShot = i === 5 ? getRandomTimeShotInSamedi() : getRandomTimeShot();
  
                    const exists = sessionsOfDay.some(s => s.timeShot === timeShot);
                    if (!exists) {
                      sessionsOfDay.push({ ...conflict, timeShot, day });
                      reassigned = true;
                      break;
                    }
                  }
  
                  if (!reassigned) {
                    if (process.env.NODE_ENV !== 'production') console.warn(`Could not reassign session:`, conflict);
                  }
                }
              }
            }
  
           
            return await generate(valide_a_partir_de);
          }
  
          const presentialSessions = await getPresentialSessions(group.Group);
          const timetable = mergeResult.merged;
    
  
          for (const moduleSession of presentialSessions) {
            await placeSessionWithValidation(timetable, groupsTimetables, moduleSession, group.Group.id);
          }
  
          await storeTimetableToDB(group.Group.code_group, timetable, valide_a_partir_de);
  
          groupsTimetables.push({
            code_group: group.code_group,
            timetable,
          });
        }
      
  
      return true;
    } catch (error) {
      console.error("Error first generating:", error);
    }
}


const generate_timetables = async (req, res) => {
  const { valide_a_partir_de, maxAttempts = 50 } = req.body;

  if (!valide_a_partir_de) {
    return res.status(400).json({ errors: 'valide_a_partir_de is required.' });
  }

  const timetablesFormateur = await FormateurTimetable.findOne();
  if (!timetablesFormateur) {
    return res.status(422).json({ "errors": 'before generate timetable group , must generate timetables formateurs !!' });
  }

  const parsedDate = new Date(valide_a_partir_de);
  const now = new Date();

  if (isNaN(parsedDate.getTime()) || parsedDate < now) {
    return res.status(400).json({ errors: 'valide_a_partir_de must be a valid future date.' });
  }

  try {
    if (process.env.NODE_ENV !== 'production') console.log(`Starting OPTIMIZED timetable generation`);
    
    // Create optimized generator instance
    const optimizedGenerator = new OptimizedTimetableGenerator();
    
    // Generate timetables with optimized algorithm
    const results = await optimizedGenerator.generateAllTimetables(valide_a_partir_de, {
      enableValidation: true,
      enableParallelProcessing: true
    });

    // Create user-friendly message
    let message = 'Optimized timetable generation completed successfully';
    
    if (results.success) {
      return res.json({
        message: message,
        success: true,
        stats: results.stats,
        groups: results.groups
      });
    } else {
      return res.status(422).json({
        message: 'Timetable generation completed with errors',
        success: false,
        stats: results.stats,
        groups: results.groups,
        errors: results.errors
      });
    }

  } catch (err) {
    console.error('Error in enhanced timetable generation:', err);
    return res.status(500).json({
      message: 'Timetable generation failed',
      success: false,
      error: err.message
    });
  }
};



// Endpoint: GET /api/v1/timetable/report/:groupCode
// Returns a French report for the group (mocked for demo)
async function getFrenchReport(req, res) {
  const { groupCode } = req.params;
  // TODO: Replace with real logic to fetch unscheduledModules for the group
  // Demo: mock some unscheduled modules
  const unscheduledModules = [
    { moduleLabel: 'Math', reason: "le groupe a atteint le nombre d'heures maximal par semaine" },
    { moduleLabel: 'Physique', reason: "le formateur n'est pas disponible" }
  ];
  const report = generateFrenchReport(groupCode, unscheduledModules);
  res.json({ groupCode, report });
}


// Endpoint: POST /api/v1/timetable/report/pdf
// Expects { groupResults } in body, returns PDF
async function exportGlobalReportPdf(req, res) {
  const groupResults = req.body.groupResults;
  const report = generateGlobalFrenchAdminReport(groupResults);

  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="rapport_global.pdf"');
  doc.pipe(res);

  doc.fontSize(14).text(report, { align: 'left' });
  doc.end();
}


// Delete a global generation report by ID
async function deleteGlobalGenerationReport(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Report ID is required' });
    const report = await GlobalGenerationReport.findByPk(id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    await report.destroy();
    return res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}


//  const groups_in_traning = await Traning.findAll({ attributes : ['id'] })
//    const  ids_groups_in_traning = groups_in_traning.map(group => group.id)
//   let groups = await GroupsNeedChangeTimetable.findAll({ 
//         include : [
//           { model : Group , where : { id : { [Op.notIn] : ids_groups_in_traning }  }  ,  include : [ { model : Merge }] }
//         ]
//       })

//  return  res.json(groups)



module.exports = {
  generate_timetables,
  getFrenchReport,
  exportGlobalReportPdf,
  deleteGlobalGenerationReport
};
