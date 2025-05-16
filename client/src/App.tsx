import { Switch, Route, useRoute } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import CreateToken from "@/pages/create-token";
import CreateEvent from "@/pages/create-event";
import TokenDetail from "@/pages/token-detail";
import TokenEdit from "@/pages/token/[id]/edit";
import EventDetail from "@/pages/event-detail";
import EventEdit from "@/pages/event/[id]/edit";
import TokenClaimPage from "@/pages/token/[id]/claim";
import ShowcasePage from "@/pages/showcase";
import { WalletProvider } from "@/components/walletProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

// Token Detail route component
const TokenDetailRoute = ({ params }: { params: { id: string } }) => {
  return <TokenDetail params={params} />;
};

// Token Edit route component
const TokenEditRoute = ({ params }: { params: { id: string } }) => {
  return <TokenEdit params={params} />;
};

// Event Detail route component
const EventDetailRoute = ({ params }: { params: { id: string } }) => {
  return <EventDetail />;
};

// Claim route component
const TokenClaimRoute = ({ params }: { params: { id: string } }) => {
  return <TokenClaimPage params={params} />;
};

// Event Edit route component
const EventEditRoute = ({ params }: { params: { id: string } }) => {
  return <EventEdit params={params} />;
};

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/showcase" component={ShowcasePage} />
      <Route path="/create-token" component={CreateToken} />
      <Route path="/create-event" component={CreateEvent} />
      <Route path="/token/:id/edit" component={TokenEditRoute} />
      <Route path="/token/:id/claim" component={TokenClaimRoute} />
      <Route path="/token/:id" component={TokenDetailRoute} />
      <Route path="/event/:id/edit" component={EventEditRoute} />
      <Route path="/event/:id" component={EventDetailRoute} />
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
