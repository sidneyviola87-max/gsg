import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ShoppingBag } from "lucide-react";
import { isDisposableEmail } from "@/lib/disposableEmails";
import { getDeviceFingerprint, getDeviceId, getIPAddress } from "@/lib/deviceFingerprint";

type Mode = "login" | "signup" | "forgot" | "otp";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const startCooldown = () => {
    setOtpCooldown(60);
    cooldownRef.current = setInterval(() => {
      setOtpCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const checkDeviceLimit = async (userId: string): Promise<{ allowed: boolean; reason?: string }> => {
    try {
      const fingerprint = await getDeviceFingerprint();
      const deviceId = getDeviceId();
      const ip = await getIPAddress();

      // Check fingerprint count
      const { data: fpData } = await supabase
        .from('device_registrations')
        .select('user_id')
        .eq('device_fingerprint', fingerprint)
        .neq('user_id', userId);

      const uniqueFpUsers = new Set((fpData || []).map((d: any) => d.user_id));
      if (uniqueFpUsers.size >= 2) {
        return { allowed: false, reason: `This device already has ${uniqueFpUsers.size} accounts registered. Maximum 2 accounts per device allowed.` };
      }

      // Check IP count
      if (ip !== 'unknown') {
        const { data: ipData } = await supabase
          .from('device_registrations')
          .select('user_id')
          .eq('ip_address', ip)
          .neq('user_id', userId);

        const uniqueIpUsers = new Set((ipData || []).map((d: any) => d.user_id));
        if (uniqueIpUsers.size >= 2) {
          return { allowed: false, reason: `Too many accounts registered from your network (IP: ${ip}). Maximum 2 accounts per network allowed.` };
        }
      }

      // Register this device
      await supabase.from('device_registrations').upsert({
        user_id: userId,
        device_fingerprint: fingerprint,
        device_id: deviceId,
        ip_address: ip,
      }, { onConflict: 'user_id,device_fingerprint' });

      return { allowed: true };
    } catch (err) {
      console.error('Device check error', err);
      return { allowed: true }; // fail open
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username) return;

    if (isDisposableEmail(email)) {
      toast({ description: "Disposable email addresses are not allowed. Please use a real email.", variant: "destructive" });
      return;
    }

    if (password.length < 8) {
      toast({ description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, full_name: username } },
      });
      if (error) throw error;

      if (data.user) {
        const deviceCheck = await checkDeviceLimit(data.user.id);
        if (!deviceCheck.allowed) {
          await supabase.auth.signOut();
          await supabase.from('profiles').delete().eq('id', data.user.id);
          toast({ description: deviceCheck.reason, variant: "destructive" });
          setLoading(false);
          return;
        }
      }

      toast({ description: "Account created! Check your email to verify." });
      startCooldown();
      setMode("otp");
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ description: "Welcome back!" });
      setLocation("/");
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ description: "Password reset email sent! Check your inbox." });
      startCooldown();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
      if (error) throw error;
      toast({ description: "Email verified! Welcome to Marketplace." });
      setLocation("/");
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCooldown > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      toast({ description: "Verification email resent!" });
      startCooldown();
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-primary text-primary-foreground rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl rotate-3">
              <ShoppingBag size={36} className="-rotate-3" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {mode === "login" && "Welcome Back"}
              {mode === "signup" && "Create Account"}
              {mode === "forgot" && "Reset Password"}
              {mode === "otp" && "Verify Email"}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {mode === "login" && "Sign in to continue to Marketplace"}
              {mode === "signup" && "Join thousands of buyers and sellers"}
              {mode === "forgot" && "We'll send a reset link to your email"}
              {mode === "otp" && `Enter the code sent to ${email}`}
            </p>
          </div>

          {/* Login Form */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="email" placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)} className="bg-card h-12 rounded-xl" required />
              <Input type="password" placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} className="bg-card h-12 rounded-xl" required />
              <button type="button" onClick={() => setMode("forgot")}
                className="text-primary text-sm font-medium hover:underline w-full text-right -mt-2 block">
                Forgot Password?
              </button>
              <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold shadow-md" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
              </Button>
              <Button type="button" variant="outline" className="w-full h-12 rounded-xl text-base"
                onClick={() => setMode("signup")}>
                Don't have an account? Sign Up
              </Button>
            </form>
          )}

          {/* Sign Up Form */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <Input type="text" placeholder="Username" value={username}
                onChange={e => setUsername(e.target.value.replace(/\s/g, '_').toLowerCase())}
                className="bg-card h-12 rounded-xl" required />
              <Input type="email" placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)} className="bg-card h-12 rounded-xl" required />
              <Input type="password" placeholder="Password (min. 8 characters)" value={password}
                onChange={e => setPassword(e.target.value)} className="bg-card h-12 rounded-xl" required minLength={8} />
              <p className="text-xs text-muted-foreground text-center">
                Maximum 2 accounts allowed per device. Disposable emails are not accepted.
              </p>
              <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold shadow-md" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Create Account"}
              </Button>
              <Button type="button" variant="outline" className="w-full h-12 rounded-xl text-base"
                onClick={() => setMode("login")}>
                Already have an account? Sign In
              </Button>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <button type="button" onClick={() => setMode("login")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-2 -mt-4">
                <ArrowLeft size={16} /> Back to Sign In
              </button>
              <Input type="email" placeholder="Your email address" value={email}
                onChange={e => setEmail(e.target.value)} className="bg-card h-12 rounded-xl" required />
              <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold shadow-md"
                disabled={loading || otpCooldown > 0}>
                {loading ? <Loader2 className="animate-spin" /> : otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Send Reset Link"}
              </Button>
            </form>
          )}

          {/* OTP Verification */}
          {mode === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <Input type="text" placeholder="6-digit verification code" value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="bg-card h-12 rounded-xl text-center text-2xl font-bold tracking-widest" required maxLength={6} />
              <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold shadow-md" disabled={loading || otp.length !== 6}>
                {loading ? <Loader2 className="animate-spin" /> : "Verify Email"}
              </Button>
              <Button type="button" variant="outline" className="w-full h-12 rounded-xl text-base"
                disabled={otpCooldown > 0 || loading} onClick={handleResendOtp}>
                {otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : "Resend Code"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Didn't get it? Check spam or{" "}
                <button type="button" className="text-primary hover:underline" onClick={() => setMode("signup")}>
                  try a different email
                </button>
              </p>
            </form>
          )}

          {/* Guest */}
          <div className="mt-10 text-center">
            <button type="button" onClick={() => setLocation("/")}
              className="text-muted-foreground text-sm hover:text-foreground">
              Continue as guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
