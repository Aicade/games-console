import prodGamesList from "../prodGamesList";
import { Link } from "react-router-dom";

const ProdGameList = () => {
    return (
        <>
            <h1 className="font-bold" style={{ backgroundColor: 'black', color: 'orange' }}>TOTAL: {prodGamesList.length}</h1>
            <ul className="flex flex-col" style={{ backgroundColor: 'black', color: 'orange' }}>
                {prodGamesList.map((gameName) => {
                    return (
                        <li key={gameName}><Link to={"/" + gameName} style={{ color: 'orange' }}>{gameName}</Link></li>)
                })}
            </ul>
        </>
    )
}

export default ProdGameList;