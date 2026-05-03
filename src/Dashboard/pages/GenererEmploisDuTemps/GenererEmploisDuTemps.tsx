import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudArrowUp,
  faWandMagicSparkles,
  faEdit,
  faCalendar,
  faSpinner,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import { NavLink } from "react-router-dom";
import { useEffect, useRef, useState, useContext } from "react";
import PopupDeTelechargement from "../../../components/PopupDeTelechargement";
import PopupSuccess from "../../../components/PopupSuccess";
import PopupError from "../../../components/PopupError";
import { handleNotification } from "../../../utils/notification";
import api from "../../../api/apiConfig";
import { telechargeToutLesEmploisActifDesGroupesPngSurZip } from "../../../utils/telechargeToutLesEmploisActifDesGroupesPngSurZip";
import { telechargeToutLesEmploisActifDesFormateursPngSurZip } from "../../../utils/telechargeToutLesEmploisActifDesFormateursPngSurZip";
import { telechargeToutLesEmploisActifDesSallesPngSurZip } from "../../../utils/telechargeToutLesEmploisActifDesSallesPngSurZip";
import { ExportContext } from "../../../contextApi/ExportContext";

interface TimetableGroup {
  id: number;
}

interface TimetableFormateur {
  mle_formateur: string;
}

interface TimetableSalle {
  id: number;
}

interface DeactivatedModule {
  groupCode: string;
  moduleLabel: string;
  hours: number;
  [key: string]: any;
}

export default function GenererEmploisDuTemps() {
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [valide_a_partir_de, setValide_a_partir_de] = useState("");
  const [errors, setErrors] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState("");
  const [afficherPopupSuccess, setAfficherPopupSuccess] = useState(false);
  const [afficherPopupError, setAfficherPopupError] = useState(false);
  const [fileKey, setFileKey] = useState(Date.now());
  const fileinputRef = useRef<HTMLInputElement>(null);
  const [afficherPopup, setAfficherPopup] = useState(false);
  const [valuePopup, setValuePopup] = useState("png");
  const [handleLogicTelechargement, setHandleLogicTelechargement] = useState(
    () => () => {}
  );
  const [timetablesActiveForGroups, setTimetableActiveForGroups] = useState<
    TimetableGroup[]
  >([]);
  const [timetableActiveFormateurs, setTimetableActiveFormateurs] = useState<
    TimetableFormateur[]
  >([]);
  const [timetableActiveSalles, setTimetableActiveSalles] = useState<
    TimetableSalle[]
  >([]);
  const [deactivatedModules, setDeactivatedModules] = useState<DeactivatedModule[]>([]);
  const { startExport, updateExport, finishExport } = useContext(ExportContext);

  const handleGenerateEmploisDuTemps = async () => {
    try {
      setLoadingGenerate(true);
      setDeactivatedModules([]);
      
      const res = await api.post("/generate-timetable", {
        valide_a_partir_de: valide_a_partir_de,
      });

      if (res && res.data) {
        

        // Check if there are deactivated modules in the response
        if (res.data.groups && Array.isArray(res.data.groups)) {
          const allDeactivatedModules = res.data.groups
            .filter((group: any) => group.deactivatedModules && group.deactivatedModules.length > 0)
            .flatMap((group: any) => 
              group.deactivatedModules.map((module: any) => ({
                ...module,
                groupCode: group.groupCode
              }))
            );
          
          setDeactivatedModules(allDeactivatedModules);
        }

        let successMessage = res.data.message;
        
        // Add deactivated modules information to the success message
        if (deactivatedModules.length > 0) {
          successMessage += `\n\n Modules désactivés pour résoudre les contraintes de planning:`;
          deactivatedModules.forEach(module => {
            successMessage += `\n• ${module.groupCode}: ${module.moduleLabel} (${module.hours} heures)`;
          });
          successMessage += `\n\nCes modules peuvent être réactivés ultérieurement.`;
        }

        setAfficherPopupSuccess(true);
        setMessageSuccess(successMessage);
        handleNotification(
          "Générate des emplois du temps",
          "succès générate des emplois du temps "
        );
      }
      setLoadingGenerate(false);

     
    } catch (err: unknown) {
      setLoadingGenerate(false);
      setAfficherPopupError(true);
      // If err is an AxiosError, it may have response.data.errors
      if (typeof err === 'object' && err !== null && 'response' in err && (err as any).response?.data?.errors) {
        setErrors((err as any).response.data.errors);
      }

       
    
    }
  };

  const handleTelechargementDesEmploisDuTempsActifDesGroupes = () => {
    setAfficherPopup(true);
    setHandleLogicTelechargement(() => async () => {
      if (valuePopup == "png") {
        startExport("group", timetablesActiveForGroups.length);
        await telechargeToutLesEmploisActifDesGroupesPngSurZip(
          timetablesActiveForGroups,
          (current: number, total: number) => {
            updateExport("group", current, total);
          }
        );
        finishExport("group");
      }
    });
  };

  const handleTelechargementDesEmploisDuTempsActifDesFormateurs = () => {
    setAfficherPopup(true);
    setHandleLogicTelechargement(() => async () => {
      if (valuePopup == "png") {
        startExport("formateur", timetableActiveFormateurs.length);
        await telechargeToutLesEmploisActifDesFormateursPngSurZip(
          timetableActiveFormateurs,
          (current: number, total: number) => {
            updateExport("formateur", current, total);
          }
        );
        finishExport("formateur");
      }
    });
  };

  const handleTelechargementDesEmploisDuTempsActifDesSalles = () => {
    setAfficherPopup(true);
    setHandleLogicTelechargement(() => async () => {
      if (valuePopup == "png") {
        startExport("salle", timetableActiveSalles.length);
        await telechargeToutLesEmploisActifDesSallesPngSurZip(
          timetableActiveSalles,
          (current: number, total: number) => {
            updateExport("salle", current, total);
          }
        );
        finishExport("salle");
      }
    });
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const formData = new FormData();
      if (e.target.files) {
        formData.append("file", e.target.files[0]);
      }

      setLoading(true);

      const res = await api.post("/import-data", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res && res.data && res.data.message) {
        setAfficherPopupSuccess(true);
        setMessageSuccess("succès la importation des données ");
        handleNotification(
          "Importation des donnée",
          "succès la importation des données "
        );
      }
      setLoading(false);
    } catch (err: unknown) {
      setLoading(false);
      if (typeof err === 'object' && err !== null && 'response' in err && (err as any).response?.data?.errors) {
        setErrors((err as any).response.data.errors);
        setAfficherPopupError(true);
      }

    } finally {
      if (fileinputRef.current) {
        fileinputRef.current.value = "";
      }
      setFileKey(Date.now());
    }
  };

  const fetchData = async () => {
    try {
      const res = await api.get("/timetables/groups");
      if (res && res.data) {
        setTimetableActiveForGroups(res.data);
      }

      const res2 = await api.get("/timetables/active/formateurs");
      if (res2 && res2.data) {
        setTimetableActiveFormateurs(res2.data);
      }

      const res3 = await api.get("/classrooms-timetable");
      if (res3 && res3.data) {
        setTimetableActiveSalles(res3.data);
      }
    } catch (err) {
      // Removed console.log(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (afficherPopupSuccess) {
      setTimeout(() => {
        setAfficherPopupSuccess(false);
      }, 3000);
    }
    if (afficherPopupError) {
      setTimeout(() => {
        setAfficherPopupError(false);
      }, 6000);
    }
  }, [afficherPopupSuccess, afficherPopupError]);

  return (
    <div className="w-full h-full lg:px-10 lg:py-5  p-5 ">
      <h1 className="lg:text-3xl font-bold">
        <FontAwesomeIcon className="mr-2 text-blue-500" icon={faCalendar} />
        Générate des emplois du temps{" "}
      </h1>

      <div className="lg:mt-8 lg:my-10 my-5 flex justify-between">
        <div>
          <label htmlFor="input-valid-a-partir" className="lg:text-xl">
            valide a patir de
          </label>
          <input
            id="input-valid-a-partir"
            type="date"
            onChange={(e) => setValide_a_partir_de(e.target.value)}
            value={valide_a_partir_de}
            className="ml-3  lg:text-xl bg-gray-100 p-2 rounded-lg lg:px-8  "
          />
        </div>
      </div>
      <div className="w-full">
        <div className="pb-5  w-full pr-32 flex gap-10 justify-between">

          <label
            htmlFor="importData"
            className="w-[33%] w-1/3 flex items-center  hover:shadow-2xl hover:cursor-pointer hover:bg-gray-500 bg-gray-400 text-white  p-5 rounded-2xl"
          >
            <div className="flex items-center border-2 p-3 rounded border-dashed">
              {loading ? (
                <FontAwesomeIcon
                  className=" text-4xl text-black"
                  icon={faSpinner}
                  spin
                />
              ) : (
                <FontAwesomeIcon
                  className=" text-4xl text-black "
                  icon={faCloudArrowUp}
                />
              )}
              <p className="lg:text-lg ml-auto text-black w-[80%]">
                Importation des données Avancement de programme
              </p>
            </div>
            <input
              type="file"
              id="importData"
              accept=".xlsx,.xls"
              onChange={handleImportData}
              className=" hidden"
              ref={fileinputRef}
              key={fileKey}
            />
          </label>

          <div
            onClick={handleGenerateEmploisDuTemps}
            className="w-[33%] w-1/3 flex  items-center  hover:shadow-2xl hover:cursor-pointer hover:bg-blue-600 bg-blue-500 text-white lg:p-10 p-5 rounded-2xl"
            title="generate-emplois-du-temps-des-groupes"
         >
            {loadingGenerate ? (
              <FontAwesomeIcon
                className=" text-4xl text-white"
                icon={faSpinner}
                spin
              />
            ) : (
              <FontAwesomeIcon
                className=" text-4xl "
                icon={faWandMagicSparkles}
              />
            )}

            <p className="lg:text-xl ml-auto w-[80%]">
              Générate des emplois du temps des groupes
            </p>
          </div>

          <NavLink
            to={
              "/administrateur/generer-emplois-du-temps/liste-des-emplois-du-temps"
            }
            className="w-[33%] w-1/3 flex items-center   hover:shadow-2xl hover:cursor-pointer hover:bg-blue-600 bg-blue-500 text-white lg:p-10 p-5 rounded-2xl"
          >
            <FontAwesomeIcon className=" text-4xl " icon={faEdit} />
            <p className="lg:text-xl ml-auto w-[80%]">
              presonaliser des emplois du temps des groupes
            </p>
          </NavLink>
        </div>
        {/* Export buttons section - improved style */}
        <div className="pb-5 w-full pr-32 grid grid-cols-1 md:grid-cols-3 gap-8 my-8">
          <div className="flex flex-col items-center">
            <button
              onClick={handleTelechargementDesEmploisDuTempsActifDesGroupes}
              className="w-full flex flex-col items-center justify-center bg-green-600 hover:bg-green-700 text-white p-5 rounded-2xl shadow transition-colors gap-4"
            >
              <FontAwesomeIcon icon={faDownload} className="text-4xl mb-2" />
              <span className="text-lg font-semibold text-center">Exporter les emplois du temps actif des groupes</span>
            </button>
          </div>
          <div className="flex flex-col items-center">
            <button
              onClick={handleTelechargementDesEmploisDuTempsActifDesFormateurs}
              className="w-full flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl shadow transition-colors gap-4"
            >
              <FontAwesomeIcon icon={faDownload} className="text-4xl mb-2" />
              <span className="text-lg font-semibold text-center">Exporter les emplois du temps actif des formateurs</span>
            </button>
          </div>
          <div className="flex flex-col items-center">
            <button
              onClick={handleTelechargementDesEmploisDuTempsActifDesSalles}
              className="w-full flex flex-col items-center justify-center bg-purple-600 hover:bg-purple-700 text-white p-5 rounded-2xl shadow transition-colors gap-4"
            >
              <FontAwesomeIcon icon={faDownload} className="text-4xl mb-2" />
              <span className="text-lg font-semibold text-center">Exporter les emplois du temps actif des salles</span>
            </button>
          </div>
        </div>
      </div>
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
        messageSuccess={messageSuccess}
      />
      <PopupError
        afficherPopupError={afficherPopupError}
        setAfficherPopupError={setAfficherPopupError}
        errors={errors}
      />
    </div>
  );
}
