import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";
import {
  faList,
  faPlus,
  faSquarePlus,
} from "@fortawesome/free-solid-svg-icons";
import Input from "../../../components/Input";
import Button from "../../../components/Button";
import { useEffect, useState } from "react";
import api from "../../../api/apiConfig";

interface Salle {
  id: number;
  label: string;
}

export default function SallesNoDisponbile() {
  const [sallesNonDisponible, setSallesNonDisponible] = useState<Salle[]>([]);
  const [sallesNonDisponibleAfterFilter, setSallesNonDisponibleAfterFilter] =
    useState<Salle[]>([]);
  const [valueInputSearch, setValueInputSearch] = useState("");
  const [salles, setSalles] = useState<Salle[]>([]);
  const [salle, setSalle] = useState({
    salleId: "",
  });

  const fetchData = async () => {
    try {
      const res = await api.get("/classrooms-non-disponible");

      if (res && res.data) {
        setSallesNonDisponible(res.data);
        setSallesNonDisponibleAfterFilter(res.data);
      }

      const res2 = await api.get("/classrooms-disponible");
      if (res2 && res2.data) {
        setSalles(res2.data);
      }
    } catch (err) {
      // Removed console.log statements for production
    }
  };

  const addSalleToListNoAvailable = async () => {
    if (!salle.salleId) {
      return;
    }
    try {
      await api.patch(`/classrooms-non-disponible/${salle.salleId}`, {
        is_available: false,
      });
      fetchData();
      setSalle({ ...salle });
    } catch (err) {
      // Removed console.log statements for production
    }
  };

  const removeSalleFromListNoAvailable = async (salleId: number) => {
    if (!salle.salleId) {
      return;
    }
    try {
      await api.patch(`/classrooms-non-disponible/${salleId}`, {
        is_available: true,
      });

      fetchData();
    } catch (err) {
      // Removed console.log statements for production
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValueInputSearch(value);
    if (!value.trim()) {
      setSallesNonDisponibleAfterFilter(sallesNonDisponible);
      return;
    }
    const arraySallesNoDisponibleAfterSearch = sallesNonDisponible.filter(
      (salle) => salle.label.toLowerCase().includes(value.toLowerCase())
    );

    setSallesNonDisponibleAfterFilter(arraySallesNoDisponibleAfterSearch);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="lg:w-[93%] mx-auto relative h-full lg:px-10 lg:py-5 p-5 bg-gray-50 min-h-screen">
      <ButtonNavigateBack />
      <h1 className="lg:text-3xl font-bold my-5 text-gray-900 flex items-center gap-3">
        <FontAwesomeIcon icon={faSquarePlus} className="text-blue-500 text-3xl" />
        Les salles non disponible
      </h1>

      {/* Add Salle Form */}
      <div className="bg-white shadow-lg rounded-xl p-8 my-8 border border-gray-200 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
          <FontAwesomeIcon icon={faPlus} className="text-green-500" />
          Ajouter une salle non disponible
        </h2>
        <div className="flex flex-col gap-4">
          <select
            name="salleId"
            onChange={(e) => setSalle({ ...salle, salleId: e.target.value })}
            value={salle.salleId}
            className="bg-gray-50 px-4 py-2 rounded border border-gray-300 text-gray-900 w-full"
          >
            <option value="">Choisir la salle</option>
            {salles &&
              salles.map((salle) => (
                <option key={salle.id} value={salle.id}>
                  {salle.label}
                </option>
              ))}
          </select>
          <Button
            label="Ajouter"
            onClick={addSalleToListNoAvailable}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded shadow w-fit self-end"
          />
        </div>
      </div>

      {/* Search and List Section */}
      <div className="bg-white shadow-lg rounded-xl p-8 my-8 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <FontAwesomeIcon icon={faList} className="text-blue-400" />
            Liste des salles non disponible
          </h2>
          <Input
            placeholder="Rechercher une salle..."
            className="!w-[300px] bg-gray-100 border border-gray-300 rounded px-3 py-2"
            value={valueInputSearch}
            onChange={handleSearch}
            type="text"
            name="search"
            id="search"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sallesNonDisponibleAfterFilter && sallesNonDisponibleAfterFilter.length > 0 ? (
            sallesNonDisponibleAfterFilter.map((salle) => (
              <div
                key={salle.id}
                className="flex flex-col gap-2 p-6 rounded-xl bg-blue-50 border border-blue-200 shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3 mb-2">
                  <FontAwesomeIcon icon={faSquarePlus} className="text-blue-500 text-xl" />
                  <span className="font-semibold text-lg text-blue-800">{salle.label}</span>
                </div>
                <button
                  className="bg-green-500 hover:bg-green-600 hover:cursor-pointer px-6 py-2 text-lg rounded text-white transition-colors w-fit self-end"
                  onClick={() => removeSalleFromListNoAvailable(salle.id)}
                >
                  Rendre disponible
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 py-10 text-lg">
              Aucune salle non disponible trouvée.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
