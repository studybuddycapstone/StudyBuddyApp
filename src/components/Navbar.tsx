import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const navLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/profile", label: "Profile" },
  { to: "/matches", label: "Find Matches" },
  { to: "/connections", label: "Connections" },
];

export default function Navbar() {
  const { user, logoutUser, isDemo } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const authPages = ["/", "/signup"];
  if (!user || authPages.includes(location.pathname)) return null;

  const handleLogout = () => {
    logoutUser();
    navigate("/");
  };

  return (
    <nav className="bg-white shadow-md border-b border-green-100">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="text-xl font-bold text-green-700 no-underline">
          StudyBuddy
        </Link>

        <div className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium no-underline transition-colors ${
                  isActive
                    ? "bg-green-100 text-green-800"
                    : "text-gray-600 hover:bg-green-50 hover:text-green-700"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {user.firstName}
          </span>
          {isDemo && (
            <button
              onClick={() => {
                localStorage.removeItem("studybuddy_demo");
                window.location.href = "/";
              }}
              className="px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
            >
              Reset Demo
            </button>
          )}
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
