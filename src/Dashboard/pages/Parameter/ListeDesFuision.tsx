import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";
import { faClock } from "@fortawesome/free-solid-svg-icons";
import Input from "../../../components/Input";
import Button from "../../../components/Button";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api/apiConfig";

interface Fuision {
  id: number;
  groups: string;
}

export default function ListeDesFuision() {
  const [fuisions, setFuisions] = useState<Fuision[]>([]);
  const [filterFuision, setFilterFuision] = useState<Fuision[]>([]);
  const [valueInputSearch, setValueInputSearch] = useState("");

  const fetchData = async () => {
    try {
      const res = await api.get("/merges");
      if (res && res.data) {
        setFuisions(res.data);
        setFilterFuision(res.data);
      }
    } catch (err) {
      // Removed console.log statements for production
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fuisionsAfterFilter = fuisions.filter((f) =>
      f.groups.toLowerCase().includes(e.target.value.toLowerCase())
    );
    setFilterFuision(fuisionsAfterFilter);
  };

  useEffect(() => {
    fetchData();
  }, []);
  return (
    <div className="lg:w-[93%] mx-auto  h-full lg:px-10 lg:py-5  p-5 ">
      <ButtonNavigateBack />
      <h2 className="text-xl mt-5 font-bold mb-5">
        <FontAwesomeIcon
          className="mr-3 text-blue-500 text-3xl"
          icon={faClock}
        />
        les nombres d'heures par module par semaine par fuision , les séance à
        distance{" "}
      </h2>
      <div className="flex items-center">
        <Input
          placeholder="Enter les groupes en fuision..."
          className="!w-[500px]"
          value={valueInputSearch}
          onChange={(e) => {
            setValueInputSearch(e.target.value);
            handleSearch(e);
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
      </div>

      <div className="my-5 ">
        {filterFuision &&
          filterFuision.map((fuision) => {
            return (
              <div
                key={fuision.id}
                className="flex justify-between p-5 rounded-2xl bg-gray-400 my-3 lg:px-20 "
              >
                <p className="min-w-[400px] text-center py-2 rounded text-xl bg-white">
                  {fuision.groups}
                </p>

                <Link
                  to={`/administrateur/parameters/persenaliser-les-nomber-d-heures-de-fuision/${fuision.id}`}
                  className=" bg-blue-500 px-8 mx-5 py-2 hover:cursor-pointer text-xl rounded text-white"
                >
                  Persenaliser
                </Link>
              </div>
            );
          })}
      </div>
      <div className="h-[20vh]"></div>
    </div>
  );
}
