import ReactDOM from "react-dom/client";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import api from "../api/apiConfig";
import TimetableFormateur from "../components/TimetableFormateur";
import { handleNotification } from "./notification";

interface TimetableActive {
  mle_formateur: string;
}

interface TimetableFormateurData {
  formateur: string;
  timetable: any[];
  valid_form: string;
  nbr_hours_in_week: number;
}

export const telechargeToutLesEmploisActifDesFormateursPngSurZip = async (
  timetablesActiveForFormateurs: TimetableActive[],
  onProgress?: (current: number, total: number) => void
) => {
  const zip = new JSZip();

  try {
    // Create a hidden container
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.top = "-10000px";
    container.style.left = "-10000px";
    container.style.width = "210mm";
    container.style.background = "white";
    container.id = 'timetable-export-container';
    document.body.appendChild(container);

    const randStr = Math.random().toString(36).substr(2, 9);
    
    for (let i = 0; i < timetablesActiveForFormateurs.length; i++) {
      const formateur = timetablesActiveForFormateurs[i];
      try {
        // Get full data
        const { data: timetableFormateur }: { data: TimetableFormateurData } =
          await api.get(`/timetables/active/formateurs/${formateur.mle_formateur}`);

        // Create a wrapper div for each timetable
        const wrapper = document.createElement("div");
        wrapper.id = `formateur-${i}`;
        container.appendChild(wrapper);
        wrapper.style.width = "100%";
        wrapper.style.padding = '20px';

        const root = ReactDOM.createRoot(wrapper);

        // Render the React component
        await new Promise<void>((resolve) => {
          root.render(
            <TimetableFormateur
              formateurTimetable={timetableFormateur}
              timetableRef={null}
            />
          );
          // Increase timeout to ensure proper rendering
          setTimeout(resolve, 1500);
        });

        // Screenshot the rendered timetable
        const canvas = await html2canvas(wrapper, {
          useCORS: true,
          scale: 2,
          backgroundColor: "#fff",
          logging: false,
          removeContainer: false
        });

        const blob: Blob | null = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );

        if (blob) {
          zip.file(
            `les-emplois-des-temps-actif-des-formateurs--${randStr}/${timetableFormateur.formateur}.png`,
            blob
          );
        }

        // Clean up
        root.unmount();
        container.removeChild(wrapper);

        // Progress callback
        if (onProgress) onProgress(i + 1, timetablesActiveForFormateurs.length);
        
        // Add a small delay to prevent UI blocking
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error processing formateur ${formateur.mle_formateur}:`, error);
        // Continue with next formateur even if one fails
        continue;
      }
    }
  } catch (error) {
    console.error('Error during export process:', error);
    throw error;
  } finally {
    // Clean up container if it still exists
    const container = document.getElementById('timetable-export-container');
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  // Download ZIP
  const zipBlob = await zip.generateAsync({ type: "blob" });

  saveAs(
    zipBlob,
    `emplois-du-temps-des-formateurs${
      new Date().toISOString().split("T")[0]
    }--${Math.random().toString(36).substr(2, 9)}.zip`
  );

  handleNotification(
    "Téléchargement",
    "seccès téléchargement des emlpois du temps des formateurs!"
  );
};
