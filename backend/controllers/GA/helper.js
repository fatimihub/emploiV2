

const sortSessionInDay = (daySessions) => {
    // console.log('day session in sort : ' , daySessions)
    // return
    return daySessions.sort( (a ,  b) => Number(a.timeShot.slice(0, 2)) - Number(b.timeShot.slice(0, 2)) )
}

module.exports = { sortSessionInDay }