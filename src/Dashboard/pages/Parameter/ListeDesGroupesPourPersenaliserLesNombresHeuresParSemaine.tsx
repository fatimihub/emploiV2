import { Link } from "react-router-dom";
import Input from "../../../components/Input";
import Button from "../../../components/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faList } from "@fortawesome/free-solid-svg-icons";
import { useContext, useEffect, useState } from "react";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";
import { filieresContext } from "../../../contextApi/filieresContext";
import api from "../../../api/apiConfig";

interface Group {
  id: number;
  code_group: string;
  branch: string;
}

interface Filiere {
  id: number;
  code_branch: string;
  label: string;
}

export default function ListeDesGroupesPourPersenaliserLesNombresHeuresParSemaine() {
  const [groupes, setGroupes] = useState<Group[]>([]);
  const [groupesFilter, setGroupesFilter] = useState<Group[]>([]);
  const [valueInputSearch, setValueInputSearch] = useState("");
  const { filiers }: { filiers: Filiere[] } = useContext(filieresContext);

  const fetchData = async () => {
    try {
      const res = await api.get("/groups");

      if (res && res.data) {
        setGroupes(res.data);
        setGroupesFilter(res.data);
      }
    } catch (err) {
      // Removed console.log statements for production
    }
  };

  const handleSearch = (code_groupe: string) => {
    const groupesAfterFilter = groupes.filter((groupe) =>
      groupe.code_group.toLowerCase().includes(code_groupe.toLowerCase())
    );
    setGroupesFilter(groupesAfterFilter);
  };

  const handleFilterByFilier = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code_branch = e.target.value;

    if (code_branch == "") {
      setGroupesFilter(groupes);
    } else {
      const groupesAfterFilter = groupes.filter(
        (groupe) => groupe.branch === code_branch
      );

      setGroupesFilter(groupesAfterFilter);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="lg:w-[93%] mx-auto relative h-full lg:px-10 lg:py-5 p-5 bg-gray-50 min-h-screen">
      <ButtonNavigateBack />
      <h1 className="lg:text-3xl font-bold my-5 text-gray-900">
        <FontAwesomeIcon className="mr-3 text-blue-500" icon={faGear} />
        Liste des groupes pour personnaliser les nombres d'heures par semaine
      </h1>

      <div className="bg-gray-200 rounded shadow p-5 my-5 border border-gray-300">
        <h2 className="text-xl font-bold my-2 text-gray-900">
          <FontAwesomeIcon className="text-blue-500 mr-3" icon={faList} />
          La liste des groupes
        </h2>
        <div className="flex">
          <Input
            placeholder="Enter le code de groupe..."
            className="!w-[500px] bg-white"
            value={valueInputSearch}
            onChange={(e) => {
              setValueInputSearch(e.target.value);
              handleSearch(e.target.value);
            }}
            type="text"
            name="search"
            id="search"
          />
          <Button
            label="Chercher"
            onClick={() => {}}
            className="bg-blue-500 text-white px-4"
          />
          <div className="ml-auto">
            <select
              name=""
              id=""
              className="bg-white px-10 py-2 rounded text-xl mx-3 border border-gray-300 text-gray-900"
              onChange={handleFilterByFilier}
            >
              <option value="">Filtrer par filière</option>

              {filiers &&
                filiers
                  .filter(filier => groupes.some(groupe => groupe.branch === filier.code_branch))
                  .map((filier) => {
                    return (
                      <option
                        value={filier.code_branch}
                        key={filier.id}
                      >
                        {filier.label}
                      </option>
                    );
                  })}
            </select>
          </div>
        </div>
        <div className="my-5">
          {groupesFilter &&
            groupesFilter.map((groupe) => {
              return (
                <div key={groupe.id} className="flex justify-between p-5 rounded-2xl bg-gray-400 my-3 lg:px-20 border border-gray-300">
                  <p className="min-w-[300px] text-center py-2 rounded text-xl bg-white text-gray-900">
                    {groupe.code_group}
                  </p>
                  <div className="flex items-center">
                    <Link
                      to={`/administrateur/parameters/persenaliser-les-nomber-d-heures/${groupe.id}`}
                      className="bg-blue-500 hover:bg-blue-600 px-8 mx-5 py-2 hover:cursor-pointer text-xl rounded text-white transition-colors"
                    >
                      Personnaliser
                    </Link>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
