import React, { useState } from 'react';
import axios from 'axios';

interface UnscheduledModule {
  moduleLabel: string;
  reason: string;
}

interface GroupResult {
  groupCode: string;
  unscheduledModules: UnscheduledModule[];
}

interface TimetableFrenchReportProps {
  groupCode: string;
  apiBaseUrl?: string; // Optionally override API base URL
  unscheduledModules?: UnscheduledModule[]; // For direct rendering/testing
  groupResults?: GroupResult[]; // For exporting global report as PDF
}

const TimetableFrenchReport: React.FC<TimetableFrenchReportProps> = ({ groupCode, apiBaseUrl = '/api/v1', unscheduledModules, groupResults }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${apiBaseUrl}/timetable/report/${groupCode}`);
      setReport(res.data.report);
    } catch (err: any) {
      setError('Erreur lors de la récupération du rapport.');
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = async () => {
    if (!groupResults) return;
    setExporting(true);
    setError(null);
    try {
      const res = await axios.post(
        `${apiBaseUrl}/timetable/report/pdf`,
        { groupResults },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'rapport_global.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError('Erreur lors de l\'export PDF.');
    } finally {
      setExporting(false);
    }
  };

  const removeReport = () => {
    setReport(null);
    setError(null);
  };

  // If unscheduledModules is provided, render the report directly (for demo/testing)
  if (unscheduledModules) {
    const demoReport = [
      unscheduledModules.length === 0
        ? `Succès : Tous les modules sont planifiés pour le groupe ${groupCode}.`
        : `Certains modules n'ont pas pu être planifiés pour le groupe ${groupCode} :`,
      ...unscheduledModules.map(
        m => `- Module '${m.moduleLabel}' non planifié car ${m.reason}.`
      ),
    ].join('\n');
    return (
      <div>
        <pre
          className={`mt-4 p-4 rounded border ${unscheduledModules.length === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {demoReport}
        </pre>
        {groupResults && (
          <button
            onClick={exportPdf}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 mt-4"
            disabled={exporting}
          >
            {exporting ? 'Export en cours...' : 'Exporter le rapport global en PDF'}
          </button>
        )}
        <button
          onClick={removeReport}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 mt-4 ml-2"
        >
          Supprimer le rapport
        </button>
      </div>
    );
  }

  return (
    <div className="my-4">
      <button
        onClick={fetchReport}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        disabled={loading}
      >
        {loading ? 'Chargement...' : 'Voir le rapport'}
      </button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
      {report && (
        <>
          <pre
            className={`mt-4 p-4 rounded border ${report.startsWith('Succès') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {report}
          </pre>
          <button
            onClick={removeReport}
            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 mt-4 ml-2"
          >
            Supprimer le rapport
          </button>
        </>
      )}
      {groupResults && (
        <button
          onClick={exportPdf}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 mt-4"
          disabled={exporting}
        >
          {exporting ? 'Export en cours...' : 'Exporter le rapport global en PDF'}
        </button>
      )}
    </div>
  );
};

export default TimetableFrenchReport; 