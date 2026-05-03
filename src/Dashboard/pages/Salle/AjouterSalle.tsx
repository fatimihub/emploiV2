import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Input from "../../../components/Input";
import { faPlus, faUserPlus, faTimes } from "@fortawesome/free-solid-svg-icons";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";
import { useEffect, useState } from "react";
import api from "../../../api/apiConfig";
import { useNavigate } from "react-router-dom";
import PopupSuccess from "../../../components/PopupSuccess";
import PopupError from "../../../components/PopupError";

interface Formateur {
  id: number;
  name: string;
}

export default function AjouterSalle() {
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [formData, setFormData] = useState({
    label: "",
    formateur1: "",
    formateur2: "",
  });
  const [showFormateurModal, setShowFormateurModal] = useState(false);
  const [newFormateur, setNewFormateur] = useState({ name: "", mle_formateur: "" });
  const [isSubmittingFormateur, setIsSubmittingFormateur] = useState(false);
  const [popupSuccess, setPopupSuccess] = useState(false);
  const [popupError, setPopupError] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const res = await api.get("/formateurs");
      if (res && res.data) {
        setFormateurs(res.data);
      }
    } catch (err) {}
  };

  const addSalle = async () => {
    try {
      const res = await api.post("/add-classroom", formData);
      if (res && res.data) {
        navigate("/administrateur/salles");
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.errors || "Erreur lors de l'ajout de la salle");
      setPopupError(true);
    }
  };

  const handleAddFormateur = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFormateur(true);
    try {
      const res = await api.post("/formateurs", newFormateur);
      if (res && res.data) {
        setMessage("Formateur ajouté avec succès");
        setPopupSuccess(true);
        setShowFormateurModal(false);
        setNewFormateur({ name: "", mle_formateur: "" });
        await fetchData(); // Refresh list
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.errors || "Erreur lors de l'ajout du formateur");
      setPopupError(true);
    } finally {
      setIsSubmittingFormateur(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    fetchData();
  }, []);


  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-50 to-white py-10 relative">
      <div className="w-full p-6 flex items-center justify-start">
        <ButtonNavigateBack />
      </div>
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8 relative">
        <h1 className="text-blue-600 text-center text-3xl font-extrabold mb-8 tracking-tight">
          Ajouter une salle
        </h1>
        <form
          className="space-y-6"
          onSubmit={e => { e.preventDefault(); addSalle(); }}
        >
          <div>
            <label htmlFor="label" className="block text-gray-700 font-semibold mb-2">
              Numéro de salle
            </label>
            <Input
              type="text"
              id="salle-label"
              placeholder="Nom de la salle"
              className="w-full bg-gray-50 border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-4 py-3 text-lg transition"
              name="label"
              onChange={handleChange}
              value={formData.label}
            />
          </div>

          <div className="space-y-4">
             <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor="formateur1" className="block text-gray-700 font-semibold mb-2">
                    Formateur 1
                  </label>
                  <select
                    onChange={handleChange}
                    name="formateur1"
                    value={formData.formateur1}
                    className="w-full bg-gray-50 border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-4 py-3 text-lg transition"
                  >
                    <option value="">Choisissez le formateur 1</option>
                    {formateurs &&
                      formateurs.map((formateur) => (
                        <option key={formateur.id} value={formateur.id}>
                          {formateur.name}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFormateurModal(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg flex items-center justify-center transition"
                  title="Ajouter un formateur"
                >
                  <FontAwesomeIcon icon={faUserPlus} />
                </button>
             </div>

             <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor="formateur2" className="block text-gray-700 font-semibold mb-2">
                    Formateur 2
                  </label>
                  <select
                    onChange={handleChange}
                    name="formateur2"
                    value={formData.formateur2}
                    className="w-full bg-gray-50 border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-4 py-3 text-lg transition"
                  >
                    <option value="">Choisissez le formateur 2</option>
                    {formateurs &&
                      formateurs.map((formateur) => (
                        <option key={formateur.id} value={formateur.id}>
                          {formateur.name}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFormateurModal(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg flex items-center justify-center transition"
                  title="Ajouter un formateur"
                >
                  <FontAwesomeIcon icon={faUserPlus} />
                </button>
             </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition text-white text-xl font-bold py-3 rounded-lg shadow-md mt-4 focus:outline-none focus:ring-2 focus:ring-green-300"
          >
            <FontAwesomeIcon icon={faPlus} />
            Ajouter
          </button>
        </form>
      </div>

      {/* Quick Add Formateur Modal */}
      {showFormateurModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFormateurModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowFormateurModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
            <h2 className="text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
              <FontAwesomeIcon icon={faUserPlus} />
              Ajouter un formateur
            </h2>
            <form onSubmit={handleAddFormateur} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Matricule (MLE)</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-100 outline-none"
                  value={newFormateur.mle_formateur}
                  onChange={e => setNewFormateur({ ...newFormateur, mle_formateur: e.target.value })}
                  placeholder="Ex: MLE123"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Nom complet</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-100 outline-none"
                  value={newFormateur.name}
                  onChange={e => setNewFormateur({ ...newFormateur, name: e.target.value })}
                  placeholder="Ex: Jean Dupont"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFormateurModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFormateur}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition disabled:bg-gray-400"
                >
                  {isSubmittingFormateur ? "Ajout..." : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PopupSuccess
        afficherPopupSuccess={popupSuccess}
        messageSuccess={message}
        setAfficherPopupSuccess={setPopupSuccess}
      />
      <PopupError
        afficherPopupError={popupError}
        errors={errorMsg}
        setAfficherPopupError={setPopupError}
      />
    </div>
  );
}
