const {
    Merge,
    ModuleRemoteSession,
    Module,
    Formateur,
    Group,
    GroupModuleFormateur,
    Setting,
} = require("../../models/index.js");

const { transform } = require("../../helpers/transformers/mergeModuleRemoteSessionTransformer.js");
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
    canAddSessionWithGapRule,
} = require("./constraints.js");
const { sortSessionInDay } = require("./helper.js");

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const TIME_SHOTS = ["08:30-11:00", "11:00-13:30", "13:30-16:00", "16:00-18:30"];

let cachedTimetables = null;
let lastCacheTime = null;

// Helper to get all presential sessions for all groups in a merge
async function getPresentialSessionsForGroups(groupIds) {
    // For each group, get all presential sessions (from GroupModuleFormateur)
    const groupPresential = {};
    for (const groupId of groupIds) {
        const gmf = await GroupModuleFormateur.findAll({
            where: { groupId, is_started: true },
            include: [{ model: Module, as: 'module' }],
        });
        // For each presential module, add its hours to a pseudo-timetable
        groupPresential[groupId] = gmf.map(item => ({
            moduleId: item.moduleId,
            label: item.module ? item.module.label : '',
            type: 'présentiel',
            // We'll check for conflicts by time slot later
            // For now, just mark the module as presential
        }));
    }
    return groupPresential;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const generateTimetableRemoteForEveryMerge = async () => {
    // Fetch remote hours per group from settings
    let remoteHoursPerGroup = 10;
    const remoteSetting = await Setting.findOne({ where: { key: 'max_remote_hours' } });
    if (remoteSetting && !isNaN(Number(remoteSetting.value))) {
        remoteHoursPerGroup = Number(remoteSetting.value);
    }

    const latestUpdate = await ModuleRemoteSession.findOne({
        order: [['updatedAt', 'DESC']],
        attributes: ['updatedAt']
    });
    if (cachedTimetables && lastCacheTime && lastCacheTime >= (latestUpdate ? latestUpdate.updatedAt : new Date(0))) {
        return cachedTimetables;
    }

    const merges = await Merge.findAll({
        include: [
            {
                model: ModuleRemoteSession,
                include: [{ model: Module }, { model: Formateur }],
            },
            { model: Group },
        ],
    });

    const results = await Promise.all(merges.map(async (merge) => {
        const transformed = transform(merge);
        const groupIds = merge.Groups.map(g => g.id);
        // Load presential sessions for all groups
        const presentialByGroup = await getPresentialSessionsForGroups(groupIds);
        // For each remote module session, pick a valid (day, timeshot) for all groups
        const remoteAssignments = [];
        // --- REMOVE ENFORCEMENT OF REMOTE HOURS PER GROUP ---
        // Only schedule remote sessions if they exist for the group
        // (No placeholder sessions will be added)
        for (const moduleSession of transformed.modules_open) {
            // Deterministic: try all (day, slot) combinations in order
            let found = false;
            for (const day of DAYS) {
                for (const slot of TIME_SHOTS) {
                let valid = true;
                for (const groupId of groupIds) {
                        // Check if this formateur has any presential or remote session at this slot (in any group)
                        const presentialConflict = remoteAssignments.find(r => r.groupId === groupId && r.day === day && r.slot === slot);
                    if (presentialConflict) {
                        valid = false;
                        break;
                    }
                        // Check for gap rule: no session in the immediately preceding or following slot for this formateur (on the same day)
                        const slotIdx = TIME_SHOTS.indexOf(slot);
                        const prevSlot = slotIdx > 0 ? TIME_SHOTS[slotIdx - 1] : null;
                        const nextSlot = slotIdx < TIME_SHOTS.length - 1 ? TIME_SHOTS[slotIdx + 1] : null;
                        // Check previous slot
                        if (prevSlot) {
                            const prevConflict = remoteAssignments.find(r => r.groupId === groupId && r.day === day && r.slot === prevSlot && r.formateurId === moduleSession.formateurId);
                            if (prevConflict) {
                                valid = false;
                                break;
                            }
                        }
                        // Check next slot
                        if (nextSlot) {
                            const nextConflict = remoteAssignments.find(r => r.groupId === groupId && r.day === day && r.slot === nextSlot && r.formateurId === moduleSession.formateurId);
                            if (nextConflict) {
                        valid = false;
                        break;
                            }
                    }
                }
                if (valid) {
                    for (const groupId of groupIds) {
                        remoteAssignments.push({
                            groupId,
                            moduleId: moduleSession.moduleId,
                            formateurId: moduleSession.formateurId,
                            day,
                            slot,
                            ...moduleSession,
                        });
                    }
                    found = true;
                    break;
                }
            }
                if (found) break;
            }
            // If not found, skip (optionally log)
        }
        // Build timetable for each group
        const timetable = DAYS.map(day => ({ [day]: [] }));
        for (const assignment of remoteAssignments) {
            const dayIdx = DAYS.indexOf(assignment.day);
            if (dayIdx !== -1) {
                timetable[dayIdx][assignment.day].push({
                    ...assignment,
                    timeShot: assignment.slot,
                    type: 'à distance',
                });
            }
        }
        return {
            mergeId: transformed.id,
            timetable,
            remoteAssignments, // for debugging/inspection
        };
    }));

    cachedTimetables = results;
    return results;
};

module.exports = generateTimetableRemoteForEveryMerge;
  