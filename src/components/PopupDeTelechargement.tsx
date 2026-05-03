import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClose, faDownload } from "@fortawesome/free-solid-svg-icons";

interface Props {
  afficherPopup: boolean;
  setAfficherPopup: (value: boolean) => void;
  valuePopup: string;
  setValuePopup: (value: string) => void;
  handleLogicTelechargement: () => void;
  availableFormats?: string[];
}

export default function PopupDeTelechargement({
  afficherPopup,
  setAfficherPopup,
  valuePopup,
  setValuePopup,
  handleLogicTelechargement,
  availableFormats = ['png'],
}: Props) {
  const handleClick = () => {
    handleLogicTelechargement();
    setAfficherPopup(false);
  };

  if (!afficherPopup) {
    return null;
  }
  return (
    <div 
      className="fixed popup left-0 top-0 w-full bg-blue-500/45 h-full z-10 flex justify-between items-center"
      onClick={() => setAfficherPopup(false)}
    >
      <div 
        className="w-[500px] mx-auto p-5 shadow-2xl bg-gray-100 h-[300px] rounded border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between my-4">
          <h1 className="text-2xl font-bold text-gray-900">Télécharger</h1>
          <FontAwesomeIcon
            icon={faClose}
            className="text-2xl hover:cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
            onClick={() => setAfficherPopup(false)}
          />
        </div>
        <hr className="border-gray-300" />
        <div className="my-5">
          <label htmlFor="" className="text-gray-700 font-medium">Type de téléchargement</label>
          <select
            name=""
            id=""
            className="w-full bg-white my-5 p-2 rounded border border-gray-300 text-gray-900"
            value={valuePopup}
            onChange={(e) => setValuePopup(e.target.value)}
          >
            {availableFormats.includes('png') && (
              <option className="px-4 py-3 text-lg" value="png">
                PNG (ZIP)
              </option>
            )}
           
          </select>
        </div>

        <button
          id="popup-btn-download"
          className="bg-green-600 hover:bg-green-700 px-5 py-2 hover:cursor-pointer text-xl text-white rounded shadow transition-colors"
          onClick={handleClick}
        >
          <FontAwesomeIcon className="mr-2" icon={faDownload} />
          Télécharger
        </button>
      </div>
    </div>
  );
}
