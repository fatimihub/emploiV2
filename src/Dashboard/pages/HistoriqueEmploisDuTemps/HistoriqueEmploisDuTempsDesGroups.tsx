import {
  faArrowLeft,
  faArrowRight,
  faClockRotateLeft,
  faEye,
  faSpinner,
  faSearch,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../../api/apiConfig";

interface Timetable {
  id: number;
  groupe: string;
  label_branch: string;
  valid_form: string;
  nbr_hours_in_week: number;
}

export default function HistoriqueEmploisDuTempsDesGroups() {
  const [historicTimetablesGroups, setHistoricTimetablesGroups] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [datesValidFrom, setDatesValidFrom] = useState<string[]>([]);
  const [selectedValidFrom, setSelectedValidFrom] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = async (currentPage: number, lim: number, validFrom = "", searchTerm = "") => {
    try {
      setLoading(true);
      let url = "";
      if (validFrom) {
        url = `/historic-timetables/groups-filter?valid_form=${encodeURIComponent(validFrom)}&page=${currentPage}&limit=${lim}`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      } else {
        url = `/historic-timetables/groups?page=${currentPage}&limit=${lim}`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      const res = await api.get(url);
      if (res && res.data) {
        setHistoricTimetablesGroups(res.data.data);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDataDatesValidFrom = async () => {
    try {
      const res = await api.get("get-all-unique-valid-from-dates");
      if (res && res.data) setDatesValidFrom(res.data);
    } catch (err) {
      console.error("Error fetching dates:", err);
    }
  };

  useEffect(() => {
    fetchData(page, limit, selectedValidFrom, search);
  }, [page, limit, selectedValidFrom, search]);

  useEffect(() => {
    fetchDataDatesValidFrom();
  }, []);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="lg:w-[93%] mx-auto h-full lg:px-10 lg:py-5 p-5">
      <h1 className="lg:text-3xl font-bold">
        <FontAwesomeIcon className="mr-3 text-blue-500" icon={faClockRotateLeft} />
        Historique des emplois du temps des groupes
      </h1>

      <div className="flex flex-wrap gap-3 my-8 items-center">
        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher par code groupe..."
              className="bg-gray-100 border border-gray-300 rounded px-4 py-2 pr-10 text-base w-72 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            {searchInput && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={handleClearSearch}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
          >
            <FontAwesomeIcon icon={faSearch} />
            Chercher
          </button>
        </div>

        {/* Date filter */}
        <div className="ml-auto">
          <select
            className="bg-gray-200 px-4 py-2 rounded text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={selectedValidFrom}
            onChange={(e) => {
              setSelectedValidFrom(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Filtrer par date de validité</option>
            {datesValidFrom.map((date, index) => (
              <option value={date} key={index}>{date}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <table className="w-full my-5">
          <thead>
            <tr className="bg-gray-300">
              <th className="lg:py-3 py-2 px-4 font-bold border">ID</th>
              <th className="lg:py-3 py-2 px-4 font-bold border">Code groupe</th>
              <th className="lg:py-3 py-2 px-4 font-bold border">Filiére</th>
              <th className="lg:py-3 py-2 px-4 font-bold border">Valide à partir de</th>
              <th className="lg:py-3 py-2 px-4 font-bold border">Nombre d'heures</th>
              <th className="lg:py-3 py-2 px-4 font-bold border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && historicTimetablesGroups.map((timetable) => (
              <tr key={timetable.id} className="hover:bg-gray-50 transition-colors">
                <td className="lg:py-3 py-2 px-4 border text-center">{timetable.id}</td>
                <td className="lg:py-3 py-2 px-4 border font-semibold">{timetable.groupe}</td>
                <td className="lg:py-3 py-2 px-4 border">{timetable.label_branch}</td>
                <td className="lg:py-3 py-2 px-4 border text-center">{timetable.valid_form}</td>
                <td className="lg:py-3 py-2 px-4 border text-center">{timetable.nbr_hours_in_week}</td>
                <td className="lg:py-3 py-2 px-4 border text-center">
                  <Link
                    to={`/administrateur/historique-emplois-du-temps-des-groups/${timetable.id}`}
                    className="px-3 py-2 bg-blue-500 rounded hover:bg-blue-600 text-white transition-colors inline-flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faEye} />
                    Afficher
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="w-full flex justify-center">
            <FontAwesomeIcon icon={faSpinner} className="text-8xl my-20 text-blue-500" spin />
          </div>
        )}

        {!loading && historicTimetablesGroups.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <FontAwesomeIcon icon={faClockRotateLeft} className="text-5xl mb-4" />
            <p className="text-lg">Aucun résultat trouvé</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="ml-auto flex w-fit items-center gap-3 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="bg-blue-500 disabled:opacity-50 hover:bg-blue-600 text-white px-5 py-2 rounded transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-1" /> Préc
            </button>
            <span>Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="bg-blue-500 disabled:opacity-50 hover:bg-blue-600 text-white px-5 py-2 rounded transition-colors"
            >
              Suiv <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
