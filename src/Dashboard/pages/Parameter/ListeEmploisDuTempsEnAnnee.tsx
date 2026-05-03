import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";
import { faDownload, faEye, faList } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import Input from "../../../components/Input";
import Button from "../../../components/Button";
import { useContext, useEffect, useState } from "react";
import PopupDeTelechargement from "../../../components/PopupDeTelechargement";
import api from "../../../api/apiConfig";
import { telechargeToutLesEmploisActifDesFormateursPngSurZip } from "../../../utils/telechargeToutLesEmploisDesFormateursEnAnneePngSurZip";
import { ExportContext } from "../../../contextApi/ExportContext";
import PopupSuccess from "../../../components/PopupSuccess";

interface EmploiFormateur {
  id: number;
  mle_formateur: string;
  formateur: string;
  nbr_hours_in_week: number;
}

export default function ListeEmploisDuTempsEnAnnee() {
  const { startExport, updateExport, finishExport } = useContext(ExportContext);
  console.log('ExportContext value in ListeEmploisDuTempsEnAnnee:', useContext(ExportContext));
  const [afficherPopup, setAfficherPopup] = useState(false);
  const [valuePopup, setValuePopup] = useState("png");
  const [listeEmploisDuTempsEnAnnee, setListeEmploisDuTempsEnAnnee] = useState<
    EmploiFormateur[]
  >([]);
  const [
    listeEmploisDuTempsEnAnneeFilter,
    setListeEmploisDuTempsEnAnneeFilter,
  ] = useState<EmploiFormateur[]>(listeEmploisDuTempsEnAnnee);
  const [handleLogicTelechargement, setHandleLogicTelechargement] = useState(
    () => () => {}
  );
  const [valueInputSearch, setValueInputSearch] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const handleTelechargementListeEmploisDuTempsActifDesFormateursEnAnnee = () => {
    setAfficherPopup(true);

    setHandleLogicTelechargement(() => async () => {
      try {
        startExport("formateurEnAnnee", listeEmploisDuTempsEnAnneeFilter.length);
        await telechargeToutLesEmploisActifDesFormateursPngSurZip(
          listeEmploisDuTempsEnAnneeFilter,
          (current: number, total: number) => {
            updateExport("formateurEnAnnee", current, total);
          }
        );

        setShowSuccessPopup(true);

      } catch (error) {
        console.error('Error during download:', error);
      } finally {
        finishExport("formateurEnAnnee");
      }
    });
  };

  const fetchData = async () => {
    try {
      const res = await api.get("/timetable-formateurs");

      if (res && res.data) {
        setListeEmploisDuTempsEnAnnee(res.data);
        setListeEmploisDuTempsEnAnneeFilter(res.data);
      }
    } catch (err) {
      // Removed console.log statements for production
    }
  };

  const handleFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValueInputSearch(e.target.value);
    const listAfterFilter = listeEmploisDuTempsEnAnnee.filter((emploi) =>
      emploi.formateur.toLowerCase().includes(e.target.value.toLowerCase())
    );
    setListeEmploisDuTempsEnAnneeFilter(listAfterFilter);
  };
  useEffect(() => {
    fetchData();
  }, []);
  return (
    <div className="lg:w-[93%] mx-auto  h-full lg:px-10 lg:py-5  p-5 ">
      <div className="flex justify-between">
        <ButtonNavigateBack />
        <button
          className="bg-green-500 px-5 py-2 text-xl text-white rounded shadow "
          id="btn-download"
          onClick={
            handleTelechargementListeEmploisDuTempsActifDesFormateursEnAnnee
          }
        >
          <FontAwesomeIcon className="mr-2" icon={faDownload} />
          Télécharger
        </button>
      </div>
      <div className="flex justify-between items-center">
        <h1 className="lg:text-3xl font-bold my-5">
          <FontAwesomeIcon className="text-blue-500 mr-3 " icon={faList} />
          Les emplois du temps des formateurs en année
        </h1>
      </div>
      <div className="my-5">
        <div className="flex">
          <Input
            type="text"
            name="search"
            id="search"
            placeholder="Enter le formateur..."
            className="!w-[500px] bg-gray-200"
            onChange={handleFilter}
            value={valueInputSearch}
          />
          <Button
            label="Chercher"
            onClick={() => {}}
            className="bg-blue-500 text-white px-4"
          />
        </div>

        <table className="w-full my-5">
          <thead>
            <tr className=" bg-gray-300 ">
              <th className=" lg:py-3 py-2 px-4 font-bold border">ID</th>
              <th className=" lg:py-3 py-2 px-4 font-bold border">
                Mle formateur
              </th>
              <th className=" lg:py-3 py-2 px-4 font-bold border">
                Prénom et nom
              </th>

              <th className=" lg:py-3 py-2 px-4 font-bold border">
                Nombre d'heures
              </th>
              <th className=" lg:py-3 py-2 px-4 font-bold border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listeEmploisDuTempsEnAnneeFilter &&
              listeEmploisDuTempsEnAnneeFilter.map(
                (emploiFormateur: EmploiFormateur) => {
                  return (
                    <tr key={emploiFormateur.id}>
                      <td className=" lg:py-3 py-2 px-4 font-bold border">
                        {emploiFormateur.id}
                      </td>
                      <td className=" lg:py-3 py-2 px-4 font-bold border">
                        {emploiFormateur.mle_formateur}
                      </td>
                      <td className=" lg:py-3 py-2 px-4 font-bold border">
                        {emploiFormateur.formateur}
                      </td>

                      <td className=" lg:py-3 py-2 px-4 font-bold border">
                        {emploiFormateur.nbr_hours_in_week}
                      </td>
                      <td className=" lg:py-3 py-2 px-4 font-bold border">
                        <Link
                          to={`/administrateur/parameters/afficher-emploi-du-temps-de-formateur-en-annee/${emploiFormateur.mle_formateur}`}
                          className="px-3 navigate-to-display-emploi-formateur-en-annee py-2 bg-blue-500 rounded text-white"
                        >
                          <FontAwesomeIcon className="mr-2" icon={faEye} />
                          Afficher
                        </Link>
                      </td>
                    </tr>
                  );
                }
              )}
          </tbody>
        </table>
      </div>
      <PopupDeTelechargement
        afficherPopup={afficherPopup}
        setAfficherPopup={setAfficherPopup}
        valuePopup={valuePopup}
        setValuePopup={setValuePopup}
        handleLogicTelechargement={handleLogicTelechargement}
      />
      <div className="h-[20vh]"></div>

      <PopupSuccess
        afficherPopupSuccess={showSuccessPopup}
        messageSuccess="Le téléchargement des emplois du temps a été effectué avec succès!"
        setAfficherPopupSuccess={setShowSuccessPopup}
      />
    </div>
  );
}
