import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";
import { useEffect, useRef, useState } from "react";
import PopupDeTelechargement from "../../../components/PopupDeTelechargement";
import { useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import api from "../../../api/apiConfig";
import ButtonPrint from "../../../components/ButtonPrint";
import PopupSuccess from "../../../components/PopupSuccess";

interface EmploiFormateur {
  formateur: string;
  timetable: { day: string; timeshot: string; year: string }[];
  nbr_hours_in_week: number;
}



export default function AfficherEmploiDuTempsDeFormateurEnAnnee() {
  const [afficherPopup, setAfficherPopup] = useState(false);
  const [afficherPopupSuccess, setAfficherPopupSuccess] = useState(false);
  const [valuePopup, setValuePopup] = useState("png");
  const [emploiFormateur, setEmploiFormateur] =
    useState<EmploiFormateur | null>(null);

  const [handleLogicTelechargement, setHandleLogicTelechargement] = useState(
    () => () => {}
  );

  const { mleFormateur: mle_formateur } = useParams();

  const handleTelechargementListeEmploisDuTempsActifDeFormateurEnAnnee = () => {
    setAfficherPopup(true);
    setHandleLogicTelechargement(() => async () => {
      if (valuePopup === "png") {
        try {
          await handleDownloadPng();
          setAfficherPopupSuccess(true);
        } catch (error) {
          console.error("Error downloading timetable:", error);
        }
      }
    });
  };

  const fetchData = async () => {
    if (!mle_formateur) {
      console.error('No formateur ID provided in URL');
      return;
    }

    try {
      const res = await api.get(`/timetable-formateurs/${mle_formateur}`);
      
      if (res?.data) {
        setEmploiFormateur(res.data);
      }
    } catch (err) {
      console.error('Error fetching formateur timetable:', err);
    }
  };

  const timetableRef = useRef<HTMLDivElement>(null);

  const handleDownloadPng = () => {
    if (timetableRef.current) {
      html2canvas(timetableRef.current).then((canvas) => {
        // convert canvas to  PNG image
        const imgUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imgUrl;
        link.download =
          emploiFormateur?.formateur +
          "-emploi-du-temps-de-l-annèe-" +
          new Date().getFullYear() +
          "-" +
          new Date().getSeconds() +
          ".png";
        link.click();
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [mle_formateur]);

  return (
    <div className="lg:w-[93%] mx-auto  h-full lg:px-10 lg:py-5  p-5">
      <div className="flex justify-between items-center">
        <ButtonNavigateBack />

        <div className=" flex ">
          <ButtonPrint timetableRef={timetableRef} />
          <button
            id="btn-download-emplois-formateur-en-annee"
            className="bg-green-500 block px-5 ml-auto hover:cursor-pointer py-2 text-xl text-white rounded shadow "
            onClick={
              handleTelechargementListeEmploisDuTempsActifDeFormateurEnAnnee
            }
          >
            <FontAwesomeIcon className="mr-2" icon={faDownload} />
            Télécharger
          </button>
        </div>
      </div>
      <div className="w-full p-10" ref={timetableRef}>
        <h1 className="text-center text-2xl font-bold">EMPLOI DU TEMPS</h1>
        <div className="flex justify-between my-5">
          <div>
            <p className="font-semibold">
              EFP :{" "}
              <span className=" uppercase font-bold" style={{ color: "blue" }}>
                ista cité de l'air
              </span>
            </p>
            <br />
            <p className="font-semibold">
              Formateur :{" "}
              <span className=" font-bold" style={{ color: "blue" }}>
                {" "}
                {emploiFormateur?.formateur}{" "}
              </span>
            </p>
          </div>
          <div></div>
        </div>
        <div>
          <table className="w-full ">
            <thead>
              <tr>
                <th
                  className=" lg:px-5 lg:py-2 py-1 px-3 border w-[12%]"
                  style={{ background: "gray" }}
                ></th>
                <th
                  className=" lg:px-5 lg:py-2 py-1 px-3 border w-[22%]"
                  style={{ background: "gray" }}
                >
                  08:30-11:00
                </th>
                <th
                  className=" lg:px-5 lg:py-2 py-1 px-3 border w-[22%]"
                  style={{ background: "gray" }}
                >
                  11:00-13:30
                </th>
                <th
                  className=" lg:px-5 lg:py-2 py-1 px-3 border w-[22%]"
                  style={{ background: "gray" }}
                >
                  13:30-16:00
                </th>
                <th
                  className=" lg:px-5 lg:py-2 py-1 px-3 border w-[22%]"
                  style={{ background: "gray" }}
                >
                  16:00-18:30
                </th>
              </tr>
            </thead>
            <tbody>
              {emploiFormateur &&
                emploiFormateur?.timetable.map((day, index) => {
                  const isSamedi = day.day === "Samedi";
                  
                  return (
                    <tr key={index}>
                      <td
                        className=" lg:px-8 lg:py-7 py-5 px-3 font-bold text-center border w-[12%]"
                        style={{ background: "gray" }}
                      >
                        {day.day}
                      </td>
                      
                      {isSamedi ? (
                        // Saturday: Show two separate 2.5-hour slots
                        <>
                          {day.timeshot === "08:30-11:00" ? (
                            <td
                              className="lg:px-8 py-2 px-3 font-semibold text-center border w-[12%]"
                              style={{ background: "#0595d4" }}
                            >
                              Séance-{index + 1}
                            </td>
                          ) : (
                            <td
                              className="lg:px-8 py-2 px-3 text-center border w-[12%]"
                            ></td>
                          )}
                          
                          {day.timeshot === "11:00-13:30" ? (
                            <td
                              className="lg:px-8 py-2 px-3 font-semibold text-center border w-[12%]"
                              style={{ background: "#0595d4" }}
                            >
                              Séance-{index + 1}
                            </td>
                          ) : (
                            <td
                              className="lg:px-8 py-2 px-3 text-center border w-[12%]"
                            ></td>
                          )}
                        </>
                      ) : (
                        // Regular days: Show two 5-hour slots
                        <>
                          {day.timeshot.split("-")[0] == "08:30" ? (
                            <td
                              className="lg:px-8 py-2 px-3  font-semibold text-center border w-[12%]"
                              colSpan={2}
                              style={{ background: "#0595d4" }}
                            >
                              Séance-{index + 1}
                            </td>
                          ) : (
                            <td
                              className="lg:px-8 py-2 px-3  text-center border w-[12%]"
                              colSpan={2}
                            ></td>
                          )}

                          {day.timeshot.split("-")[0] == "13:30" ? (
                            <td
                              className="lg:px-8 py-2 px-3 font-semibold text-center border w-[12%]"
                              colSpan={2}
                              style={{ background: "#0595d4" }}
                            >
                              {" "}
                              Séance-{index + 1}
                            </td>
                          ) : (
                            <td
                              className="lg:px-8 py-2 px-3  text-center border w-[12%]"
                              colSpan={2}
                            ></td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
          <div className="flex justify-between">
            <p>
              Cet emploi du temps est valable _ partir en tout l'année{" "}
              <span className=" font-bold" style={{ color: "blue" }}>
                {" "}
                {emploiFormateur?.timetable[0].year}
              </span>
            </p>
            <p>
              {" "}
              Nombre d'heures:{" "}
              <span className=" font-bold" style={{ color: "blue" }}>
                {emploiFormateur?.nbr_hours_in_week}
              </span>
            </p>
          </div>
        </div>
      </div>

      <PopupDeTelechargement
        afficherPopup={afficherPopup}
        setAfficherPopup={setAfficherPopup}
        valuePopup={valuePopup}
        setValuePopup={setValuePopup}
        handleLogicTelechargement={handleLogicTelechargement}
      />

      <PopupSuccess
        afficherPopupSuccess={afficherPopupSuccess}
        setAfficherPopupSuccess={setAfficherPopupSuccess}
        messageSuccess="L'emploi du temps annuel du formateur a été téléchargé avec succès !"
      />
    </div>
  );
}
