import { faCircleCheck, faClose } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function PopupSuccess({
  afficherPopupSuccess,
  messageSuccess = "",
  setAfficherPopupSuccess,
}: {
  afficherPopupSuccess: boolean;
  messageSuccess: string;
  setAfficherPopupSuccess: (value: boolean) => void;
}) {
  if (!afficherPopupSuccess) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/40 flex justify-center items-center z-50" 
      onClick={() => setAfficherPopupSuccess(false)}
      data-testid="popup-success-overlay"
    >
      <div 
        className="p-10 rounded-xl shadow-2xl shadow-green-500/50 mx-auto w-[500px] h-fit bg-white border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <FontAwesomeIcon
            className="ml-auto hover:cursor-pointer text-2xl text-gray-500 hover:text-gray-700 transition-colors"
            icon={faClose}
            onClick={() => setAfficherPopupSuccess(false)}
          />
        </div>
        <div className="flex justify-center">
          <FontAwesomeIcon
            className="text-7xl block mx-auto w-fit text-center text-green-600"
            icon={faCircleCheck}
          />
        </div>
        <h1 
          className="text-center success text-5xl font-bold mb-8 text-green-600"
          data-testid="popup-success-title"
        >
          Succès
        </h1>

        {messageSuccess && (
          <div className="text-center message-success text-gray-700 whitespace-pre-line max-h-96 overflow-y-auto">
            {messageSuccess}
          </div>
        )}
      </div>
    </div>
  );
}
