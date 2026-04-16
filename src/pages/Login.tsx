import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../firebase/auth";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginAsDemo } = useAuth();

  // FIX 1: Allow this to handle both Form submits and Button clicks
  const handleLogin = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double-clicks
    
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // FIX 2: Make this async and await the login before navigating!
  const handleDemoLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      // Assuming loginAsDemo is an async function in your context
      await loginAsDemo();
      navigate("/dashboard");
    } catch (err) {
      console.error("Demo login failed", err);
      setError("Failed to launch demo mode.");
    }
  };

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-700 mb-2">StudyBuddy</h1>
          <p className="text-gray-500">Find your perfect study partner</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="you@gsu.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {/* FIX 1 APPLIED: Added onClick={handleLogin} here to bypass 
              the disabled-button browser bug 
            */}
            <button
              type="submit"
              onClick={handleLogin} 
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-400">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full py-3 bg-green-50 text-green-700 font-semibold rounded-full hover:bg-green-100 transition-colors border border-green-200 cursor-pointer"
          >
            Try Demo Account
          </button>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link to="/signup" className="text-green-600 font-medium hover:text-green-700 no-underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}