import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import "./App.css";
import { ChatView } from "./views/ChatView";
import { HealthView } from "./views/HealthView";
import { PortfolioView } from "./views/PortfolioView";
import { SignalsView } from "./views/SignalsView";
import { TradeView } from "./views/TradeView";
import {
  LayoutDashboard,
  MessageSquare,
  LineChart,
  ArrowLeftRight,
  Activity,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Chat", icon: MessageSquare, end: true },
  { to: "/portfolio", label: "Portfolio", icon: LayoutDashboard },
  { to: "/signals", label: "Signals", icon: LineChart },
  { to: "/trade", label: "Trade", icon: ArrowLeftRight },
  { to: "/health", label: "Health", icon: Activity },
];

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <aside className="hidden md:flex w-[220px] flex-col border-r border-border bg-card">
          <div className="flex items-center gap-2 px-5 py-5 border-b border-border">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              D
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Dexter
            </span>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile top bar */}
          <header className="flex md:hidden items-center h-14 px-4 border-b border-border bg-card/80 backdrop-blur-xl">
            <span className="text-lg font-semibold tracking-tight">Dexter</span>
            <nav className="ml-auto flex gap-1">
              {navItems.map(({ to, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `p-2 rounded-md transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                </NavLink>
              ))}
            </nav>
          </header>

          <div className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<ChatView />} />
              <Route path="/portfolio" element={<PortfolioView />} />
              <Route path="/trade" element={<TradeView />} />
              <Route path="/signals" element={<SignalsView />} />
              <Route path="/health" element={<HealthView />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
