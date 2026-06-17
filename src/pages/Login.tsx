import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLogin } from '../api/hooks';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { ThreeBackground } from '../components/ThreeBackground';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const loginMutation = useLogin();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await loginMutation.mutateAsync({ email, password });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background p-4">
      <ThreeBackground />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="z-10 w-full max-w-lg"
      >
        <Card className="w-full p-6 sm:p-8 shadow-[0_0_50px_-12px_rgba(139,92,246,0.3)] border-white/10 bg-background/20 backdrop-blur-2xl ring-1 ring-white/5 rounded-3xl">
        <CardHeader className="space-y-3 pb-6">
          <CardTitle className="text-4xl font-extrabold tracking-tight text-center bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center text-lg text-muted-foreground/80 font-medium">
            Enter your credentials to continue
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 bg-background/40 border-white/10 focus-visible:ring-primary/50 text-base rounded-xl transition-all"
              />
            </div>
            <div className="space-y-2">
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 bg-background/40 border-white/10 focus-visible:ring-primary/50 text-base rounded-xl transition-all"
              />
            </div>
            {error && <p className="text-sm text-destructive text-center font-medium bg-destructive/10 py-2 rounded-lg">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col space-y-6 pt-4">
            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-semibold shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 rounded-xl transition-all hover:scale-[1.02] active:scale-95" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:text-primary/80 transition-colors font-semibold tracking-wide">
                Create Account
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
      </motion.div>
    </div>
  );
}
