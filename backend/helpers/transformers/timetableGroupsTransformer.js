
module.exports = {
  transform: (timetable) => {
    const valid_form = new Date(timetable.valid_form)
    return {
      id: timetable.id,
      valid_form: valid_form.toLocaleDateString(),
      status: timetable.status,
      nbr_hours_in_week: timetable.Sessions ? (timetable.Sessions.length * 2.5) : timetable.nbr_hours_in_week,
      groupe: timetable.group.code_group,
      code_branch: timetable.group?.branch?.code_branch || '',
      label_branch: timetable.group?.branch?.label || ''
    }
  }
}