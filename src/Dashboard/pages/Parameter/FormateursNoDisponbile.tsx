import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";
import {
  faList,
  faPlus,
  faUsersLine,
} from "@fortawesome/free-solid-svg-icons";
import Input from "../../../components/Input";
import Button from "../../../components/Button";
import { useEffect, useState } from "react";
import api from "../../../api/apiConfig";

interface Formateur {
  id: number;
  name: string;
}

export default function FormateursNoDisponbile() {
  const [formateursNonDisponible, setFormateursNonDisponible] = useState<
    Formateur[]
  >([]);
  const [valueInputSearch, setValueInputSearch] = useState("");
  const [
    formateursNonDisponibleAfterFilter,
    setFormateursNonDisponibleAfterFilter,
  ] = useState<Formateur[]>([]);
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [formateur, setFormateur] = useState({
    formateurId: "",
  });

  const fetchListDesFormateur = async () => {
    try {
      const res = await api.get("/formateurs-disponible");
      if (res && res.data) {
        setFormateurs(res.data);
      }
    } catch (err) {
      // Removed console.log(err);
    }
  };
  const fetchData = async () => {
    try {
      const res = await api.get("/formateurs-non-disponible");
      if (res && res.data) {
        setFormateursNonDisponible(res.data);
        setFormateursNonDisponibleAfterFilter(res.data);
      }
    } catch (err) {
      // Removed console.log(err);
    }
  };
  const handleAddFormateurTolistFormateurNoAvailable = async () => {
    if (!formateur.formateurId) {
      // Removed console.log("error , formateur id is required!!");
      return;
    }
    try {
      await api.patch(
        `/formateurs-non-disponible/${formateur.formateurId}`,
        { is_available: false }
      );
      fetchData();
      fetchListDesFormateur();
      setFormateur({ ...formateur });
    } catch (err) {
      // Removed console.log(err);
    }
  };
  const handleUpdateDisponiblteFormateur = async (formateurId: number) => {
    try {
      await api.patch(`/formateurs-non-disponible/${formateurId}`, {
        is_available: true,
      });
      fetchData();
      fetchListDesFormateur();
    } catch (err) {
      // Removed console.log(err);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value == "") {
      setFormateursNonDisponibleAfterFilter(formateursNonDisponible);
    }
    setValueInputSearch(value);
    const arrayFormateursNonDisponibleAfterFilter =
      formateursNonDisponible.filter((formateur) =>
        formateur.name.toLowerCase().includes(value.toLowerCase())
      );
    setFormateursNonDisponibleAfterFilter(
      arrayFormateursNonDisponibleAfterFilter
    );
  };
  useEffect(() => {
    fetchData();
    fetchListDesFormateur();
  }, []);
  return (
    <div className="lg:w-[93%] mx-auto relative h-full lg:px-10 lg:py-5 p-5 bg-gray-50 min-h-screen">
      <ButtonNavigateBack />
      <h1 className="lg:text-3xl font-bold my-5 text-gray-900 flex items-center gap-3">
        <FontAwesomeIcon icon={faUsersLine} className="text-blue-500 text-3xl" />
        Formateurs non disponible
      </h1>

      {/* Add Formateur Form */}
      <div className="bg-white shadow-lg rounded-xl p-8 my-8 border border-gray-200 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
          <FontAwesomeIcon icon={faPlus} className="text-green-500" />
          Ajouter un formateur non disponible
        </h2>
        <div className="flex flex-col gap-4">
          <select
            name="formateurId"
            onChange={(e) => setFormateur({ ...formateur, formateurId: e.target.value })}
            value={formateur.formateurId}
            className="bg-gray-50 px-4 py-2 rounded border border-gray-300 text-gray-900 w-full"
          >
            <option value="">Choisir le formateur</option>
            {formateurs &&
              formateurs.map((formateur) => (
                <option key={formateur.id} value={formateur.id}>
                  {formateur.name}
                </option>
              ))}
          </select>
          <Button
            label="Ajouter"
            onClick={handleAddFormateurTolistFormateurNoAvailable}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded shadow w-fit self-end"
          />
        </div>
      </div>

      {/* Search and List Section */}
      <div className="bg-white shadow-lg rounded-xl p-8 my-8 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <FontAwesomeIcon icon={faList} className="text-blue-400" />
            Liste des formateurs non disponible
          </h2>
          <Input
            placeholder="Rechercher un formateur..."
            className="!w-[300px] bg-gray-100 border border-gray-300 rounded px-3 py-2"
            value={valueInputSearch}
            onChange={handleSearch}
            type="text"
            name="search"
            id="search"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formateursNonDisponibleAfterFilter && formateursNonDisponibleAfterFilter.length > 0 ? (
            formateursNonDisponibleAfterFilter.map((formateur) => (
              <div
                key={formateur.id}
                className="flex flex-col gap-2 p-6 rounded-xl bg-blue-50 border border-blue-200 shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3 mb-2">
                  <FontAwesomeIcon icon={faUsersLine} className="text-blue-500 text-xl" />
                  <span className="font-semibold text-lg text-blue-800">{formateur.name}</span>
                </div>
                <button
                  className="bg-green-500 hover:bg-green-600 hover:cursor-pointer px-6 py-2 text-lg rounded text-white transition-colors w-fit self-end"
                  onClick={() => handleUpdateDisponiblteFormateur(formateur.id)}
                >
                  Rendre disponible
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 py-10 text-lg">
              Aucun formateur non disponible trouvé.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
