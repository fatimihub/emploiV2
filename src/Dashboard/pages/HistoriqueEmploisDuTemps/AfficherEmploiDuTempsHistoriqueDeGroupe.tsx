import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import PopupDeTelechargement from "../../../components/PopupDeTelechargement";
import ButtonPrint from "../../../components/ButtonPrint";
import { handleDownloadPng } from "../../../utils/telechargementPng";
import TimetableGroup from "../../../components/TimetableGroup";
import api from "../../../api/apiConfig";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";

const timeShots = ["08:30-11:00", "11:00-13:30", "13:30-16:00", "16:00-18:30"];

interface TimetableGroupData {
  groupe: string;
  valid_form: string;
  code_branch: string;
  year_of_formation?: number | string;
  academic_year?: string;
  niveau: string;
  timetable: any[];
  nbr_hours_in_week: number;
}

export default function AfficherEmploiDuTempsHistoriqueDeGroupe() {
  const [afficherPopup, setAfficherPopup] = useState(false);
  const [valuePopup, setValuePopup] = useState("png");
  const [handleLogicTelechargement, setHandleLogicTelechargement] = useState(
    () => () => {}
  );
  const { timetableId } = useParams();
  const [timetableGroup, setTimetableGroup] =
    useState<TimetableGroupData | null>(null);

  const timetableRef = useRef<HTMLDivElement>(null);

  const handleTelechargementEmploiDuTempsDeGroupe = () => {
    setAfficherPopup(true);
    setHandleLogicTelechargement(() => () => {
      if (valuePopup === "png") {
        if (timetableGroup) {
          handleDownloadPng(timetableGroup, timetableRef);
        }
      }
    });
  };

  const fetchData = async () => {
    try {
      const res = await api.get(`/timetables/${timetableId}`);

      if (res && res.data) {
        setTimetableGroup(res.data);
      }
    } catch (err) {
      // console.log(err);
    }
  };

  useEffect(() => {
    fetchData();

    // console.log(timetableGroup);
  }, [timetableId]);
  return (
    <>
      <div className="lg:w-[98%] mx-auto  h-full lg:px-10 lg:py-5  p-5 ">
        <div className="flex relative z-10 justify-between">
          <ButtonNavigateBack />

          <div className="flex  items-center">
            <ButtonPrint timetableRef={timetableRef} />
            <button
              className="bg-green-500 block px-5 ml-auto py-2 hover:cursor-pointer text-xl text-white rounded shadow "
              onClick={handleTelechargementEmploiDuTempsDeGroupe}
            >
              <FontAwesomeIcon className="mr-2" icon={faDownload} />
              Télécharger
            </button>
          </div>
        </div>
        {timetableGroup && (
          <>
            <TimetableGroup
              timetableRef={timetableRef}
              timetableGroup={timetableGroup}
            />
            <div ref={timetableRef} className="p-5">
              <h1 className="text-center text-2xl font-bold">EMPLOI DU TEMPS</h1>
              <div className="flex justify-between my-5">
                <div>
                  <p>
                    EFP :{" "}
                    <span className=" uppercase font-bold" style={{ color: "blue" }}>
                      ista cité de l'air
                    </span>
                  </p>
                  <p>
                    Filiére :{" "}
                    <span className=" font-bold" style={{ color: "blue" }}>
                      {timetableGroup?.code_branch}
                    </span>
                  </p>
                  <p>
                    Niveau :{" "}
                    <span className=" font-bold" style={{ color: "blue" }}>
                      {timetableGroup?.niveau}
                    </span>
                  </p>
                </div>
                <div>
                  <p>
                    Année de formation :
                    <span className=" font-bold" style={{ color: "blue" }}>
                      {timetableGroup?.academic_year || '2024-2025'}
                    </span>
                  </p>
                  <br />
                  <p>
                    Groupe :{" "}
                    <span className=" font-bold" style={{ color: "blue" }}>
                      {timetableGroup?.groupe}{" "}
                    </span>
                  </p>
                </div>
              </div>
              <div>
                <table className="w-full ">
                  <thead>
                    <tr>
                      <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[12%]"></th>
                      <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[22%]">08:30-11:00</th>
                      <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[22%]">11:00-13:30</th>
                      <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[22%]">13:30-16:00</th>
                      <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[22%]">16:00-18:30</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timetableGroup.timetable &&
                     timetableGroup.timetable.map((day, index) => {
                        const dayLabel = Object.keys(day)[0];
                        const sessions = Object.values(day)[0];
                        const sessionsArr = Array.isArray(sessions) ? sessions : [];

                        // return (
                        //   <tr key={index}>
                        //     <td className=" lg:px-5 lg:py-7 py-5 px-3 font-bold text-center border w-[12%]"  style={{ background : 'gray'}}>
                        //       {dayLabel}
                        //     </td>
                        //     {timeShots.map((timeshot, index) => {
                        //       return (
                        //         <RenderTimeShot
                        //           key={index}
                        //           mergeSession={mergeSession}
                        //           dayData={sessions}
                        //           timeshot={timeshot}
                        //         />
                        //       );
                        //     })}
                        //   </tr>
                        // );
                        return (() => {
                          const renderCells = [];
                          let skipNext = false;

                          for (let i = 0; i < timeShots.length; i++) {
                            if (skipNext) {
                              skipNext = false;
                              continue;
                            }

                            const timeshot = timeShots[i];
                            const currentSession = sessionsArr?.find(
                              (s) => s.timeshot === timeshot
                            );
                            const nextSession = sessionsArr?.find(
                              (s) => s.timeshot === timeShots[i + 1]
                            );

                            let merge = false;
                            if (
                              currentSession &&
                              nextSession &&
                              currentSession.module === nextSession.module &&
                              currentSession.salle === nextSession.salle
                            ) {
                              merge = true;
                              skipNext = true;
                            }

                            renderCells.push(
                              <RenderTimeShot
                                key={i}
                                session={currentSession}
                                mergeSession={merge}
                              />
                            );
                          }

                          return (
                            <tr key={index}>
                              <td style={{ background: '#6b7280', color: '#fff' }} className="lg:px-5 lg:py-7 py-5 px-3 font-bold text-center border w-[12%]">
                                {dayLabel}
                              </td>
                              {renderCells}
                            </tr>
                          );
                        })();
                      })}
                  </tbody>
                </table>
                <div className="flex justify-between">
                  <p>
                    Cet emploi du temps est valable _ partir du{" "}
                    <span className=" font-bold" style={{ color: "blue" }}>
                      {timetableGroup.valid_form}
                    </span>
                  </p>
                  <p>
                    {" "}
                    Nombre d'heures:{" "}
                    <span className=" font-bold " style={{ color: "blue" }}>
                      {timetableGroup?.nbr_hours_in_week}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <PopupDeTelechargement
          afficherPopup={afficherPopup}
          setAfficherPopup={setAfficherPopup}
          valuePopup={valuePopup}
          setValuePopup={setValuePopup}
          handleLogicTelechargement={handleLogicTelechargement}
        />
      </div>
    </>
  );
}

const RenderTimeShot = ({ session, mergeSession }: { session: any; mergeSession: boolean }) => {
  if (!session) {
    return <td style={{ background: '#f9fafb' }} className="lg:px-5 py-2 px-3 text-center border w-[12%]" />;
  }
  return (
    <td colSpan={mergeSession ? 2 : 1} className="lg:px-5 py-2 px-3 text-center border w-[12%]" style={{ background: session.color }}>
      <span style={{ color: '#111827', fontWeight: 600 }}>{session.module}</span> <br />
      <span style={{ color: '#111827', fontWeight: 600 }}>{session.formateur.slice(session.formateur.indexOf(" "))}</span> <br />
      <span style={{ color: '#111827', fontWeight: 600 }}>{session.salle}</span> <br />
    </td>
  );
};
