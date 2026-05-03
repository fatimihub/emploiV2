const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const timeShots = ['08:30-11:00', "11:00-13:30", "13:30-16:00", "16:00-18:30"];


const getRandomDay = () => {
    const randomIndex = Math.floor(Math.random() * DAYS.length);
    return DAYS[randomIndex];
  };

const getRandomDayWithoutSamedi = () => {
    const daysWithoutSamedi = DAYS.slice(0, 5); 
    return daysWithoutSamedi[Math.floor(Math.random() * daysWithoutSamedi.length)];
};

const getRandomTimeShot = () => {
    return timeShots[Math.floor(Math.random() * timeShots.length)];
};

const getRandomTimeShotInSamedi = () => {
    const samediTimeSlots = ["08:30-11:00", "11:00-13:30"];
    const randomIndex = Math.floor(Math.random() * samediTimeSlots.length);
    return samediTimeSlots[randomIndex];
};


const getNextTimeShot = (randomTimeShot) => {
    const index_random_timeshot = timeShots.findIndex(timeShot => timeShot === randomTimeShot);

    // if (index_random_timeshot === 3) {
    //   return timeShots[index_random_timeshot - 1]; 
    // } 

    
    // return timeShots[index_random_timeshot + 1] || null;  

    if(index_random_timeshot == 0){
      return timeShots[1]
    }else if(index_random_timeshot == 1){
      return timeShots[0]
    }else if(index_random_timeshot == 2){
      return timeShots[3]
    }else if(index_random_timeshot == 3){
      return timeShots[2]
    }

    return null
  };

module.exports = {
    getRandomDay,
    getRandomDayWithoutSamedi,
    getRandomTimeShot,
    getRandomTimeShotInSamedi,
    getNextTimeShot
};
