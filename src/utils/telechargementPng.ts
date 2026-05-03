import html2canvas from "html2canvas";

interface TimetableGroup {
  groupe: string;
  valid_form: string;
}

interface TimetableFormateur {
  formateur: string;
  valid_form: string;
}

interface TimetableSalle {
  salle: string;
  valid_form: string;
}

export const handleDownloadPng = (
  timetableGroup: TimetableGroup,
  timetableRef: React.RefObject<HTMLDivElement> | null
) => {
  if (timetableRef == null || !timetableRef.current) {
    alert("timetableRef should be not null!!");
    return;
  }

  html2canvas(timetableRef.current, { backgroundColor: "#fff" }).then((canvas) => {
    const imgUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imgUrl;
    link.download =
      timetableGroup?.groupe +
      "-emploi-du-temps-actif-en-" +
      timetableGroup?.valid_form +
      "-Ista Cité de l'air-" +
      Math.random().toString(36).substr(2, 9) +
      ".png";
    link.click();
  });
};

export const handleDownloadTimetableFormateurPng = (
  timetableFormateur: TimetableFormateur,
  timetableRef: React.RefObject<HTMLDivElement> | null
) => {
  if (timetableRef == null || !timetableRef.current) {
    alert("timetableRef should be not null!!");
    return;
  }

  html2canvas(timetableRef.current, { backgroundColor: "#fff" }).then((canvas) => {
    const imgUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imgUrl;
    link.download =
      timetableFormateur?.formateur +
      "-emploi-du-temps-actif-en-" +
      timetableFormateur?.valid_form +
      "-Ista Cité de l'air-" +
      Math.random().toString(36).substr(2, 9) +
      ".png";
    link.click();
  });
};

export const handleDownloadTimetableSallePng = (
  timetableSalle: TimetableSalle,
  timetableRef: React.RefObject<HTMLDivElement> | null
) => {
  if (timetableRef == null || !timetableRef.current) {
    alert("timetableRef should be not null!!");
    return;
  }

  html2canvas(timetableRef.current, { backgroundColor: "#fff" }).then((canvas) => {
    const imgUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imgUrl;
    link.download =
      timetableSalle?.salle +
      "-emploi-du-temps-actif-en-" +
      timetableSalle?.valid_form +
      "-Ista Cité de l'air-" +
      Math.random().toString(36).substr(2, 9) +
      ".png";
    link.click();
  });
};
