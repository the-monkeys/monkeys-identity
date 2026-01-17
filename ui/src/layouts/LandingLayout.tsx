import { Outlet } from 'react-router-dom';
import Navbar from "@/features/landing/components/LandingNavbar";
import Footer from "@/features/landing/components/Footer";

const LandingLayout = () => {
    return (
        <div className="min-h-screen flex flex-col font-sans bg-bg-main-dark text-white">
            <Navbar />
            <main className="flex-1 flex flex-col">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default LandingLayout;
