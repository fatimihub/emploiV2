import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "../../../components/Button";
import Input from "../../../components/Input";
import {
  faList,
  faPeopleGroup,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";
import { useEffect, useState } from "react";
import api from "../../../api/apiConfig";

interface Group {
  id: number;
  code_group: string;
  branchId: number;
}

interface Stage {
  id: number;
  group: Group;
  date_start: string;
  date_fin: string;
}

export default function GroupesEnStage() {
  const [groupesEnStage, setGroupesEnStage] = useState<Stage[]>([]);
  const [formAjouterGroupeEnStage, setFormAjouterGroupeEnStage] = useState({
    groupId: "",
    date_start: "",
    date_fin: "",
  });
  const [groupes, setGroupes] = useState<Group[]>([]);
  const [groupsEnStageAfterFilter, setGroupsEnStageAfterFilter] = useState<
    Stage[]
  >([]);
  const [valueInputSearch, setValueInputSearch] = useState("");

  const [errors, setErrors] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setErrors("");
    setFormAjouterGroupeEnStage({
      ...formAjouterGroupeEnStage,
      [e.target.name]: e.target.value,
    });
  };

  const handleAjoouterGroupeEnStage = async () => {
    try {
      setErrors("");
      const res = await api.post("/groups-en-stage", formAjouterGroupeEnStage);

      if (res && res.data) {
        fetchData();
        // Removed setDipslayFormAjouterGroupEnStage call since variable was removed
      }
    } catch (err: any) {
      if (err.response.data.errors) {
        setErrors(err.response.data.errors);
      }
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValueInputSearch(value);
    if (value === "") {
      setGroupsEnStageAfterFilter(groupesEnStage);
      return;
    }
    const filtered = groupesEnStage.filter((stage) =>
      stage.group.code_group.toLowerCase().includes(value.toLowerCase())
    );
    setGroupsEnStageAfterFilter(filtered);
  };

  const handleStopStage = async (id: number) => {
    if (!window.confirm("Voulez-vous vraiment arrêter le stage pour ce groupe ?")) return;
    try {
      await api.delete(`/groups-en-stage/${id}`);
      fetchData(); // Refresh the list
    } catch (err) {
      setErrors("Erreur lors de l'arrêt du stage.");
    }
  };

  const fetchDataGroups = async () => {
    try {
      const res = await api.get("/groups");

      if (res && res.data) {
        setGroupes(res.data);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };
  const fetchData = async () => {
    try {
      const res = await api.get("/groups-en-stage");

      if (res && res.data) {
        setGroupesEnStage(res.data);
        setGroupsEnStageAfterFilter(res.data);
      }
    } catch (err) {
      console.error('Error fetching groups en stage:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchDataGroups();
  }, []);

  return (
    <div className="lg:w-[93%] mx-auto relative h-full lg:px-10 lg:py-5 p-5 bg-gray-50 min-h-screen">
      <ButtonNavigateBack />
      <h1 className="lg:text-3xl font-bold my-5 text-gray-900 flex items-center gap-3">
        <FontAwesomeIcon icon={faPeopleGroup} className="text-blue-500 text-3xl" />
        Groupes en stage
      </h1>

      {/* Add Group Form */}
      <div className="bg-white shadow-lg rounded-xl p-8 my-8 border border-gray-200 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
          <FontAwesomeIcon icon={faPlus} className="text-green-500" />
          Ajouter un groupe en stage
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <select
              name="groupId"
              value={formAjouterGroupeEnStage.groupId}
              onChange={handleChange}
              className="bg-gray-50 px-4 py-2 rounded border border-gray-300 text-gray-900 w-full lg:w-1/2"
            >
              <option value="">Choisir le groupe</option>
              {groupes &&
                groupes.map((groupe) => (
                  <option key={groupe.id} value={groupe.id}>
                    {groupe.code_group}
                  </option>
                ))}
            </select>
            <input
              type="date"
              name="date_start"
              value={formAjouterGroupeEnStage.date_start}
              onChange={handleChange}
              className="bg-gray-50 px-4 py-2 rounded border border-gray-300 text-gray-900 w-full lg:w-1/4"
              placeholder="Date début"
            />
            <input
              type="date"
              name="date_fin"
              value={formAjouterGroupeEnStage.date_fin}
              onChange={handleChange}
              className="bg-gray-50 px-4 py-2 rounded border border-gray-300 text-gray-900 w-full lg:w-1/4"
              placeholder="Date fin"
            />
          </div>
          {errors && <div className="text-red-500 font-semibold">{errors}</div>}
          <Button
            label="Ajouter"
            onClick={handleAjoouterGroupeEnStage}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded shadow w-fit self-end"
          />
        </div>
      </div>

      {/* Search and List Section */}
      <div className="bg-white shadow-lg rounded-xl p-8 my-8 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <FontAwesomeIcon icon={faList} className="text-blue-400" />
            Liste des groupes en stage
          </h2>
          <Input
            placeholder="Rechercher un groupe..."
            className="!w-[300px] bg-gray-100 border border-gray-300 rounded px-3 py-2"
            value={valueInputSearch}
            onChange={handleSearch}
            type="text"
            name="search"
            id="search"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groupsEnStageAfterFilter && groupsEnStageAfterFilter.length > 0 ? (
            groupsEnStageAfterFilter.map((stage) => (
              <div
                key={stage.id}
                className="flex flex-col gap-2 p-6 rounded-xl bg-blue-50 border border-blue-200 shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3 mb-2">
                  <FontAwesomeIcon icon={faPeopleGroup} className="text-blue-500 text-xl" />
                  <span className="font-semibold text-lg text-blue-800">{stage.group.code_group}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-gray-700">
                  <span>
                    <span className="font-semibold">Date début:</span> {new Date(stage.date_start).toLocaleDateString()}
                  </span>
                  <span>
                    <span className="font-semibold">Date fin:</span> {new Date(stage.date_fin).toLocaleDateString()}
                  </span>
                </div>
                <Button
                  label="Stop Stage"
                  onClick={() => handleStopStage(stage.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow w-fit self-end mt-2"
                />
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 py-10 text-lg">
              Aucun groupe en stage trouvé.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
