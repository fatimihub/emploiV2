const logo = new URL("../assets/logo.png", import.meta.url).href;

export const handleNotification = (title : string , body : string) => {
   
     Notification.requestPermission().then(() => {
       new Notification( title ,
         { 
           body : body ,
           icon : logo,
         
         }
        )
     })
   }

// Utility to format backend error objects into a user-friendly string
export function formatBackendError(errorObj: any, maxHours: number = 35): string {
  if (typeof errorObj === "string") return errorObj;

  if (errorObj && typeof errorObj === "object") {
    const { details, errors } = errorObj;
    let message = "";

    // Handle conflicts
    if (details?.conflicts && details.conflicts.length > 0) {
      message += "Conflits détectés : ";
      message += details.conflicts
        .map(
          (conflict: any) =>
            `${conflict.day} ${conflict.timeSlot} (Groupes/Modules : ${conflict.sessions
              .map((s: any) => `${s.groupId}/${s.moduleId}`)
              .join(", ")})`
        )
        .join("; ");
    }

    // Handle hour limit
    if (
      details?.currentTotalHours !== undefined &&
      details?.requestedHours !== undefined
    ) {
      if (message) message += " | ";
      message += `Limite d'heures hebdomadaires dépassée : ${details.currentTotalHours}h + ${details.requestedHours}h (maximum autorisé : ${maxHours}h)`;
    }

    // Fallback to generic error
    if (!message && errors) message = errors;

    return message || "Une erreur inconnue est survenue. Veuillez réessayer ou contacter l'administrateur.";
  }

  return "Une erreur inconnue est survenue. Veuillez réessayer ou contacter l'administrateur.";
}