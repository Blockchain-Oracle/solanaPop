import { Github, Globe, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-12 text-center">
      <div className="flex items-center justify-center gap-6 mb-4">
        <a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white">
          <Globe className="h-5 w-5" />
        </a>
        <a href="https://twitter.com/solana" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white">
          <Twitter className="h-5 w-5" />
        </a>
        <a href="https://github.com/solana-labs" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white">
          <Github className="h-5 w-5" />
        </a>
      </div>
      <p className="text-white/50 text-sm">
        Powered by Solana blockchain · POP Token Platform · {new Date().getFullYear()}
      </p>
    </footer>
  );
}
