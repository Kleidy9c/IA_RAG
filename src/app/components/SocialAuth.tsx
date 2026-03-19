"use client";
import { createBrowserClient } from "@supabase/ssr";
import { Github, Facebook } from "lucide-react";

export function SocialAuth() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const handleSocialLogin = async (provider: "github" | "facebook") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // Asegúrate de configurar esta URL en tu Dashboard de Supabase
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  return (
    <div className="space-y-3 w-full">
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200"></span>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">O continúa con</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleSocialLogin("github")}
          className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm"
        >
          <Github size={20} /> GitHub
        </button>
        <button
          onClick={() => handleSocialLogin("facebook")}
          className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm text-[#1877F2]"
        >
          <Facebook size={20} fill="currentColor" /> Facebook
        </button>
      </div>
    </div>
  );
}
