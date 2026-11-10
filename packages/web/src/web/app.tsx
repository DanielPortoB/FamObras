import { Route, Switch } from "wouter";
import Index from "./pages/index";
import EmployeesPage from "./pages/employees";
import WorksPage from "./pages/works";
import WorkPage from "./pages/work/index";
import WorkReportPage from "./pages/work/report";
import FinancePage from "./pages/finance";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Index} />
        <Route path="/funcionarios" component={EmployeesPage} />
        <Route path="/obras" component={WorksPage} />
        <Route path="/financeiro" component={FinancePage} />
        <Route path="/obras/:id/relatorio" component={WorkReportPage} />
        <Route path="/obras/:id" component={WorkPage} />
        <Route>
          <div className="p-10 text-center text-sm text-muted-foreground">Página não encontrada.</div>
        </Route>
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
