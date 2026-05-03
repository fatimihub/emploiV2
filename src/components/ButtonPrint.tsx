import { faPrint } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { RefObject } from "react";

interface ButtonPrintProps {
  timetableRef?: RefObject<HTMLDivElement>;
}

export default function ButtonPrint({ timetableRef }: ButtonPrintProps) {

  const handlePrint = () => {
    if (!timetableRef?.current) {
      window.print();
      return;
    }

    // Open a new print window
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) return;

    // Determine the correct Tailwind CSS file path
    let tailwindHref = '/src/index.css';
    if (window.location.pathname.includes('dist') || window.location.pathname.includes('assets') || window.location.pathname.endsWith('.html')) {
      // Production: use the built CSS file
      tailwindHref = '/assets/index-B0zWLydH.css';
    }

    // Compose styles: always include Tailwind
    let styles = `<link rel="stylesheet" href="${tailwindHref}">`;
    for (const styleSheet of Array.from(document.styleSheets)) {
      try {
        if (styleSheet.href && !styleSheet.href.includes('tailwind')) {
          styles += `<link rel="stylesheet" href="${styleSheet.href}">`;
        } else if (styleSheet.cssRules) {
          styles += '<style>';
          for (const rule of Array.from(styleSheet.cssRules)) {
            styles += rule.cssText;
          }
          styles += '</style>';
        }
      } catch (e) {
        // Ignore CORS issues
      }
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Impression Emploi du Temps</title>
          ${styles}
        </head>
        <body style="background: #fff;">
          ${timetableRef.current.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
 
  return (
    <button
      onClick={handlePrint}
      className="mr-5 bg-blue-500 px-4 py-2 rounded text-white hover:cursor-pointer text-xl "
    >
      <FontAwesomeIcon className="mr-3" icon={faPrint} />
      Imprimer
    </button>
  );
}
