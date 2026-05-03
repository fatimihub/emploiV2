import { NavLink } from "react-router-dom";
import Button from "../../../components/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudArrowUp,
  faHouse,
  faPlus,
  faSpinner,
  faEdit,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useRef, useState } from "react";
import PopupSuccess from "../../../components/PopupSuccess";
import PopupError from "../../../components/PopupError";
import api from "../../../api/apiConfig";
import { useCallback } from "react";

interface Salle {
  id: number;
  label: string;
  formateur1: string;
  formateur2: string;
}

interface Formateur {
  id: number;
  name: string;
}

function SwapFormateurModal({
  isOpen,
  onClose,
  classroomId,
  formateurs,
  currentFormateurs,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  classroomId: number;
  formateurs: Formateur[];
  currentFormateurs: { id: number; name: string }[];
  onSuccess: () => void;
}) {
  const [oldFormateurId, setOldFormateurId] = useState("");
  const [newFormateurId, setNewFormateurId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSwap = async () => {
    if (!oldFormateurId || !newFormateurId) {
      setError("Veuillez sélectionner les deux formateurs.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/update-formateur-in-classroom", {
        classroomId,
        oldFormateurId,
        newFormateurId
      });
      if (res && res.data) {
        setSuccess(res.data.message);
        setTimeout(() => {
          setSuccess("");
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err?.response?.data?.errors || "Erreur lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 min-w-[350px] relative">
        <h2 className="text-xl font-bold mb-4">Remplacer un formateur</h2>
        <div className="mb-3">
          <label className="block font-medium mb-1">Formateur à remplacer</label>
          <select
            className="w-full border rounded px-2 py-2"
            value={oldFormateurId}
            onChange={e => setOldFormateurId(e.target.value)}
          >
            <option value="">Choisir...</option>
            {currentFormateurs.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Nouveau formateur</label>
          <select
            className="w-full border rounded px-2 py-2"
            value={newFormateurId}
            onChange={e => setNewFormateurId(e.target.value)}
          >
            <option value="">Choisir...</option>
            {formateurs.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {success && <div className="text-green-600 mb-2">{success}</div>}
        <div className="flex justify-end gap-2 mt-4">
          <Button label="Annuler" onClick={onClose} className="bg-gray-400" />
          <Button label={loading ? "Mise à jour..." : "Mettre à jour"} onClick={handleSwap} className="bg-green-600" />
        </div>
      </div>
    </div>
  );
}

export default function Salles() {
  const [errors, setErrors] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState("");
  const [afficherPopupSuccess, setAfficherPopupSuccess] = useState(false);
  const [afficherPopupError, setAfficherPopupError] = useState(false);
  const [fileKey, setFileKey] = useState(Date.now());
  const fileinputRef = useRef<HTMLInputElement>(null);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [sallesFilter, setSallesFilter] = useState<Salle[]>([]);
  const [valueInputSearch, setValueInputSearch] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAvailable, setEditAvailable] = useState(true);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapClassroomId, setSwapClassroomId] = useState<number | null>(null);
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [currentFormateurs, setCurrentFormateurs] = useState<{ id: number; name: string }[]>([]);

  const handleImportFileExcelDataClassrooms = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      setLoading(true);
      const formData = new FormData();
      if (e.target.files) {
        formData.append("file", e.target.files[0]);
      }

      const res = await api.post("/import-data-classroom", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res && res.data) {
        setLoading(false);
        setAfficherPopupSuccess(true);
        setMessageSuccess(
          res.data.message || "Importation des salles réussie"
        );
        // Refresh the list after successful import
        fetchSalles();
      }
    } catch (err: any) {
      console.error('Import error:', err);

      // Handle different error response formats
      let errorMessage = "Erreur lors de l'importation des salles";

      if (err.response) {
        // Handle array of errors
        if (Array.isArray(err.response.data?.errors)) {
          errorMessage = err.response.data.errors.join('\n');
        }
        // Handle single error message
        else if (err.response.data?.errors) {
          errorMessage = err.response.data.errors;
        }
        // Handle other error formats
        else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setErrors(errorMessage);
      setAfficherPopupError(true);
    } finally {
      setLoading(false);
      if (fileinputRef.current) {
        fileinputRef.current.value = "";
      }
      setFileKey(Date.now());
    }
  };

  const handleEdit = (salle: Salle) => {
    setEditId(salle.id);
    setEditLabel(salle.label);
    setEditAvailable((salle as any).is_available ?? true);
  };

  const handleUpdate = async (id: number) => {
    try {
      setLoading(true);
      const res = await api.put(`/classrooms/${id}`, {
        label: editLabel,
        is_available: editAvailable,
      });
      if (res && res.data && res.data.message) {
        setAfficherPopupSuccess(true);
        setMessageSuccess("Salle mise à jour avec succès");
        setEditId(null);
        fetchSalles();
      }
    } catch (err) {
      setAfficherPopupError(true);
      setErrors("Erreur lors de la mise à jour de la salle");
    } finally {
      setLoading(false);
    }
  };




  // handle fetch les salles
  const fetchSalles = async () => {
    try {
      const res = await api.get("/classrooms");
      if (res && res.data) {
        setSalles(res.data);
        setSallesFilter(res.data);
      }
    } catch (err) {
      // console.log("Error", err);
    }
  };

  // handle search les salle by label salle
  const handleSearchSalle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const label = e.target.value;
    setValueInputSearch(label);
    const sallesAfterFilter = salles.filter((salle) =>
      salle.label.toLowerCase().includes(label.toLowerCase())
    );
    setSallesFilter(sallesAfterFilter);
    if (label.trim() == "") {
      setSallesFilter(salles);
    }
  };

  // Fetch all formateurs for swap modal
  const fetchFormateurs = useCallback(async () => {
    try {
      const res = await api.get("/formateurs");
      if (res && res.data) setFormateurs(res.data);
    } catch (err) {
      console.error('Error fetching formateurs:', err);
    }
  }, []);

  // Open swap modal
  const handleOpenSwapModal = (salle: Salle) => {
    setSwapClassroomId(salle.id);
    // Assume salle.formateur1 and formateur2 are names, need to map to ids
    // For demo, fetch all formateurs and match by name
    fetchFormateurs();
    setCurrentFormateurs([
      { id: Number(salle.formateur1), name: salle.formateur1 },
      { id: Number(salle.formateur2), name: salle.formateur2 },
    ]);
    setShowSwapModal(true);
  };

  const handleSwapSuccess = () => {
    fetchSalles();
  };

  useEffect(() => {
    if (afficherPopupSuccess) {
      setTimeout(() => {
        setAfficherPopupSuccess(false);
      }, 3000);
    }
    if (afficherPopupError) {
      setTimeout(() => {
        setAfficherPopupError(false);
      }, 3000);
    }

    fetchSalles();
  }, [afficherPopupSuccess, afficherPopupError]);
  return (
    <div className="lg:w-[96%] h-full p-10 ">
      <div className="flex justify-between items-center">
        <h1 className="lg:text-3xl flex items-center  font-bold">
          <FontAwesomeIcon className="text-blue-500 mr-2" icon={faHouse} />
          Salles
        </h1>
        <div className=" ">
          <label
            htmlFor="file"
            className="mx-2 lg:px-8 px-3 lg:py-3 py-2 font-bold hover:cursor-pointer rounded-md bg-blue-500 !text-white shadow-xl"
          >
            {loading ? (
              <FontAwesomeIcon
                className=" lg:text-xl  mr-2 "
                icon={faSpinner}
                spin
              />
            ) : (
              <FontAwesomeIcon
                className=" lg:text-xl  mr-2 "
                icon={faCloudArrowUp}
              />
            )}
            Importation
            <input
              className="hidden"
              accept=".xlsx,.xls"
              ref={fileinputRef}
              onChange={handleImportFileExcelDataClassrooms}
              type="file"
              key={fileKey}
              name="file"
              id="file"
            />
          </label>
          <NavLink
            className={
              "mx-2 lg:px-5 px-3 lg:py-3 py-2 font-bold rounded-md bg-green-500 text-white shadow-xl"
            }
            to={"/administrateur/ajouter-salle"}
          >
            <FontAwesomeIcon
              className=" lg:text-xl font-bold  mr-3 "
              icon={faPlus}
            />
            Ajouter
          </NavLink>
        </div>
      </div>
      <div>
        <input
          type="search"
          placeholder="Enter label salle..."
          className="bg-gray-100 px-5 py-2  lg:w-[30%] mt-5 shadow-xl"
          onChange={handleSearchSalle}
          value={valueInputSearch}
        />
        <Button
          label="chercher"
          onClick={() => { }}
          className="bg-blue-500 text-white px-4"
        />
      </div>
      <table className="w-full my-5">
        <thead>
          <tr className=" bg-gray-300 ">
            <th className=" lg:py-3 py-2 px-4 font-bold border">ID</th>
            <th className=" lg:py-3 py-2 px-4 font-bold border">label salle</th>
            <th className=" lg:py-3 py-2 px-4 font-bold border">Formateur 1</th>
            <th className=" lg:py-3 py-2 px-4 font-bold border">Formateur 2</th>
            <th className=" lg:py-3 py-2 px-4 font-bold border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sallesFilter &&
            sallesFilter.map((salle) => {
              const isEditing = editId === salle.id;
              return (
                <tr key={salle.id}>
                  <td className=" lg:py-3 py-2 px-4 font-bold border">{salle.id}</td>
                  <td className=" lg:py-3 py-2 px-4 font-bold border">
                    {isEditing ? (
                      <input
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        className="border px-2 py-1 rounded"
                      />
                    ) : (
                      salle.label
                    )}
                  </td>
                  <td className=" lg:py-3 py-2 px-4 font-bold border">{salle.formateur1}</td>
                  <td className=" lg:py-3 py-2 px-4 font-bold border">{salle.formateur2}</td>
                  <td className=" lg:py-3 py-2 px-4 font-bold border">
                    {isEditing ? (
                      <>
                        <select
                          value={editAvailable ? "1" : "0"}
                          onChange={e => setEditAvailable(e.target.value === "1")}
                          className="border px-2 py-1 rounded mx-2"
                        >
                          <option value="1">Disponible</option>
                          <option value="0">Non disponible</option>
                        </select>
                        <Button
                          label="Enregistrer"
                          onClick={() => handleUpdate(salle.id)}
                          className="bg-green-500 text-white px-2 mx-1"
                        />
                        <Button
                          label="Annuler"
                          onClick={() => setEditId(null)}
                          className="bg-gray-400 text-white px-2 mx-1"
                        />
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleEdit(salle)}
                          className="bg-yellow-500 text-white px-2 mx-1"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </Button>
                        <Button
                          onClick={() => handleOpenSwapModal(salle)}
                          className="bg-blue-600 text-white px-2 mx-1"
                        >
                          Swap Formateur
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>

      <PopupSuccess
        afficherPopupSuccess={afficherPopupSuccess}
        messageSuccess={messageSuccess}
        setAfficherPopupSuccess={setAfficherPopupSuccess}
      />
      <PopupError afficherPopupError={afficherPopupError} errors={errors} setAfficherPopupError={setAfficherPopupError} />
      <SwapFormateurModal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        classroomId={swapClassroomId ?? 0}
        formateurs={formateurs}
        currentFormateurs={currentFormateurs}
        onSuccess={handleSwapSuccess}
      />
      <div className="h-[20vh]"></div>
    </div>
  );
}
