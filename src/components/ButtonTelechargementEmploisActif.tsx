import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState, ReactNode } from "react";
import PopupDeTelechargement from "./PopupDeTelechargement";

interface ButtonTelechargementEmploisActifProps {
  label: ReactNode;
  onExport: (format: string) => void;
  availableFormats?: string[];
  type ?: string ;
}

export default function ButtonTelechargementEmploisActif({
  label,
  onExport,
  availableFormats = ['png' ],
  type = ""
}: ButtonTelechargementEmploisActifProps) {
  const [afficherPopup, setAfficherPopup] = useState(false);
  const [valuePopup, setValuePopup] = useState("png");

  const handleClick = () => {
    setAfficherPopup(true);
  };

  const handleLogicTelechargement = () => {
    onExport(valuePopup);
  };

  return (
    <div className={`w-[33%] w-1/3 flex flex-col items-center gap-2`}>
      <button
       
       id={
         type == 'groupes' ? "btn-download-emplois-groupes" : 
         type == 'formateurs' ? "btn-download-emplois-formateurs" :
         type == "salles" ? "btn-download-emplois-salles" : ""  
       }
        className="w-full  flex items-center justify-center hover:shadow-2xl hover:cursor-pointer hover:bg-green-700 bg-green-600 text-white lg:p-10 p-5 rounded-2xl transition-colors"
        onClick={handleClick}
        aria-label={typeof label === 'string' ? label : 'Exporter'}
      >
        <FontAwesomeIcon
          className="text-center lg:text-4xl text-2xl mx-auto mr-3"
          icon={faDownload}
        />
        <p className="lg:text-xl font-semibold text-center">{label}</p>
      </button>
      <PopupDeTelechargement
        afficherPopup={afficherPopup}
        setAfficherPopup={setAfficherPopup}
        valuePopup={valuePopup}
        setValuePopup={setValuePopup}
        handleLogicTelechargement={handleLogicTelechargement}
        availableFormats={availableFormats}
      />
    </div>
  );
}
