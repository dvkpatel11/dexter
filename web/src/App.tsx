import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import "./App.css";
import { ChatView } from "./views/ChatView";
import { HealthView } from "./views/HealthView";
import { PortfolioView } from "./views/PortfolioView";
import { SignalsView } from "./views/SignalsView";
import { TradeView } from "./views/TradeView";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="sidebar">
          <div className="sidebar-header">
            <h1>Dexter</h1>
          </div>
          <div className="sidebar-nav">
            <NavLink to="/" end>
              Chat
            </NavLink>
            <NavLink to="/portfolio">Portfolio</NavLink>
            <NavLink to="/signals">Signals</NavLink>
            <NavLink to="/trade">Trade</NavLink>
            <NavLink to="/health">Health</NavLink>
          </div>
        </nav>
        <main className="main-panel">
          <Routes>
            <Route path="/" element={<ChatView />} />
            <Route path="/portfolio" element={<PortfolioView />} />
            <Route path="/trade" element={<TradeView />} />
            <Route path="/signals" element={<SignalsView />} />
            <Route path="/health" element={<HealthView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
