import { useState, useEffect } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import Input from "../components/Input"
import api from "../api/apiConfig"
import { useAuth } from "../App"
const logo = new URL("../assets/logo.png", import.meta.url).href;

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: ''
  })

  const [errors, setErrors] = useState('')
  const [showRegisterButton, setShowRegisterButton] = useState(false)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()
  const { login, isAuth } = useAuth()

  useEffect(() => {
    loadSettings();
  }, []);

  // Redirect if already logged in - only run once on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // Handle successful login
  useEffect(() => {
    if (isAuth) {
      navigate('/', { replace: true });
    }
  }, [isAuth, navigate]);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      const registerSetting = res.data.find((setting: any) => setting.key === 'show_register_button');

      // Check if there are any administrators
      const adminCheck = await api.get('/administrators/count');
      const hasAdministrators = adminCheck.data && adminCheck.data.count > 0;

      // Show register button if setting is true OR if there are no administrators
      if (registerSetting) {
        setShowRegisterButton(registerSetting.value === 'true' || !hasAdministrators);
      } else {
        // If no setting exists, show register button if no administrators
        setShowRegisterButton(!hasAdministrators);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Default to showing register button if settings fail to load
      setShowRegisterButton(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setErrors('')
  }

  const handleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setErrors('');

    if (!formData.email || !formData.password) {
      setErrors('Please enter both email and password');
      return;
    }

    try {
      const res = await api.post('/login', formData);

      if (res?.data?.token) {
        // Save user data to localStorage
        localStorage.setItem('administrator', JSON.stringify(res.data.administrator));

        // Use the login function from context - this will save token and update state
        login(res.data.token);
        // The navigation will be handled by the isAuth effect
      }
    } catch (err: any) {
      console.error('Login error:', err);

      if (err.response) {
        // Server responded with error
        if (err.response.status === 401) {
          setErrors('Invalid email or password');
        } else if (err.response.data && err.response.data.message) {
          setErrors(err.response.data.message);
        } else {
          setErrors('An error occurred during login. Please try again.');
        }
      } else if (err.request) {
        // Request was made but no response received
        setErrors('Unable to connect to server. Please check your internet connection.');
      } else {
        // Something else happened
        setErrors('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="w-full h-[100vh] flex justify-center items-center bg-gray-50">
      <div className="lg:w-[80%] lg:h-[80vh] flex w-[90%] h-[90vh] rounded shadow-2xl shadow-gray-400 border-gray-600 bg-white">
        <div className="w-[50%] bg-gray-300 p-10 flex justify-center items-center h-full">
          <div className="mb-30 h-fit">
            <img className="lg:w-50 w-30 mx-auto my-5" src={logo} alt="" />
            <h1 className="lg:text-5xl text-xl uppercase text-center font-semibold text-gray-900">Ista Cité De L'air</h1>
            <h1 className="text-blue-500 lg:text-4xl text-xl lg:mt-8 mt-4 font-bold">Générer Les Emplois Du Temps</h1>
            <p className="text-center mt-5 mb-10 font-semibold text-gray-700">Bienvenue ! Veuillez vous connecter pour continuer.</p>
            {loading ? (
              <div className="flex flex-col items-center justify-center" data-testid="auth-loading">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-4 border-blue-500 mb-4"></div>
                <h2 className="text-gray-600 font-semibold italic">Chargement...</h2>
              </div>
            ) : showRegisterButton && (
              <div className="flex justify-center">
                <NavLink to={'/register'} className={"bg-blue-500 hover:bg-blue-600 lg:py-3 py-2 px-10 rounded-md text-white transition-colors"} >
                  Register
                </NavLink>
              </div>
            )}
          </div>
        </div>
        <div className="w-[50%] flex justify-between items-center h-full bg-white">
          <div className="lg:w-[65%] w-[90%] mx-auto p-5 rounded-xl lg:h-[60%]">
            <h2 className="lg:text-5xl text-4xl font-bold text-center text-gray-900">Login</h2>
            <form action="" className="mt-5">
              {errors && (
                <p className="text-red-500 text-center bg-red-200 p-2 rounded border border-red-300">{errors}</p>
              )}
              <div className="lg:my-5">
                <label htmlFor="email" className="text-gray-700 font-medium">Email</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your Email"
                  id="email"
                  className="w-full"
                />
              </div>
              <div className="lg:my-5">
                <label htmlFor="password" className="text-gray-700 font-medium">Password</label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  id="password"
                  className="w-full"
                />
              </div>
              <button
                type="button"
                onClick={handleLogin}
                className="text-center bg-blue-500 hover:bg-blue-600 text-white lg:font-bold hover:cursor-pointer shadow-2xl shadow-blue-200 px-5 text-xl rounded-full w-full my-5 lg:py-3 py-2 transition-colors"
              >
                Login
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}