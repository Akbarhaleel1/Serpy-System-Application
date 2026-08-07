import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Eye, EyeOff, Shield, Users, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { OTPVerification } from "@/components/auth/OTPVerification";
import { apiFetch, isDesktop } from "@/lib/apiClient";

export default function Auth() {
  const { user, signIn, signUp, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    companyName: "",
  });

  // Redirect if already authenticated
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signIn(formData.email, formData.password);
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await apiFetch(`/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          fullName: formData.fullName,
          phone: formData.phone,
          companyName: formData.companyName
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowOTPVerification(true);
      } else {
        // Show error message from server
        alert(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleBackToSignup = () => {
    setShowOTPVerification(false);
  };

  // Show OTP verification component if needed
  if (showOTPVerification) {
    return (
      <OTPVerification
        email={formData.email}
        fullName={formData.fullName}
        phone={formData.phone}
        companyName={formData.companyName}
        password={formData.password}
        onBack={handleBackToSignup}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-orange-50/30 to-white">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-orange-300/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-100/30 rounded-full blur-2xl animate-pulse delay-500" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 md:p-8 py-8 md:py-16">
        <div className="w-full max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            
            {/* Left Side - Branding */}
            <div className="hidden lg:flex flex-col justify-center order-1">
              <div className="space-y-8">
                <div className="flex items-center space-x-4">
                  <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl shadow-orange-500/30">
                    <Building2 className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-gray-900">SerpY</h1>
                    <p className="text-sm text-orange-600 font-medium tracking-wider uppercase">Enterprise ERP</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-2xl text-gray-700 font-light leading-relaxed">
                    Streamline your business with intelligent automation
                  </p>
                  <p className="text-gray-500 leading-relaxed">
                    Manage customers, jobs, inventory, and more with our comprehensive ERP solution designed for modern businesses.
                  </p>
                </div>

                {/* Feature Cards */}
                <div className="space-y-4 mt-8">
                  <div className="flex items-center space-x-4 p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-orange-100/50 shadow-lg shadow-orange-100/20 hover:shadow-xl hover:shadow-orange-200/30 transition-all duration-300">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex-shrink-0 shadow-md">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 text-base">
                        Team Collaboration
                      </h3>
                      <p className="text-sm text-gray-500">
                        Seamless teamwork across departments
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-orange-100/50 shadow-lg shadow-orange-100/20 hover:shadow-xl hover:shadow-orange-200/30 transition-all duration-300">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex-shrink-0 shadow-md">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 text-base">
                        Real-time Analytics
                      </h3>
                      <p className="text-sm text-gray-500">Data-driven business insights</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex justify-center w-full order-2 lg:order-2">
              <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardHeader className="text-center pb-6 md:pb-8 pt-8 md:pt-10 px-6 md:px-8 bg-gradient-to-br from-orange-50 to-white">
                  <div className="lg:hidden flex justify-center mb-4 md:mb-6 p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl shadow-orange-500/30">
                    <Building2 className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    Welcome Back
                  </CardTitle>
                  <p className="text-sm md:text-base text-gray-500">
                    Sign in to access your ERP dashboard
                  </p>
                </CardHeader>
                <CardContent className="px-6 md:px-8 pb-8 md:pb-10">
                  <Tabs defaultValue="signin" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6 md:mb-8 bg-gradient-to-r from-orange-50 to-orange-100/50 backdrop-blur-xl p-1 rounded-2xl border border-orange-200/50 shadow-sm">
                      <TabsTrigger
                        value="signin"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600 hover:text-white hover:shadow-lg hover:shadow-orange-500/30 text-gray-600 data-[state=active]:text-white font-medium rounded-xl transition-all duration-300"
                      >
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger
                        value="signup"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600 hover:text-white hover:shadow-lg hover:shadow-orange-500/30 text-gray-600 data-[state=active]:text-white font-medium rounded-xl transition-all duration-300"
                      >
                        Sign Up
                      </TabsTrigger>
                    </TabsList>

                  <TabsContent value="signin" className="space-y-4 md:space-y-5">
                    <form onSubmit={handleSignIn} className="space-y-4 md:space-y-5">
                      <div className="space-y-2 md:space-y-3">
                        <Label
                          htmlFor="signin-email"
                          className="text-sm font-semibold text-gray-700 uppercase tracking-wide"
                        >
                          Email Address
                        </Label>
                        <Input
                          id="signin-email"
                          name="email"
                          type="email"
                          placeholder="john@enterprise.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="h-12 md:h-14 bg-white border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl md:rounded-2xl px-4 md:px-5 text-base md:text-lg transition-all duration-300"
                        />
                      </div>
                      <div className="space-y-2 md:space-y-3">
                        <Label
                          htmlFor="signin-password"
                          className="text-sm font-semibold text-gray-700 uppercase tracking-wide"
                        >
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="signin-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your secure password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            className="h-12 md:h-14 bg-white border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 pr-12 md:pr-14 rounded-xl md:rounded-2xl px-4 md:px-5 text-base md:text-lg transition-all duration-300"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 md:right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 md:h-10 md:w-10 hover:bg-orange-100/50 text-gray-400 hover:text-gray-600 rounded-lg md:rounded-xl transition-all duration-300"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 md:h-5 md:w-5" />
                            ) : (
                              <Eye className="h-4 w-4 md:h-5 md:w-5" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full h-12 md:h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 font-semibold text-white text-base md:text-lg rounded-xl md:rounded-2xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-300 transform hover:scale-[1.01] tracking-wide"
                        disabled={isLoading}
                      >
                        {isLoading
                          ? "Authenticating..."
                          : "Sign In"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-4 md:space-y-5">
                    {/* This page is only reachable on desktop once a licence is
                        active, so there is nothing here to sign up for: the
                        owner account was made at setup, and every other login
                        is created from inside the app. */}
                    {isDesktop() ? (
                      <div className="space-y-3 rounded-2xl border-2 border-orange-100 bg-orange-50/40 p-5">
                        <p className="text-sm font-semibold text-gray-900">
                          SerpY is already set up on this computer
                        </p>
                        <p className="text-sm text-gray-600">
                          Sign in with your email and password. If you do not have a
                          login yet, ask your administrator to create one for you under
                          User Management.
                        </p>
                      </div>
                    ) : (
                    <form onSubmit={handleSignUp} className="space-y-4 md:space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="signup-name"
                            className="text-xs font-semibold text-gray-700 uppercase tracking-wider"
                          >
                            Full Name
                          </Label>
                          <Input
                            id="signup-name"
                            name="fullName"
                            type="text"
                            placeholder="John Anderson"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            required
                            className="h-12 md:h-14 bg-white border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl md:rounded-2xl px-4 md:px-5 text-base md:text-lg transition-all duration-300"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="signup-phone"
                            className="text-xs font-semibold text-gray-700 uppercase tracking-wider"
                          >
                            Phone (Optional)
                          </Label>
                          <Input
                            id="signup-phone"
                            name="phone"
                            type="tel"
                            placeholder="+1 234 567 8900"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="h-12 md:h-14 bg-white border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl md:rounded-2xl px-4 md:px-5 text-base md:text-lg transition-all duration-300"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="signup-email"
                          className="text-xs font-semibold text-gray-700 uppercase tracking-wider"
                        >
                          Email Address
                        </Label>
                        <Input
                          id="signup-email"
                          name="email"
                          type="email"
                          placeholder="john@enterprise.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="h-12 md:h-14 bg-white border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl md:rounded-2xl px-4 md:px-5 text-base md:text-lg transition-all duration-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="signup-password"
                          className="text-xs font-semibold text-gray-700 uppercase tracking-wider"
                        >
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a strong password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            minLength={6}
                            className="h-12 md:h-14 bg-white border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 pr-12 md:pr-14 rounded-xl md:rounded-2xl px-4 md:px-5 text-base md:text-lg transition-all duration-300"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 md:right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 md:h-10 md:w-10 hover:bg-orange-100/50 text-gray-400 hover:text-gray-600 rounded-lg md:rounded-xl transition-all duration-300"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 md:h-5 md:w-5" />
                            ) : (
                              <Eye className="h-4 w-4 md:h-5 md:w-5" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="signup-company"
                          className="text-xs font-semibold text-gray-700 uppercase tracking-wider"
                        >
                          Company Name (Optional)
                        </Label>
                        <Input
                          id="signup-company"
                          name="companyName"
                          type="text"
                          placeholder="Acme Corporation"
                          value={formData.companyName}
                          onChange={handleInputChange}
                          className="h-12 md:h-14 bg-white border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl md:rounded-2xl px-4 md:px-5 text-base md:text-lg transition-all duration-300"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full h-12 md:h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 font-semibold text-white text-base md:text-lg rounded-xl md:rounded-2xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-300 transform hover:scale-[1.01] tracking-wide"
                        disabled={isLoading}
                      >
                        {isLoading
                          ? "Sending OTP..."
                          : "Create Account"}
                      </Button>
                    </form>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pt-6 md:pt-8 pb-4 px-4">
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-600 font-medium">
              © 2026 Synx Automation Private Limited. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3 text-xs">
              <Link
                to="/terms-and-conditions"
                className="text-gray-600 hover:text-orange-600 transition-colors duration-200 font-medium hover:underline underline-offset-2"
              >
                Terms & Conditions
              </Link>
              <span className="text-gray-300">•</span>
              <Link
                to="/privacy-policy"
                className="text-gray-600 hover:text-orange-600 transition-colors duration-200 font-medium hover:underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              <span className="text-gray-300">•</span>
              <Link
                to="/data-security-policy"
                className="text-gray-600 hover:text-orange-600 transition-colors duration-200 font-medium hover:underline underline-offset-2"
              >
                Data Security Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
