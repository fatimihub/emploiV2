import {
  faCalendar,
  faGear,
  faList,
  faSpinner,
  faWandMagicSparkles,
  faUserPlus,
  faHourglassHalf,
  faUsersLine,
  faUsers,
  faChalkboardTeacher,
  faDoorOpen,
  faClock,
  faTrash,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router-dom";
import Input from "../../../components/Input";
// import Button from "../../../components/Button";
import PopupError from "../../../components/PopupError";
import PopupSuccess from "../../../components/PopupSuccess";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/apiConfig";
import SectionCard from '../../../components/SectionCard';
import { useAuth } from "../../../App";

const logo = new URL("../../../assets/logo.png", import.meta.url).href;

export default function Parameter() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [errors, setErrors] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState("");
  const [afficherPopupSuccess, setAfficherPopupSuccess] = useState(false);
  const [afficherPopupError, setAfficherPopupError] = useState(false);
  const [showRegisterButton, setShowRegisterButton] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // New state for maximum hours
  const [maxPresentialHours, setMaxPresentialHours] = useState("35");
  const [maxRemoteHours, setMaxRemoteHours] = useState("10");
  const [hoursLoading, setHoursLoading] = useState(false);

  // Database reset state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
    loadHoursSettings();
  }, []);

  interface Setting {
    key: string;
    value: string;
    description?: string;
  }
  const loadSettings = async () => {
    try {
      setSettingsLoading(true);
      const res = await api.get('/settings');
      const registerSetting = (res.data as Setting[]).find((setting) => setting.key === 'show_register_button');
      if (registerSetting) {
        setShowRegisterButton(registerSetting.value === 'true');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadHoursSettings = async () => {
    try {
      setHoursLoading(true);
      const res = await api.get('/settings');
      const presentialSetting = (res.data as Setting[]).find((setting) => setting.key === 'max_presential_hours');
      const remoteSetting = (res.data as Setting[]).find((setting) => setting.key === 'max_remote_hours');

      if (presentialSetting) {
        setMaxPresentialHours(presentialSetting.value);
      }
      if (remoteSetting) {
        setMaxRemoteHours(remoteSetting.value);
      }
    } catch (error) {
      console.error('Error loading hours settings:', error);
    } finally {
      setHoursLoading(false);
    }
  };

  const handleToggleRegisterButton = async () => {
    try {
      setSettingsLoading(true);
      const newValue = !showRegisterButton;
      await api.post('/settings', {
        key: 'show_register_button',
        value: newValue.toString(),
        description: 'Enable or disable the register button on login page'
      });
      setShowRegisterButton(newValue);
      setAfficherPopupSuccess(true);
      setMessageSuccess(`Register button ${newValue ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error updating setting:', error);
      setAfficherPopupError(true);
      setErrors('Failed to update setting');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleUpdateHours = async () => {
    const presential = parseInt(maxPresentialHours);
    const remote = parseInt(maxRemoteHours);
    const total = presential + remote;

    if (total > 50) {
      setAfficherPopupError(true);
      setErrors(`Le total des heures ne peut pas dépasser 50. Total actuel: ${total}`);
      return;
    }

    if (presential < 0 || remote < 0) {
      setAfficherPopupError(true);
      setErrors("Les heures ne peuvent pas être négatives");
      return;
    }

    try {
      setHoursLoading(true);

      // Update presential hours
      await api.post('/settings', {
        key: 'max_presential_hours',
        value: maxPresentialHours,
        description: 'Maximum presential hours per week'
      });

      // Update remote hours
      await api.post('/settings', {
        key: 'max_remote_hours',
        value: maxRemoteHours,
        description: 'Maximum remote hours per week'
      });

      setAfficherPopupSuccess(true);
      setMessageSuccess('Les heures maximales ont été mises à jour avec succès');
    } catch (error) {
      console.error('Error updating hours settings:', error);
      setAfficherPopupError(true);
      setErrors('Erreur lors de la mise à jour des heures maximales');
    } finally {
      setHoursLoading(false);
    }
  };

  const handleGenererLesEmploisDuTempsDesFormateur = async () => {
    try {
      setLoading(true);
      setErrors(''); // Reset errors
      const res = await api.post("/generate-timetable-formateurs");

      if (res?.data?.message) {
        setAfficherPopupSuccess(true);
        setMessageSuccess(res.data.message);
        handleNotification("Générer les emplois du temps", res.data.message);
      }
    } catch (err: unknown) {
      let errorMessage = 'Une erreur est survenue lors de la génération des emplois du temps';

      // Handle Axios error response
      if (typeof err === 'object' && err !== null) {
        const axiosError = err as { response?: { data?: { message?: string; errors?: string } } };

        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.data?.errors) {
          errorMessage = Array.isArray(axiosError.response.data.errors)
            ? axiosError.response.data.errors.join('\n')
            : axiosError.response.data.errors;
        } else if (axiosError.response && typeof axiosError.response === 'object' && 'statusText' in axiosError.response) {
          errorMessage = String(axiosError.response.statusText || 'Unknown error');
        }
      }

      setErrors(errorMessage);
      setAfficherPopupError(true);
      console.error("Erreur lors de la génération des emplois du temps:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotification = (title: string, body: string) => {
    // alert('test')
    Notification.requestPermission().then(() => {
      new Notification(title, {
        body: body,
        icon: logo,
      });
    });
  };

  // Database reset functions
  const handleResetDatabase = async () => {
    if (!resetPassword.trim()) {
      setAfficherPopupError(true);
      setErrors("Le mot de passe est requis");
      return;
    }

    try {
      setResetLoading(true);
      // Get admin email from localStorage


      const res = await api.post('/reset-database', { password: resetPassword });

      if (res && res.data) {
        setAfficherPopupSuccess(true);
        setMessageSuccess("Base de données réinitialisée avec succès. Vous allez être redirigé vers la page de connexion dans 3 secondes.");
        setShowResetModal(false);
        setResetPassword("");
        // Clear auth and redirect to login after 3 seconds
        setTimeout(() => {
          logout();
          navigate('/login', { replace: true });
        }, 3000);
      }
    } catch (err: unknown) {
      setAfficherPopupError(true);
      if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'error' in err.response.data) {
        setErrors(err.response.data.error as string);
      } else {
        setErrors("Erreur lors de la réinitialisation de la base de données");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const openResetModal = () => {
    setShowResetModal(true);
    setResetPassword("");
    setErrors("");
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetPassword("");
    setErrors("");
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
  }, [afficherPopupSuccess, afficherPopupError]);
  return (
    <div className="lg:w-[93%] mx-auto h-full lg:px-10 lg:py-5 p-5 bg-gray-50 min-h-screen">
      <h1 className="lg:text-3xl font-bold text-gray-900 mb-6">
        <FontAwesomeIcon className="mr-3 text-blue-500" icon={faGear} />
        Les Parameters
      </h1>

      <SectionCard
        icon={faUsersLine}
        title="Gestion des disponibilités"
        description="Accédez aux paramètres pour les groupes en stage, les formateurs et les salles non disponibles."
      >
        <Link
          to={"/administrateur/parameters/groupes-en-stage"}
          className="block w-[400px] bg-blue-500 hover:bg-blue-600 text-white px-5 py-3 my-2 ml-10 rounded text-xl hover:cursor-pointer transition-colors flex items-center gap-3"
        >
          <FontAwesomeIcon icon={faUsers} className="text-2xl" />
          Les groupes en stage
        </Link>
        <Link
          to={"/administrateur/parameters/formateurs-no-disponible"}
          className="block w-[400px] bg-blue-500 hover:bg-blue-600 text-white px-5 py-3 my-2 ml-10 rounded text-xl hover:cursor-pointer transition-colors flex items-center gap-3"
        >
          <FontAwesomeIcon icon={faChalkboardTeacher} className="text-2xl" />
          Les formateur no disponible
        </Link>
        <Link
          to={"/administrateur/parameters/salles-no-disponible"}
          className="block w-[400px] bg-blue-500 hover:bg-blue-600 text-white px-5 py-3 my-2 ml-10 rounded text-xl hover:cursor-pointer transition-colors flex items-center gap-3"
        >
          <FontAwesomeIcon icon={faDoorOpen} className="text-2xl" />
          Les salle no disponible
        </Link>
      </SectionCard>

      <SectionCard
        icon={faList}
        title="Personnalisation des heures par groupe"
        description="Modifiez le nombre d'heures par semaine pour chaque groupe selon vos besoins."
      >
        <Link
          to={"/administrateur/parameters/liste-groupes-perso-heures"}
          className="block w-fit my-3 hover:cursor-pointer bg-blue-500 hover:bg-blue-600 px-4 mx-5 py-3 text-xl rounded text-white transition-colors"
        >
          <div className="flex items-center">
            <div>
              <FontAwesomeIcon className="mr-3 text-2xl" icon={faList} />
            </div>
            <div>
              <p>
                la liste des groupes pour persenaliser les nombres heures par
                semaine
              </p>
            </div>
          </div>
        </Link>
      </SectionCard>

      <SectionCard
        icon={faList}
        title="Personnalisation des heures par fusion"
        description="Ajustez le nombre d'heures par semaine pour chaque fusion de groupes."
      >
        <Link
          to={"/administrateur/parameters/liste-fusions"}
          className="block w-fit my-3 hover:cursor-pointer bg-blue-500 hover:bg-blue-600 px-4 mx-5 py-3 text-xl rounded text-white transition-colors"
        >
          <div className="flex items-center">
            <div>
              <FontAwesomeIcon className="mr-3 text-2xl" icon={faList} />
            </div>
            <div>
              <p>
                la liste des fuisions pour persenaliser les nombres heures par
                semaine
              </p>
            </div>
          </div>
        </Link>
      </SectionCard>

      <SectionCard
        icon={faWandMagicSparkles}
        title="Génération des emplois du temps"
        description="Lancez la génération automatique des emplois du temps pour tous les formateurs ou consultez la liste annuelle."
        className="relative"
      >
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center px-4">
          <button
            onClick={handleGenererLesEmploisDuTempsDesFormateur}
            className="flex items-center gap-3 w-full md:w-auto text-lg font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-300 px-6 py-3 rounded-lg text-white shadow transition-all duration-200 relative"
            aria-label="Générer les emplois du temps des formateurs"
            disabled={loading}
            title="Générer automatiquement les emplois du temps"
          >
            {loading ? (
              <FontAwesomeIcon className="animate-spin" icon={faSpinner} />
            ) : (
              <FontAwesomeIcon icon={faWandMagicSparkles} />
            )}
            Générer les emplois du temps
          </button>
          <span className="text-gray-400 text-sm hidden md:inline">ou</span>
          <Link
            to="/administrateur/parameters/liste-emplois-du-temps-en-annee"
            className="flex items-center gap-3 w-full md:w-auto text-lg font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:ring-2 focus:ring-green-300 px-6 py-3 rounded-lg text-white shadow transition-all duration-200"
            aria-label="Voir la liste des emplois du temps annuels"
            title="Voir la liste annuelle"
          >
            <FontAwesomeIcon icon={faList} />
            Liste annuelle des emplois du temps
          </Link>
        </div>
        <div className="absolute right-6 top-6 opacity-10 text-blue-300 text-7xl pointer-events-none select-none">
          <FontAwesomeIcon icon={faCalendar} />
        </div>
      </SectionCard>

      <SectionCard
        icon={faUserPlus}
        title="Paramètre d'inscription"
        description="Activez ou désactivez le bouton d'inscription sur la page de connexion."
      >
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <FontAwesomeIcon className="mr-3 text-blue-500 text-xl" icon={faUserPlus} />
            <div>
              <h3 className="font-semibold text-lg text-gray-900">d'inscription</h3>
              <p className="text-gray-600">
                {showRegisterButton
                  ? "Le bouton d'inscription est actuellement visible sur la page de connexion"
                  : "Le bouton d'inscription est actuellement masqué sur la page de connexion"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleToggleRegisterButton}
              disabled={settingsLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${showRegisterButton ? 'bg-blue-600' : 'bg-gray-200'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showRegisterButton ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
            {settingsLoading && (
              <FontAwesomeIcon className="ml-3 text-blue-500" icon={faSpinner} spin />
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={faHourglassHalf}
        title="Heures maximales par semaine"
        description="Définissez le nombre maximal d'heures présentielles et à distance autorisées par semaine. Le total ne peut pas dépasser 50 heures."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FontAwesomeIcon icon={faClock} className="text-blue-500" />
              Heures présentielles maximales
            </label>
            <Input
              type="number"
              name="maxPresentialHours"
              id="maxPresentialHours"
              placeholder="35"
              className=""
              value={maxPresentialHours}
              onChange={(e) => setMaxPresentialHours(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FontAwesomeIcon icon={faClock} className="text-blue-500" />
              Heures à distance maximales
            </label>
            <Input
              type="number"
              name="maxRemoteHours"
              id="maxRemoteHours"
              placeholder="10"
              className=""
              value={maxRemoteHours}
              onChange={(e) => setMaxRemoteHours(e.target.value)}
            />
          </div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg mb-4 border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Total actuel:</strong> {parseInt(maxPresentialHours) + parseInt(maxRemoteHours)} heures
            {parseInt(maxPresentialHours) + parseInt(maxRemoteHours) > 50 && (
              <span className="text-red-600 ml-2">Le total dépasse 50 heures</span>
            )}
          </p>
        </div>
        <button
          onClick={handleUpdateHours}
          disabled={hoursLoading || parseInt(maxPresentialHours) + parseInt(maxRemoteHours) > 50}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-colors text-lg shadow bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-300 ${hoursLoading || parseInt(maxPresentialHours) + parseInt(maxRemoteHours) > 50
            ? 'bg-gray-400 cursor-not-allowed'
            : ''
            }`}
        >
          {hoursLoading ? (
            <>
              <FontAwesomeIcon className="mr-2" icon={faSpinner} spin />
              Mise à jour...
            </>
          ) : (
            <>
              <FontAwesomeIcon className="mr-2" icon={faClock} />
              Mettre à jour les heures maximales
            </>
          )}
        </button>
      </SectionCard>

      <SectionCard
        icon={faExclamationTriangle}
        title="Réinitialisation de la base de données"
        description="ATTENTION: Cette action supprimera définitivement toutes les données de l'application (groupes, modules, formateurs, emplois du temps, etc.) sauf les comptes administrateurs."
      >
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-2xl mr-3 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Réinitialisation complète de la base de données
              </h3>
              <p className="text-red-700 mb-4">
                Cette action est irréversible et supprimera :
              </p>
              <ul className="text-red-700 mb-4 list-disc list-inside space-y-1">
                <li>Tous les groupes et leurs modules</li>
                <li>Tous les formateurs et leurs emplois du temps</li>
                <li>Toutes les salles et leurs disponibilités</li>
                <li>Tous les emplois du temps générés</li>
                <li>Toutes les fusions de groupes</li>
                <li>Tous les paramètres (sauf les comptes administrateurs)</li>
              </ul>
              <button
                id="reinitailisationDesDonnee"
                onClick={openResetModal}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faTrash} />
                Réinitialiser la base de données
              </button>
            </div>
          </div>
        </div>
      </SectionCard>



      {/* Reset Database Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex items-center mb-6">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-3xl mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Confirmation de réinitialisation</h2>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Pour confirmer la réinitialisation de la base de données, veuillez entrer le mot de passe administrateur :
              </p>
              <Input
                type="password"
                name="resetPassword"
                id="resetPassword"
                placeholder="Mot de passe administrateur"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="w-full"
              />

            </div>

            <div className="flex gap-3">
              <button
                onClick={closeResetModal}
                disabled={resetLoading}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                id="confirm"
                onClick={handleResetDatabase}
                disabled={resetLoading || !resetPassword.trim()}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${resetLoading || !resetPassword.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
              >
                {resetLoading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Réinitialisation...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faTrash} />
                    Confirmer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-44"></div>

      <PopupSuccess
        afficherPopupSuccess={afficherPopupSuccess}
        messageSuccess={messageSuccess}
        setAfficherPopupSuccess={setAfficherPopupSuccess}
      />
      <PopupError afficherPopupError={afficherPopupError} errors={errors}
        setAfficherPopupError={setAfficherPopupError}
      />
    </div>
  );
}
