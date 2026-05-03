module.exports = {
  transform: (classroom) => {
    // return classroom
    return {
      id: classroom.id,
      label: classroom.label,
      disponible: classroom.is_available ? "oui" : "no",
      formateur1: classroom.formateurs[0]?.name,
      formateur2: classroom.formateurs[1]?.name,
    };
  },
};
