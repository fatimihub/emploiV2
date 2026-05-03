import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays, faDashboard } from "@fortawesome/free-solid-svg-icons";
import { NavLink } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import ButtonTelechargementEmploisActif from "../components/ButtonTelechargementEmploisActif";
import { telechargeToutLesEmploisActifDesGroupesPngSurZip } from "../utils/telechargeToutLesEmploisActifDesGroupesPngSurZip";
import api from "../api/apiConfig";
import { telechargeToutLesEmploisActifDesFormateursPngSurZip } from "../utils/telechargeToutLesEmploisActifDesFormateursPngSurZip";
import { telechargeToutLesEmploisActifDesSallesPngSurZip } from "../utils/telechargeToutLesEmploisActifDesSallesPngSurZip";
import { ExportContext } from "../contextApi/ExportContext";
import PopupSuccess from "../components/PopupSuccess";


export default function Dashboard() {
  const [timetablesActiveForGroups, setTimetableActiveForGroups] = useState([]);
  const [timetableActiveFormateurs , setTimetableActiveFormateurs ] = useState([])
  const [timetableActiveSalles , setTimetableActiveSalles ] = useState([])

  const { group, formateur, salle, startExport, updateExport, finishExport } = useContext(ExportContext);

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleTelechargementDesEmploisDuTempsActifDesGroupes = async (format: string) => {
    if (format === "png") {
      startExport("group", timetablesActiveForGroups.length);
      await telechargeToutLesEmploisActifDesGroupesPngSurZip(
        timetablesActiveForGroups,
        (current: number, total: number) => {
          updateExport("group", current, total);
        }
      );
      finishExport("group");
      setShowSuccess(true);
      setSuccessMessage("Les emplois du temps des groupes ont été téléchargés avec succès.");
    } else if (format === "excel") {
      window.open("/timetables/groups/excel", "_blank");
    } else if (format === "pdf") {
      window.open("/timetables/groups/pdf", "_blank");
    }
  };

  const handleTelechargementDesEmploisDuTempsActifDesFormateurs = async (format: string) => {
    if (format === "png") {
      startExport("formateur", timetableActiveFormateurs.length);
      await telechargeToutLesEmploisActifDesFormateursPngSurZip(
        timetableActiveFormateurs,
        (current: number, total: number) => {
          updateExport("formateur", current, total);
        }
      );
      finishExport("formateur");
      setShowSuccess(true);
      setSuccessMessage("Les emplois du temps des formateurs ont été téléchargés avec succès.");
    } else if (format === "excel") {
      window.open("/timetable-formateurs/excel", "_blank");
    } else if (format === "pdf") {
      window.open("/timetable-formateurs/pdf", "_blank");
    }
  };

  const handleTelechargementDesEmploisDuTempsActifDesSalles = async (format: string) => {
    if (format === "png") {
      startExport("salle", timetableActiveSalles.length);
      await telechargeToutLesEmploisActifDesSallesPngSurZip(
        timetableActiveSalles,
        (current: number, total: number) => {
          updateExport("salle", current, total);
        }
      );
      finishExport("salle");
      setShowSuccess(true);
      setSuccessMessage("Les emplois du temps des salles ont été téléchargés avec succès.");
    } else {
      alert("Export Excel/PDF pour les salles n'est pas encore implémenté.");
    }
  };

  const fetchData = async () => {
    try {
      const res = await api.get("/timetables/groups");
      if (res && res.data) {
        setTimetableActiveForGroups(res.data);
      }

      const res2 = await api.get('/timetables/active/formateurs')
      if(res2 && res2.data){
        setTimetableActiveFormateurs(res2.data)
      }

      const res3 = await api.get('/classrooms-timetable')
      if(res3 && res3.data){
        setTimetableActiveSalles(res3.data)
      }

    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="w-full h-fit px-10 py-5" >
      <h1 className="lg:text-3xl font-bold text-gray-900 mb-6">
        <FontAwesomeIcon className="mr-2 text-blue-500" icon={faDashboard} />
        Tableau de bord
      </h1>
      <div className="py-5 w-full pr-32 flex gap-10 justify-between">
        <NavLink
          to={"/administrateur/dashboard/emplois-du-temps-actif/groupes"}
          className="w-[33%] w-1/3 flex hover:shadow-2xl hover:cursor-pointer hover:bg-gray-400 bg-gray-300 text-black lg:p-10 p-5 rounded-2xl transition-colors"
        >
          <FontAwesomeIcon
            className="text-center lg:text-4xl text-2xl mx-auto text-blue-500"
            icon={faCalendarDays}
          />
          <p className="lg:text-xl font-semibold text-center">
            Les emplois du temps des groupes actif
          </p>
        </NavLink>
        <NavLink
          to={"/administrateur/dashboard/emplois-du-temps-actif/formateurs"}
          className="w-[33%] w-1/3 flex hover:shadow-2xl hover:cursor-pointer hover:bg-gray-400 bg-gray-300 text-black lg:p-10 p-5 rounded-2xl transition-colors"
        >
          <FontAwesomeIcon
            className="text-center lg:text-4xl text-2xl mx-auto text-blue-500"
            icon={faCalendarDays}
          />
          <p className="lg:text-xl font-semibold text-center">
            Les emplois du temps des formateurs actif
          </p>
        </NavLink>
        <NavLink
          to={"/administrateur/dashboard/emplois-du-temps-actif/salles"}
          className="w-[33%] w-1/3 flex hover:shadow-2xl hover:cursor-pointer hover:bg-gray-400 bg-gray-300 text-black lg:p-10 p-5 rounded-2xl transition-colors"
        >
          <FontAwesomeIcon
            className="text-center lg:text-4xl text-2xl mx-auto text-blue-500"
            icon={faCalendarDays}
          />
          <p className="lg:text-xl font-semibold text-center">
            Les emplois du temps des salles actif
          </p>
        </NavLink>
      </div>

      <div className="pb-5 pr-32 w-full flex gap-10 justify-between">
        <ButtonTelechargementEmploisActif
          label="Exporter tous les emplois du temps des groupes"
          onExport={handleTelechargementDesEmploisDuTempsActifDesGroupes}
          availableFormats={['png']}
          type="groupes"
        />
        <ButtonTelechargementEmploisActif
          label="Exporter tous les emplois du temps des formateurs"
          onExport={handleTelechargementDesEmploisDuTempsActifDesFormateurs}
          availableFormats={['png']}
          type="formateurs"
        />
        <ButtonTelechargementEmploisActif
          label={<>Exporter tous les emplois du temps des salles</>}
          onExport={handleTelechargementDesEmploisDuTempsActifDesSalles}
          availableFormats={['png']}
          type="salles"
        />
      </div>
      {group.running && (
        <div className="mt-4 w-full max-w-md mx-auto">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${(group.current / group.total) * 100}%` }}
            />
          </div>
          <div className="text-sm text-gray-700 mt-1 text-center">
            {group.current} / {group.total} groupes traités
          </div>
        </div>
      )}
      {formateur.running && (
        <div className="mt-4 w-full max-w-md mx-auto">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${(formateur.current / formateur.total) * 100}%` }}
            />
          </div>
          <div className="text-sm text-gray-700 mt-1 text-center">
            {formateur.current} / {formateur.total} formateurs traités
          </div>
        </div>
      )}
      {salle.running && (
        <div className="mt-4 w-full max-w-md mx-auto">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${(salle.current / salle.total) * 100}%` }}
            />
          </div>
          <div className="text-sm text-gray-700 mt-1 text-center">
            {salle.current} / {salle.total} salles traitées
          </div>
        </div>
      )}
    <PopupSuccess 
    afficherPopupSuccess={showSuccess}
    messageSuccess={successMessage}
    setAfficherPopupSuccess={setShowSuccess}
   
    />
    </div>
  );
}
