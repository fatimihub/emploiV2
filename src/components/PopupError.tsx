import { faCircleXmark, faClose } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Define the type for detailed backend error
interface ConflictSession {
  groupId: number;
  moduleId: number;
}
interface Conflict {
  type: string;
  day: string;
  timeSlot: string;
  sessions: ConflictSession[];
}
interface ErrorDetails {
  errors: string;
  details: {
    conflicts?: Conflict[];
    currentTotalHours?: number;
    requestedHours?: number;
    formateurId?: number;
    formateurName?: string;
  };
}

type PopupErrorProps = {
  afficherPopupError: boolean;
  errors: string | ErrorDetails;
  setAfficherPopupError: (value: boolean) => void;
};

function renderDetailedError(errorObj: ErrorDetails) {
  const { details } = errorObj;
  const { conflicts = [], currentTotalHours, requestedHours, formateurName } = details || {};
  const maxHours = 35; // You may want to get this from config if dynamic

  return (
    <div>
      {formateurName && (
        <h2 className="text-center text-xl font-semibold mb-2 text-gray-800">
          Erreur de planification pour {formateurName}
        </h2>
      )}
      <div className="mb-4">
        {conflicts.length > 0 && (
          <>
            <div className="font-bold text-red-700 mb-1">Conflits détectés dans l'emploi du temps :</div>
            <ul className="list-disc pl-6 text-gray-700">
              {conflicts.map((conflict, idx) => (
                <li key={idx} className="mb-1">
                  <span className="font-semibold">{conflict.day}</span> — {conflict.timeSlot} : Groupes/Modules en conflit : {conflict.sessions.map(s => `${s.groupId}/${s.moduleId}`).join(", ")}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {(currentTotalHours !== undefined && requestedHours !== undefined) && (
        <div className="mb-2">
          <div className="font-bold text-red-700 mb-1">Limite d'heures hebdomadaires dépassée :</div>
          <ul className="list-disc pl-6 text-gray-700">
            <li>Heures actuelles : {currentTotalHours}h</li>
            <li>Heures demandées : +{requestedHours}h</li>
            <li>Limite maximale autorisée : {maxHours}h</li>
          </ul>
        </div>
      )}
      <div className="mt-4 text-gray-800">
        Veuillez corriger les conflits de créneaux et/ou réduire le nombre d'heures attribuées à ce formateur.
      </div>
    </div>
  );
}

export default function PopupError({
  afficherPopupError,
  errors = "",
  setAfficherPopupError,
}: PopupErrorProps) {
  if (!afficherPopupError) {
    return null;
  }

  let content: React.ReactNode = null;
  if (typeof errors === "string") {
    content = <p className="text-center text-gray-700">{errors}</p>;
  } else if (typeof errors === "object" && errors !== null) {
    content = renderDetailedError(errors as ErrorDetails);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50" onClick={() => setAfficherPopupError(false)}>
      <div 
        className="p-10 rounded-xl shadow-2xl shadow-red-500/50 mx-auto w-[500px] h-fit bg-white border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <FontAwesomeIcon
            className="ml-auto hover:cursor-pointer text-2xl text-gray-500 hover:text-gray-700 transition-colors"
            icon={faClose}
            onClick={() => setAfficherPopupError(false)}
          />
        </div>
        <div className="flex justify-center">
          <FontAwesomeIcon
            className="text-7xl block mx-auto w-fit text-center text-red-600"
            icon={faCircleXmark}
          />
        </div>
        <h1 className="text-center error text-5xl font-bold mb-8 text-red-600">
          Erreur
        </h1>
        <div className="message-error">
          {content}
        </div>
      </div>
    </div>
  );
}
