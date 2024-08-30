import { Outlet, Link } from "react-router-dom";

const Layout = () => {
    return (
        <>
            <div className="flex justify-center" style={{ backgroundColor: 'black', color: 'orange' }}>
                <div className="w-1/2 flex justify-between font-bold" style={{ backgroundColor: 'black', color: 'orange' }}>
                    <Link to="/">Home</Link>
                    <Link to="/dev">Dev</Link>
                </div>
            </div>
            <Outlet />
        </>
    )
};

export default Layout;