const { FormateurTimetable, Classroom, Formateur } = require("./../../models");
const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const timeShots = ["08:30-13:30", "13:30-18:30"];
const saturdayTimeShots = ["08:30-11:00", "11:00-13:30"];


// generate the timetables formateurs 
const generateFormateurTimetable = async (req, res) => {
  try {
    const classrooms = await Classroom.findAll({
      include: [{ model: Formateur, as: "formateurs" }],
    });

    if (classrooms.length == 0) {
      return res.status(422).json({
        errors:
          "import les salles avant générer les emplois du temps des formateurs",
      });
    }

    // return res.json(classrooms)
    for (let classroom of classrooms) {
      if (classroom.formateurs.length == 2) {
        const p1 = classroom.formateurs[0];
        const p2 = classroom.formateurs[1];
        await insertTwoFormateurToFormateurTimetable(p1, p2);
      } else if (classroom.formateurs.length == 1) {
        await  insertFormateurToFormateurTimetable(classroom.formateurs[0]);
      }
    }
  } catch (err) {
    return res
      .status(422)
      .json({ errors: "errer en générer les emplois du temps des formateurs" });
  }

  const formateursTimetables = await FormateurTimetable.findAll({});

  if(formateursTimetables.length == 0){
    return res
    .status(422)
    .json({ errors: "errer en générer les emplois du temps des formateurs" });
  }

  return res.json({
    message: "succès générer les emplois du temps des formateurs",
    formateursTimetables: formateursTimetables,
  });
};


// this for if classroom have two formateur
const insertTwoFormateurToFormateurTimetable = async (p1, p2) => {
  let indexTimeShotP1 = 0;
  let indexTimeShotP2 = 1;
  const year = new Date().getFullYear();

  for (let day of days) {
   

    if (day != "Samedi") {
      
      await FormateurTimetable.findOrCreate({
        where : {
          formateurId: p1.id,
          day: day,
          year: year,
        } ,
        defaults : {
          formateurId: p1.id,
          timeshot: timeShots[indexTimeShotP1],
          day: day,
          year: year,
        }
      
      });


      await FormateurTimetable.findOrCreate({
        where : {
          formateurId: p2.id,
          day: day,
          year: year,
        } ,
        defaults : {
          formateurId: p2.id,
          timeshot: timeShots[indexTimeShotP2],
          day: day,
          year: year,
        }
      
      });
    } else {
      // Saturday: First formateur gets "08:30-11:00", Second formateur gets "11:00-13:30"
      await FormateurTimetable.findOrCreate({
        where : {
          formateurId: p1.id,
          day: day,
          year: year,
        } ,
        defaults : {
          formateurId: p1.id,
          timeshot: saturdayTimeShots[0], // "08:30-11:00"
          day: day,
          year: year,
        }
       
      });

      await FormateurTimetable.findOrCreate({
        where : {
          formateurId: p2.id,
          day: day,
          year: year,
        } ,
        defaults : {
          formateurId: p2.id,
          timeshot: saturdayTimeShots[1], // "11:00-13:30"
          day: day,
          year: year,
        }
      
      });
    }

    if (indexTimeShotP1 == 0) {
      indexTimeShotP1 = 1;
      indexTimeShotP2 = 0;
    } else {
      indexTimeShotP1 = 0;
      indexTimeShotP2 = 1;
    }
  }
};

// this for if classroom have just one formateur 
const insertFormateurToFormateurTimetable =async (p) => {
  let indexTimeShot = 0;
  const year = new Date().getFullYear();
  for (let day of days) {

    if (day != "Samedi") {
      await FormateurTimetable.findOrCreate({
        where : {
          formateurId: p.id,
          day: day,
          year: year,
        } ,
        defaults : {
          formateurId: p.id,
          timeshot: timeShots[indexTimeShot],
          day: day,
          year: year,
        }
      
      });
    } else {
      // Saturday: Single formateur gets "08:30-11:00"
      await FormateurTimetable.findOrCreate({
        where : {
          formateurId: p.id,
          day: day,
          year: year,
        } ,
        defaults : {
          formateurId: p.id,
          timeshot: saturdayTimeShots[0], // "08:30-11:00"
          day: day,
          year: year,
        }
       
      });
    }

    if (indexTimeShot == 0) {
      indexTimeShot = 1;
    } else {
      indexTimeShot = 0;
    }
  };
};

module.exports = { generateFormateurTimetable };
