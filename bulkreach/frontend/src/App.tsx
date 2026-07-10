import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./router";

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
