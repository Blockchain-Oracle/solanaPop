import { Switch, Route, useRoute } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import CreateToken from "@/pages/create-token";
import CreateEvent from "@/pages/create-event";
import TokenDetail from "@/pages/token-detail";
import EventDetail from "@/pages/event-detail";
import Claim from "@/pages/claim";
import { WalletProvider } from "@/components/walletProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

// Token Detail route matcher
const TokenDetailRoute = () => {
  const [match, params] = useRoute("/token/:id");
  return match ? <TokenDetail params={params} /> : null;
};

// Event Detail route matcher
const EventDetailRoute = () => {
  const [match, params] = useRoute("/event/:id");
  return match ? <EventDetail /> : null;
};

// Claim route matcher
const ClaimRoute = () => {
  const [match, params] = useRoute("/claim/:id");
  return match ? <Claim params={params} /> : null;
};

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/create-token" component={CreateToken} />
      <Route path="/create-event" component={CreateEvent} />
      <Route path="/token/:id">{TokenDetailRoute}</Route>
      <Route path="/event/:id">{EventDetailRoute}</Route>
      <Route path="/claim/:id">{ClaimRoute}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;
