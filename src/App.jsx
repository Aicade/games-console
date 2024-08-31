import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProdGame from "./components/ProdGame";
import ProdGameList from "./components/ProdGameList";
import Layout from "./components/Layout";
import DevGame from "./components/DevGame";

function App() {
  return (
    <>
      <BrowserRouter basename={import.meta.env.VITE_BASE_URL || "/"}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<ProdGameList />} />
            <Route path="/dev" element={<DevGame />} />
            <Route path="/:name" element={<ProdGame />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
