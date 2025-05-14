import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { WalletProvider } from "@/components/walletProvider";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WalletProvider>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </WalletProvider>
  );
}

export default App;
