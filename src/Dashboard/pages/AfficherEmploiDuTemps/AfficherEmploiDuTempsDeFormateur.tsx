import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";
import PopupDeTelechargement from "../../../components/PopupDeTelechargement";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api/apiConfig";
import { handleDownloadTimetableFormateurPng } from "../../../utils/telechargementPng";
import TimetableFormateur from "../../../components/TimetableFormateur";
import ButtonPrint from "../../../components/ButtonPrint";
import PopupSuccess from "../../../components/PopupSuccess";

interface FormateurTimetable {
  formateur: string;
  timetable: any[];
  valid_form: string;
  nbr_hours_in_week: number;
}

export default function AfficherEmploiDuTempsDeFormateur() {
  const [afficherPopup, setAfficherPopup] = useState(false);
  const [afficherPopupSuccess, setAfficherPopupSuccess] = useState(false);
  const [valuePopup, setValuePopup] = useState("png");
  const [handleLogicTelechargement, setHandleLogicTelechargement] = useState(
    () => () => {}
  );
  const { mleFormateur } = useParams();
  const [formateurTimetable, setFormateurTimetable] = useState<FormateurTimetable>({} as FormateurTimetable);

  const timetableRef = useRef<HTMLDivElement>(null);
  const handleTelechargementEmploiDuTempsDeFormateur = async () => {
    setAfficherPopup(true);
    setHandleLogicTelechargement(() => async () => {
      if (valuePopup === "png") {
        try {
          await handleDownloadTimetableFormateurPng(formateurTimetable, timetableRef);
          setAfficherPopupSuccess(true);
        } catch (error) {
          console.error("Error downloading timetable:", error);
        }
      }
    });
  };

  const fetchData = async () => {
    try {
      const res = await api.get(
        `/timetables/active/formateurs/${mleFormateur}`
      );

      if (res && res.data) {
        setFormateurTimetable(res.data);
      }
    } catch (err) {
      console.log("Error" + err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mleFormateur]);

  return (
    <div className="lg:w-[93%] mx-auto h-full lg:px-10 lg:py-5 p-5 relative">
      <div className="flex justify-between">
        <ButtonNavigateBack />

        <div className="flex">
          <ButtonPrint timetableRef={timetableRef} />
          <button
            id="btn-download-emplois-formateur"
            className="bg-green-500 block px-5 ml-auto hover:cursor-pointer py-2 text-xl text-white rounded shadow"
            onClick={handleTelechargementEmploiDuTempsDeFormateur}
          >
            <FontAwesomeIcon className="mr-2" icon={faDownload} />
            Télécharger
          </button>
        </div>
      </div>

      <TimetableFormateur
        formateurTimetable={formateurTimetable}
        timetableRef={timetableRef}
      />

      <PopupDeTelechargement
        afficherPopup={afficherPopup}
        setAfficherPopup={setAfficherPopup}
        valuePopup={valuePopup}
        setValuePopup={setValuePopup}
        handleLogicTelechargement={handleLogicTelechargement}
      />

      <PopupSuccess
        afficherPopupSuccess={afficherPopupSuccess}
        setAfficherPopupSuccess={setAfficherPopupSuccess}
        messageSuccess="L'emploi du temps a été téléchargé avec succès !"
      />
    </div>
  );
}
