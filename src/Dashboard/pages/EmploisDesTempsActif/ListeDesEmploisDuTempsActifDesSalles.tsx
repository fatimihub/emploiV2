import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";
import { faDownload, faEye, faList } from "@fortawesome/free-solid-svg-icons";
import Input from "../../../components/Input";
import Button from "../../../components/Button";
import { Link } from "react-router-dom";
import PopupDeTelechargement from "../../../components/PopupDeTelechargement";
import { useEffect, useState } from "react";
import api from "../../../api/apiConfig";
import { telechargeToutLesEmploisActifDesSallesPngSurZip } from "../../../utils/telechargeToutLesEmploisActifDesSallesPngSurZip";

interface Salle {
  id: number;
  label: string;
}

export default function ListeDesEmploisDuTempsActifDesSalles() {
  const [afficherPopup, setAfficherPopup] = useState(false);
  const [valuePopup, setValuePopup] = useState("png");
  const [salles, setSalles] = useState<Salle[]>([]);
  const [sallesAfterFilter, setSallesAfterFilter] = useState<Salle[]>([]);
  const [valueInputSearch, setValueInputSearch] = useState("");

  const [handleLogicTelechargement, setHandleLogicTelechargement] = useState(
    () => () => {}
  );

  const handleTelechargementListeEmploisDuTempsActifDesSalles = () => {
    setAfficherPopup(true);
    setHandleLogicTelechargement(() => () => {
      //  alert('emplois du temps actif des salles')
      if (valuePopup == "png") {
        telechargeToutLesEmploisActifDesSallesPngSurZip(salles);
      }
    });
  };

  const fetchData = async () => {
    try {
      const res = await api.get(`/classrooms-timetable`);
      if (res && res.data) {
        setSalles(res.data);
        setSallesAfterFilter(res.data);
      }
    } catch (err) {
      // Removed console.log statements for production
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValueInputSearch(value);
    if (value == "") {
      setSallesAfterFilter(salles);
    }

    const arraySalles = salles.filter((salle) =>
      salle.label.toLowerCase().includes(value.toLowerCase())
    );

    setSallesAfterFilter(arraySalles);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="lg:w-[93%] mx-auto  h-full lg:px-10 lg:py-5  p-5 ">
      <div className="flex justify-between items-center">
        <ButtonNavigateBack />
        <button
          className="bg-green-500 px-5 py-2 text-xl hover:cursor-pointer text-white rounded shadow "
          onClick={handleTelechargementListeEmploisDuTempsActifDesSalles}
        >
          <FontAwesomeIcon className="mr-2" icon={faDownload} />
          Télécharger
        </button>
      </div>
      <div className="flex justify-between items-center my-5">
        <h1 className="lg:text-3xl font-bold">
          <FontAwesomeIcon className="text-blue-500 mr-3 " icon={faList} />
          Les emplois du temps des salles actif
        </h1>
      </div>

      <div>
        <div className="flex">
          <Input
            placeholder="Enter la salle..."
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
      </div>

      <div>
        <table className="w-full my-5">
          <thead>
            <tr className=" bg-gray-300 ">
              <th className=" lg:py-3 py-2 px-4 font-bold border">ID</th>
              <th className=" lg:py-3 py-2 px-4 font-bold border">Numéro</th>

              <th className=" lg:py-3 py-2 px-4 font-bold border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sallesAfterFilter &&
              sallesAfterFilter.map((salle) => {
                return (
                  <tr key={salle.id}>
                    <td className=" lg:py-3 py-2 px-4 font-bold border">
                      {salle.id}
                    </td>
                    <td className=" lg:py-3 py-2 px-4 font-bold border">
                      {salle.label}
                    </td>

                    <td className=" lg:py-3 py-2 px-4 font-bold border">
                      <Link
                        to={`/administrateur/afficher/afficher-emploi-du-temps-de-salle/${salle.id}`}
                        className="px-3 py-2 navigate-to-display-emplois-salle bg-blue-500 rounded text-white"
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
