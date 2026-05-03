import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import PopupError from "../../../components/PopupError";
import api from "../../../api/apiConfig";

interface Module {
  moduleId: number;
  module_label: string;
  is_started: boolean;
  nbr_hours_presential_in_week: number;
  validate_efm?: boolean;
  mhp_realise?: number;
  mhsyn_realise?: number;
  mhp_s1?: number;
  mhp_s2?: number;
  mhsyn_s1?: number;
  mhsyn_s2?: number;
}

interface GroupeWithModules {
  code_group: string;
  modules: Module[];
}

export default function PersenaliserLesNombresHeuresParSemaineDeGroupe() {
  const [groupeWithModules, setGroupeWithModules] = useState<GroupeWithModules>(
    {} as GroupeWithModules
  );
  const { groupeId } = useParams();
  const [messageSuccess, setMessageSuccess] = useState("");
  const [errors, setErrors] = useState("");
  const [afficherPopupError, setAfficherPopupError] = useState(false);

  // fetch all groups
  const fetchData = async () => {
    try {
      const res = await api.get(`/groups/${groupeId}`);

      if (res && res.data) {
        setGroupeWithModules(res.data);
      }
    } catch (err) {
      // console.log(err);
    }
  };

  const handleEditNbrHoursInWeekPresentialForModule = async (
    e: React.ChangeEvent<HTMLInputElement>,
    module: Module
  ) => {
    //  console.log('module ' ,module)
    setGroupeWithModules((prevState) => {
      const modulesUpdate = prevState.modules.map((m) =>
        m.moduleId == module.moduleId
          ? { ...m, nbr_hours_presential_in_week: Number(e.target.value) }
          : m
      );

      return { ...prevState, modules: modulesUpdate };
    });

    try {
      const res = await api.patch(
        `/groups/${groupeId}/module/${module.moduleId}/edit-nbr-hours-presentail`,
        { nbr_hours_presential_in_week: Number(e.target.value) }
      );
      if (res && res.data) {
        setMessageSuccess(res.data.message);
        fetchData();
      }
    } catch (err) {
      // console.log(err);
    }
  };

  const handleEditStateModule = async (
    groupeId: string | undefined,
    moduleId: number,
    state: string
  ) => {
    // console.log("group id", groupeId, "module id ", moduleId, "state", state);
    try {
      const is_started = state == "actif" ? true : false;
      const res = await api.patch(`/groups/${groupeId}/module/${moduleId}`, {
        is_started: is_started,
      });

      if (res && res.data) {
        setMessageSuccess(res.data);
        fetchData();
      }
    } catch (err: any) {
      if (
        err &&
        err.response &&
        err.response.data &&
        err.response.data.errors
      ) {
        setErrors(err.response.data.errors);
        setAfficherPopupError(true);
      }
    }
  };

  useEffect(() => {
    fetchData();
    if (afficherPopupError) {
      setTimeout(() => {
        setAfficherPopupError(false);
      }, 5000);
    }
  }, [groupeId, messageSuccess, errors]);

  return (
    <div className="lg:w-[93%] mx-auto  h-full lg:px-10 lg:py-5  p-5 ">
      <ButtonNavigateBack />
      <h1 className="text-2xl font-bold my-5 ">
        <FontAwesomeIcon
          className="text-blue-500 text-2xl mr-3"
          icon={faEdit}
        />
        Persenaliser les nombres d'heures par semaine de groupe :{" "}
        <span className="text-blue-500 ">{groupeWithModules.code_group}</span>
      </h1>
      <div>
        <h2 className="text-2xl my-5 font-bold text-blue-500">
          Les modules ouverts
        </h2>

        <div>
          {groupeWithModules.modules &&
            groupeWithModules.modules
              .filter((module) => module.is_started == true && module.validate_efm !== true)
              .map((module) => {
                return (
                  <div key={module.moduleId} className="flex justify-between items-center p-5 rounded-2xl bg-gray-300 my-3 lg:px-20 border border-gray-300">
                    <p className="text-xl">{module.module_label}</p>
                    <div className="flex w-[30%] justify-end">
                      <div>
                        <label htmlFor="" className="mr-2 font-semibold">
                          presential
                        </label>
                        <input
                          type="number"
                          value={module.nbr_hours_presential_in_week}
                          className="w-[60px] p-1 rounded  bg-white "
                          onChange={(e) =>
                            handleEditNbrHoursInWeekPresentialForModule(
                              e,
                              module
                            )
                          }
                          step={2.5}
                          min={2.5}
                          max={15}
                        />
                      </div>
                      <div className="flex ml-5 w-[50%] justify-between">
                        <div className="flex items-center">
                          <label htmlFor="" className="mr-2 font-semibold">
                            actif
                          </label>
                          <input
                            type="radio"
                            onClick={() =>
                              handleEditStateModule(
                                groupeId,
                                module.moduleId,
                                "actif"
                              )
                            }
                            checked={module.is_started == true}
                            name={"stateModule" + module.moduleId}
                            className=" p-1 w-[25px] h-[25px] bg-white "
                          />
                        </div>

                        <div className="flex items-center ">
                          <label htmlFor="" className="mr-2 font-semibold">
                            non actif{" "}
                          </label>
                          <input
                            type="radio"
                            onClick={() =>
                              handleEditStateModule(
                                groupeId,
                                module.moduleId,
                                "non-actif"
                              )
                            }
                            checked={module.is_started == false}
                            name={"stateModule" + module.moduleId}
                            className=" p-1  w-[25px] h-[25px]  bg-white "
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

          {groupeWithModules.modules &&
            groupeWithModules.modules.filter(
              (module) => module.is_started == true && module.validate_efm !== true
            ).length == 0 && (
              <div>
                <p className="text-center my-10">No Modules ouverts</p>
              </div>
            )}
        </div>
        <h2 className="text-2xl my-5 font-bold text-blue-500">
          Les auters modules
        </h2>
        <div>
          {groupeWithModules.modules &&
            groupeWithModules.modules
              .filter((module) => module.is_started == false && module.validate_efm !== true)
              .map((module) => {
                return (
                  <div key={module.moduleId} className="flex justify-between items-center p-5 rounded-2xl bg-gray-300 my-3 lg:px-20 border border-gray-300">
                    <p className="text-xl">{module.module_label}</p>
                    <div className="flex w-[30%] justify-end">
                      <div>
                        <label htmlFor="" className="mr-2 font-semibold">
                          presential
                        </label>
                        <input
                          type="number"
                          value={module.nbr_hours_presential_in_week}
                          className="w-[60px] p-1 rounded  bg-white "
                          onChange={(e) =>
                            handleEditNbrHoursInWeekPresentialForModule(
                              e,
                              module
                            )
                          }
                          step={2.5}
                          min={2.5}
                          max={15}
                        />
                      </div>
                      <div className="flex ml-5 w-[50%] justify-between">
                        <div className="flex items-center">
                          <label htmlFor="" className="mr-2 font-semibold">
                            actif
                          </label>
                          <input
                            type="radio"
                            onClick={() =>
                              handleEditStateModule(
                                groupeId,
                                module.moduleId,
                                "actif"
                              )
                            }
                            checked={module.is_started == true}
                            name={"stateModule" + module.moduleId}
                            className=" p-1 w-[25px] h-[25px] bg-white "
                          />
                        </div>

                        <div className="flex items-center ">
                          <label htmlFor="" className="mr-2 font-semibold">
                            non actif{" "}
                          </label>
                          <input
                            type="radio"
                            onClick={() =>
                              handleEditStateModule(
                                groupeId,
                                module.moduleId,
                                "non-actif"
                              )
                            }
                            checked={module.is_started == false}
                            name={"stateModule" + module.moduleId}
                            className=" p-1  w-[25px] h-[25px]  bg-white "
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          {groupeWithModules.modules &&
            groupeWithModules.modules.filter(
              (module) => module.is_started == false && module.validate_efm !== true
            ).length == 0 && (
              <div>
                <p className="text-center my-10">No avoir Les auters modules</p>
              </div>
            )}
        </div>

        <h2 className="text-2xl my-5 font-bold text-green-600">
          Les modules finis
        </h2>
        <div>
          {groupeWithModules.modules &&
            groupeWithModules.modules
              .filter((module) => module.validate_efm === true)
              .map((module) => {
                return (
                  <div
                    key={module.moduleId}
                    className="flex justify-between items-center p-5 rounded-2xl bg-green-100 border-2 border-green-300 my-3 lg:px-20 "
                  >
                    <div className="flex items-center">
                      <p className="text-xl font-semibold text-green-800">{module.module_label}</p>
                      <span className="ml-3 px-2 py-1 bg-green-500 text-white text-sm rounded-full">
                        Terminé
                      </span>
                    </div>
                    <div className="flex w-[30%] justify-end">
                      <div>
                        <label htmlFor="" className="mr-2 font-semibold text-green-700">
                          presential
                        </label>
                        <input
                          type="number"
                          value={module.nbr_hours_presential_in_week}
                          className="w-[60px] p-1 rounded bg-white border-green-300"
                          onChange={(e) =>
                            handleEditNbrHoursInWeekPresentialForModule(
                              e,
                              module
                            )
                          }
                          step={2.5}
                          min={2.5}
                          max={15}
                          disabled={true}
                        />
                      </div>
                      <div className="flex ml-5 w-[50%] justify-between">
                        <div className="flex items-center">
                          <label htmlFor="" className="mr-2 font-semibold text-green-700">
                            actif
                          </label>
                          <input
                            type="radio"
                            onClick={() =>
                              handleEditStateModule(
                                groupeId,
                                module.moduleId,
                                "actif"
                              )
                            }
                            checked={module.is_started == true}
                            name={"stateModule" + module.moduleId}
                            className=" p-1 w-[25px] h-[25px] bg-white border-green-300"
                            disabled={true}
                          />
                        </div>

                        <div className="flex items-center ">
                          <label htmlFor="" className="mr-2 font-semibold text-green-700">
                            non actif{" "}
                          </label>
                          <input
                            type="radio"
                            onClick={() =>
                              handleEditStateModule(
                                groupeId,
                                module.moduleId,
                                "non-actif"
                              )
                            }
                            checked={module.is_started == false}
                            name={"stateModule" + module.moduleId}
                            className=" p-1  w-[25px] h-[25px]  bg-white border-green-300"
                            disabled={true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          {groupeWithModules.modules &&
            groupeWithModules.modules.filter(
              (module) => module.validate_efm === true
            ).length == 0 && (
              <div>
                <p className="text-center my-10 text-green-600">Aucun module terminé</p>
              </div>
            )}
        </div>
      </div>

      <div className="h-[20vh]"></div>
      <PopupError 
        afficherPopupError={afficherPopupError} 
        errors={errors} 
        setAfficherPopupError={setAfficherPopupError}
      />
    </div>
  );
}
