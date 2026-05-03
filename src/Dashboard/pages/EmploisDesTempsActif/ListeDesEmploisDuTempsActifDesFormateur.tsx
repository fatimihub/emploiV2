import { faDownload, faEye, faList } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Input from "../../../components/Input";
import Button from "../../../components/Button";
import { Link } from "react-router-dom";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";
import { useEffect, useState, useContext } from "react";
import PopupDeTelechargement from "../../../components/PopupDeTelechargement";
import api from "../../../api/apiConfig";
import { telechargeToutLesEmploisActifDesFormateursPngSurZip } from "../../../utils/telechargeToutLesEmploisActifDesFormateursPngSurZip";
import { ExportContext } from "../../../contextApi/ExportContext";

interface Formateur {
  id: number;
  mle_formateur: string;
  name: string;
}

export default function ListeDesEmploisDuTempsActifDesFormateur() {
  const [afficherPopup, setAfficherPopup] = useState(false);
  const [valuePopup, setValuePopup] = useState("png");
  const [handleLogicTelechargement, setHandleLogicTelechargement] = useState(
    () => () => {}
  );
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [listFormateurAfterFilter, setListFormateurAfterFilter] = useState<
    Formateur[]
  >([]);
  const [valueInputSearch, setValueInputSearch] = useState("");
  const { startExport, updateExport, finishExport } = useContext(ExportContext);

  const handleTelechargementListeEmploisDuTempsActifDesFormateurs = () => {
    setAfficherPopup(true);
    setHandleLogicTelechargement(() => async () => {
      if (valuePopup == "png") {
        startExport("formateur", formateurs.length);
        await telechargeToutLesEmploisActifDesFormateursPngSurZip(
          formateurs,
          (current: number, total: number) => {
            updateExport("formateur", current, total);
          }
        );
        finishExport("formateur");
      }
    });
  };

  const fetchData = async () => {
    try {
      const res = await api.get("/timetables/active/formateurs");

      if (res && res.data) {
        setFormateurs(res.data);
        setListFormateurAfterFilter(res.data);
      }
    } catch (err) {
      // Removed console.log statements for production
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValueInputSearch(value);
    if (value == "") setListFormateurAfterFilter(formateurs);
    const list = formateurs.filter((formateur) =>
      formateur.name.toLowerCase().includes(value.toLowerCase())
    );
    setListFormateurAfterFilter(list);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="lg:w-[93%] mx-auto  h-full lg:px-10 lg:py-5  p-5 ">
      <ButtonNavigateBack />
      <div className="flex justify-between items-center">
        <h1 className="lg:text-3xl mt-3 font-bold">
          <FontAwesomeIcon className="text-blue-500 mr-3 " icon={faList} />
          Les emplois du temps des formateurs actif
        </h1>

        <button

          className="bg-green-500 px-5 py-2 hover:cursor-pointer text-xl text-white rounded shadow"
          onClick={handleTelechargementListeEmploisDuTempsActifDesFormateurs}
        >
          <FontAwesomeIcon className="mr-2" icon={faDownload} />
          Télécharger
        </button>
      </div>
      <div className="my-5">
        <div className="flex">
          <Input
            placeholder="Enter le formateur..."
            className="!w-[500px] bg-gray-200"
            onChange={handleSearch}
            value={valueInputSearch}
            type="text"
            name="search"
            id="search"
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

              <th className=" lg:py-3 py-2 px-4 font-bold border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listFormateurAfterFilter &&
              listFormateurAfterFilter.map((formateur) => {
                return (
                  <tr key={formateur.id}>
                    <td className=" lg:py-3 py-2 px-4 font-bold border">
                      {formateur.id}
                    </td>
                    <td className=" lg:py-3 py-2 px-4 font-bold border">
                      {formateur.mle_formateur}
                    </td>
                    <td className=" lg:py-3 py-2 px-4 font-bold border">
                      {formateur.name}
                    </td>

                    <td className=" lg:py-3 py-2 px-4 font-bold border">
                      <Link
                        to={`/administrateur/afficher/afficher-emploi-du-temps-de-formateur/${formateur.mle_formateur}`}
                        className="px-3 navigate-to-display-emplois-formateur py-2 bg-blue-500 rounded text-white"
                      >
                        <FontAwesomeIcon className="mr-2" icon={faEye} />
                        Afficher
                      </Link>
                    </td>
                  </tr>
                );
              })}
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
    </div>
  );
}
