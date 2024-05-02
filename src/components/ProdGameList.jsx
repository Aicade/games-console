import prodGamesList from "../prodGamesList"
import { Link } from "react-router-dom";

const ProdGameList = () => {
    return (
        <>
            <ul className="flex flex-col">
                {prodGamesList.map((gameName) => {
                    return (
                        <li key={gameName}><Link to={"/" + gameName}>{gameName}</Link></li>)
                })}
            </ul>
        </>
    )
}

export default ProdGameList;