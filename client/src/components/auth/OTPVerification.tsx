import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Shield, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiClient";

interface OTPVerificationProps {
  email: string;
  fullName: string;
  phone?: string;
  companyName?: string;
  password: string;
  onBack: () => void;
}

export function OTPVerification({ 
  email, 
  fullName, 
  phone, 
  companyName, 
  password, 
  onBack 
}: OTPVerificationProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Countdown timer
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
    setOtp(newOtp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter all 6 digits.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiFetch(`/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp: otpString,
          password,
          fullName,
          phone,
          companyName
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token if provided
        if (data.token) {
          localStorage.setItem('token', data.token);
        }

        toast({
          title: "Account Created!",
          description: "Your account has been created successfully.",
        });

        navigate('/');
      } else {
        toast({
          title: "Verification Failed",
          description: data.message || "Invalid OTP. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    setIsResending(true);

    try {
      const response = await apiFetch(`/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          fullName,
          phone,
          companyName
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "OTP Resent",
          description: "A new OTP has been sent to your email.",
        });
        
        // Reset timer and OTP
        setTimeLeft(600);
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
      } else {
        toast({
          title: "Resend Failed",
          description: data.message || "Failed to resend OTP.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Resend Failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 p-4">
      <div className="absolute inset-0 bg-grid-orange-100/[0.03] bg-[size:120px_120px]" />
      
      <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center pb-6 pt-8">
          <div className="flex justify-center mb-6 p-3 bg-gradient-to-r from-orange-100 to-orange-200 rounded-2xl shadow-lg">
            <Mail className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
            Verify Your Email
          </CardTitle>
          <p className="text-gray-600 text-sm">
            We've sent a 6-digit code to<br />
            <span className="font-semibold text-orange-600">{email}</span>
          </p>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OTP Input Fields */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide text-center block">
                Enter Verification Code
              </Label>
              <div className="flex justify-center space-x-2">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="w-12 h-12 text-center text-lg font-bold border-orange-200/50 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 rounded-xl"
                    required
                  />
                ))}
              </div>
            </div>

            {/* Timer */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Timer className="h-4 w-4" />
                <span>Code expires in {formatTime(timeLeft)}</span>
              </div>
              
              {canResend && (
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendOTP}
                  disabled={isResending}
                  className="text-orange-600 hover:text-orange-700 text-sm"
                >
                  {isResending ? "Resending..." : "Resend OTP"}
                </Button>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-14 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:via-orange-700 hover:to-orange-800 font-bold text-white text-lg rounded-2xl shadow-2xl hover:shadow-orange-500/25 transition-all duration-500 transform hover:scale-[1.02] tracking-wide"
              disabled={isLoading}
            >
              {isLoading ? "Verifying..." : "Verify & Create Account"}
            </Button>

            {/* Back Button */}
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="w-full h-12 text-gray-600 hover:text-gray-800 font-semibold rounded-xl transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign Up
            </Button>
          </form>

          {/* Security Note */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200/50">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Security Notice</p>
                <p>Never share this verification code with anyone. Our team will never ask for your OTP.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
