

interface item {
   code_group : string , 
   timetable : object[]
}

const data : item = {
  code_group: "DEVOFS203",
  timetable: [
    {
      Lundi: [
        {
          code_module: "M206",
          label: "français",
          session_duration: 2.5,
          formateur: "prof fr",
          salle: "INFO3",
          type: "presential",
          timeshot: "13:30-16:00",
          color : 'gray'
        },
      ],
    },
    {
      Mardi: [
        {
          code_module: "M202",
          label: "Approch agile",
          session_duration: 2.5,
          formateur: "Ahmed Naim",
          salle: "INFO1",
          type: "presential",
          timeshot: "13:30-16:00",
          color : 'red'
        },
        {
          code_module: "M202",
          label: "Approch agile",
          session_duration: 2.5,
          formateur: "Ahmed Naim",
          salle: "INFO1",
          type: "presential",
          timeshot: "16:00-18:30",
          color : 'red'
        },
       
      ],
    },
    {
      Mercredi: [
        {
          code_module: "M204",
          label: "base de donnée",
          session_duration: 2.5,
          formateur: "ELKANDOUSSI",
          salle: "Teams",
          type: "à distance",
          timeshot: "08:30-11:00",
          color : 'green'
        },
        {
          code_module: "M202",
          label: "Approch agile",
          session_duration: 2.5,
          formateur: "Ahmed Naim",
          salle: "INFO1",
          type: "presential",
          timeshot: "13:30-16:00",
          color : 'red'
        },
        {
          code_module: "M202",
          label: "Approch agile",
          session_duration: 2.5,
          formateur: "Ahmed Naim",
          salle: "INFO1",
          type: "presential",
          timeshot: "16:00-18:30",
          color : 'red'
        },

      ],
    },
    {
      Jeudi: [],
    },
    {
      Vendredi: [
        {
          code_module: "M202",
          label: "Approch agile",
          session_duration: 2.5,
          formateur: "Ahmed Naim",
          salle: "Teams",
          type: "à distance",
          timeshot: "08:30-11:00",
          color : 'red'
        },
        {
          code_module: "M202",
          label: "Approch agile",
          session_duration: 2.5,
          formateur: "Ahmed Naim",
          salle: "Teams",
          type: "à distance",
          timeshot: "11:00-13:30",
          color : 'red'
        },
        {
          code_module: "M207",
          label: "anglais",
          session_duration: 2.5,
          formateur: "prof en",
          salle: "INFO4",
          type: "presential",
          timeshot: "16:00-18:30",
           color : 'blue'
        },
      ],
    },
    {
      Samedi: [
        {
          code_module: "M204",
          label: "base de donnée",
          session_duration: 2.5,
          formateur: "ELKANDOUSSI",
          salle: "INFO2",
          type: "presential",
          timeshot: "08:30-11:00",
          color : 'green'
        },
        {
          code_module: "M204",
          label: "base de donnée",
          session_duration: 2.5,
          formateur: "ELKANDOUSSI",
          salle: "INFO2",
          type: "presential",
          timeshot: "11:00-13:30",
          color : 'green'
        },
      ],
    },
  ],
};

export default data;
